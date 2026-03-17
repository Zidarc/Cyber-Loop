import { supabase } from '../config/supabase';

export type NodeType = 'start' | 'normal' | 'checkpoint' | 'penalty' | 'final';

interface NodeRow {
  id: number;
  label: string;
  node_type: NodeType;
  is_visible: number; // 0 | 1
}

interface NodeProgressRow {
  node_id: number;
  status: 'locked' | 'unlocked' | 'solved';
  unlocked_at: string | null;
  solved_at: string | null;
}

interface GameStateRow {
  participant_id: number;
  total_correct: number;
  total_mistakes: number;
  score: number;
  last_checkpoint_id: number | null;
  current_node_id: number | null;
  current_question_id: number | null;
  last_question_id: number | null;
  penalty_nodes_unlocked: number;
  is_finished: boolean | number;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string | null;
  penalty_counter: number;
}

export interface QuestionRow {
  id: number;
  node_id: number;
  pool_type: 'main' | 'penalty';
  question_type: 'text' | 'image' | 'pdf';
  question_text: string | null;
  file_path: string | null;
  answer: string;
  difficulty: number;
}

export type PublicQuestion = Omit<QuestionRow, 'answer'>;

export type NodeWithStatus = {
  id: number;
  label: string;
  nodeType: NodeType;
  isVisible: boolean;
  status: 'locked' | 'unlocked' | 'solved';
  unlockedAt: string | null;
  solvedAt: string | null;
};

export type PublicGameState = {
  totalCorrect: number;
  totalMistakes: number;
  score: number;
  lastCheckpointId: number | null;
  lastQuestionId: number | null;
  penaltyNodesUnlocked: number;
  isFinished: boolean;
  startedAt: string | null;
  finishedAt: string | null;
};

export type FullGameStateResult = {
  nodes: NodeWithStatus[];
  gameState: PublicGameState;
};

export type SubmitCorrectResult = {
  correct: true;
  nextNodeId: number | null;
  isFinished: boolean;
};

export type SubmitWrongResult = {
  correct: false;
  penaltyNodeUnlocked: number | null;
  sentBackToNodeId: number;
};

export type SubmitResult = SubmitCorrectResult | SubmitWrongResult;

// ─────────────────────────────────────────
// 1. GAME STATE INIT
// ─────────────────────────────────────────
export async function getFullGameState(
  participantId: number
): Promise<FullGameStateResult> {
  const timestamp = new Date().toISOString();

  let { data: gsRow, error: gsErr } = await supabase
    .from('participant_game_state')
    .select('*')
    .eq('participant_id', participantId)
    .maybeSingle();

  if (gsErr) throw new Error('Failed to load game state');

  if (!gsRow) {
    const { data: newGs, error: createErr } = await supabase
      .from('participant_game_state')
      .upsert(
        {
          participant_id: participantId,
          total_correct: 0,
          total_mistakes: 0,
          score: 0,
          last_checkpoint_id: null,
          current_node_id: null,
          current_question_id: null,
          last_question_id: null,
          penalty_nodes_unlocked: 0,
          is_finished: 0,
          started_at: timestamp,
          finished_at: null,
          updated_at: timestamp,
        },
        { onConflict: 'participant_id' }
      )
      .select('*')
      .single();

    if (createErr) throw new Error('Failed to create game state');
    gsRow = newGs;
  }

  const { data: startNodeData } = await supabase
    .from('nodes')
    .select('id')
    .eq('node_type', 'start')
    .maybeSingle();

  const startNodeId = (startNodeData as { id: number } | null)?.id;

  if (startNodeId != null) {
    const { data: startProgress } = await supabase
      .from('participant_node_progress')
      .select('status')
      .eq('participant_id', participantId)
      .eq('node_id', startNodeId)
      .maybeSingle();

    if (!startProgress) {
      await supabase.from('participant_node_progress').insert({
        participant_id: participantId,
        node_id: startNodeId,
        status: 'unlocked',
        unlocked_at: timestamp,
        solved_at: null,
      });
    }
  }

  const { data: nodeRows, error: nodesErr } = await supabase
    .from('nodes')
    .select('id, label, node_type, is_visible');

  if (nodesErr || !nodeRows) throw new Error('Failed to load nodes');

  const { data: progressRows, error: progressErr } = await supabase
    .from('participant_node_progress')
    .select('node_id, status, unlocked_at, solved_at')
    .eq('participant_id', participantId);

  if (progressErr) throw new Error('Failed to load node progress');

  const progressByNode = new Map<number, NodeProgressRow>();
  for (const p of (progressRows || []) as NodeProgressRow[]) {
    progressByNode.set(p.node_id, p);
  }

  const nodes: NodeWithStatus[] = (nodeRows as NodeRow[]).map((n) => {
    const progress = progressByNode.get(n.id);
    const status = progress ? progress.status : ('locked' as const);
    const isPenalty = n.node_type === 'penalty';

    // Penalty nodes: visible only when this participant has unlocked/solved them.
    const isVisible = isPenalty
      ? status === 'unlocked' || status === 'solved'
      : Boolean(n.is_visible);

    return {
      id: n.id,
      label: n.label,
      nodeType: n.node_type,
      isVisible,
      status,
      unlockedAt: progress?.unlocked_at ?? null,
      solvedAt: progress?.solved_at ?? null,
    };
  });

  const gs = gsRow as GameStateRow;

  return {
    nodes,
    gameState: {
      totalCorrect: gs.total_correct,
      totalMistakes: gs.total_mistakes,
      score: gs.score,
      lastCheckpointId: gs.last_checkpoint_id,
      lastQuestionId: gs.last_question_id,
      penaltyNodesUnlocked: gs.penalty_nodes_unlocked,
      isFinished: Boolean(gs.is_finished),
      startedAt: gs.started_at,
      finishedAt: gs.finished_at,
    },
  };
}

// ─────────────────────────────────────────
// 2. GET QUESTION FOR A NODE
// ─────────────────────────────────────────
//
// POOL ELIGIBILITY RULES (applied in this order):
//
//  [A] Currently active assignment — excluded
//      A question already assigned to one of this participant's unlocked nodes
//      cannot be assigned to another node simultaneously.
//      Since assignments are deleted on solve AND on wrong answer, this set
//      only ever contains truly in-progress assignments.
//
//  [B] Immediate-repeat block — excluded for exactly ONE draw
//      last_question_id = the last question seen, correct OR wrong.
//      Updated after EVERY submission (not just correct ones).
//      Prevents the same question from appearing twice in a row.
//      After one fresh question is drawn, the previously blocked question
//      is eligible again.
//
//  [C] Post-checkpoint permanent exclusion
//      Once a checkpoint is passed (lastCheckpointId != null), questions
//      correctly answered at nodes that are STILL solved are permanently
//      excluded from the pool for this participant.
//
//      Source: question_attempts WHERE is_correct = 1, filtered to currently
//      solved node IDs.
//
//      WHY question_attempts and NOT participant_question_assignment:
//      handleCorrectAnswer deletes the assignment row the moment a node is
//      solved. So participant_question_assignment has ZERO rows for solved
//      nodes — joining against it always produces an empty set, meaning the
//      post-checkpoint exclusion never fired in the original code.
//      question_attempts is an append-only audit log; entries are never
//      deleted, so it reliably tracks what was correctly answered where.
//
//  [D] Pre-checkpoint re-entry
//      If lastCheckpointId is null, rule [C] never runs — the entire pool
//      minus [A] and [B] is eligible. When a wrong answer locks pre-checkpoint
//      nodes, those nodes become 'locked' (not 'solved'), so their questions
//      don't appear in solvedNodeIds and naturally re-enter the pool.
//
// ─────────────────────────────────────────
export async function getNextQuestion(
  nodeId: number,
  participantId: number
): Promise<PublicQuestion> {
  // node must be unlocked
  const { data: progressRow } = await supabase
    .from('participant_node_progress')
    .select('status')
    .eq('participant_id', participantId)
    .eq('node_id', nodeId)
    .maybeSingle();

  const nodeStatus = (progressRow as { status: string } | null)?.status;
  if (!nodeStatus || nodeStatus === 'locked') throw new Error('Node is locked');
  if (nodeStatus === 'solved') throw new Error('Node is already solved');

  const { data: existingAssignment } = await supabase
    .from('participant_question_assignment')
    .select('question_id')
    .eq('participant_id', participantId)
    .eq('node_id', nodeId)
    .maybeSingle();

  if (existingAssignment) {
    const qId = (existingAssignment as { question_id: number }).question_id;
    const { data: q } = await supabase
      .from('questions')
      .select('id, node_id, pool_type, question_type, question_text, file_path, difficulty')
      .eq('id', qId)
      .maybeSingle();
    if (!q) throw new Error('Assigned question not found');
    return q as PublicQuestion;
  }

  const { data: nodeData } = await supabase
    .from('nodes')
    .select('node_type')
    .eq('id', nodeId)
    .maybeSingle();

  const nodeType = (nodeData as { node_type: NodeType } | null)?.node_type;
  if (!nodeType) throw new Error('Node not found');

  const isPenalty = nodeType === 'penalty';
  const poolType: 'main' | 'penalty' = isPenalty ? 'penalty' : 'main';

  const { data: gsRow } = await supabase
    .from('participant_game_state')
    .select('last_question_id, last_checkpoint_id')
    .eq('participant_id', participantId)
    .maybeSingle();

  const lastQuestionId =
    (gsRow as { last_question_id: number | null } | null)?.last_question_id;
  const lastCheckpointId =
    (gsRow as { last_checkpoint_id: number | null } | null)?.last_checkpoint_id;

  const { data: poolQuestions } = await supabase
    .from('questions')
    .select('*')
    .eq('pool_type', poolType);

  if (!poolQuestions || poolQuestions.length === 0) {
    throw new Error('Question pool exhausted');
  }

  // ── Rule [A]: currently active assignments ─────────────────────────────────
  const { data: allAssignments } = await supabase
    .from('participant_question_assignment')
    .select('question_id')
    .eq('participant_id', participantId);

  const assignedIds = new Set(
    ((allAssignments || []) as { question_id: number }[]).map((r) => r.question_id)
  );

  // ── Rule [C]: post-checkpoint permanent exclusion ──────────────────────────
  let solvedQuestionIds = new Set<number>();

  if (!isPenalty && lastCheckpointId != null) {
    const { data: solvedNodes } = await supabase
      .from('participant_node_progress')
      .select('node_id')
      .eq('participant_id', participantId)
      .eq('status', 'solved');

    if (solvedNodes && solvedNodes.length > 0) {
      const solvedNodeIds = (solvedNodes as { node_id: number }[]).map((n) => n.node_id);

      const { data: correctAttempts } = await supabase
        .from('question_attempts')
        .select('question_id')
        .eq('participant_id', participantId)
        .eq('is_correct', 1)
        .in('node_id', solvedNodeIds);

      solvedQuestionIds = new Set(
        ((correctAttempts || []) as { question_id: number }[]).map((r) => r.question_id)
      );
    }
  }

  // ── Apply all eligibility rules ────────────────────────────────────────────
  const eligible = (poolQuestions as QuestionRow[]).filter((q) => {
    if (assignedIds.has(q.id)) return false;                                          // [A]
    if (lastQuestionId != null && q.id === lastQuestionId) return false;              // [B]
    if (!isPenalty && lastCheckpointId != null && solvedQuestionIds.has(q.id))        // [C]
      return false;
    return true;
  });

  if (eligible.length === 0) throw new Error('Question pool exhausted');

  const chosen = eligible[Math.floor(Math.random() * eligible.length)];

  await supabase.from('participant_question_assignment').insert({
    participant_id: participantId,
    node_id: nodeId,
    question_id: chosen.id,
  });

  await supabase
    .from('participant_game_state')
    .upsert(
      { participant_id: participantId, current_node_id: nodeId, current_question_id: chosen.id },
      { onConflict: 'participant_id' }
    );

  const { answer: _answer, ...publicQuestion } = chosen;
  return publicQuestion;
}

// ─────────────────────────────────────────
// 3. SUBMIT ANSWER
// ─────────────────────────────────────────
export async function submitAnswer(
  participantId: number,
  questionId: number,
  answer: string
): Promise<SubmitResult> {
  const qId = Number(questionId);
  if (!Number.isInteger(qId) || qId < 1) throw new Error('Invalid question id');

  const { data: question, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .eq('id', qId)
    .maybeSingle();

  if (qErr || !question) throw new Error('Question not found');
  const questionRow = question as QuestionRow;

  const { data: assignmentRow } = await supabase
    .from('participant_question_assignment')
    .select('node_id')
    .eq('participant_id', participantId)
    .eq('question_id', qId)
    .maybeSingle();

  const gameNodeId = (assignmentRow as { node_id: number } | null)?.node_id;
  if (!gameNodeId) throw new Error('Question not assigned to participant');

  const { data: progressRow } = await supabase
    .from('participant_node_progress')
    .select('status')
    .eq('participant_id', participantId)
    .eq('node_id', gameNodeId)
    .maybeSingle();

  const nodeStatus = (progressRow as { status: string } | null)?.status;
  if (nodeStatus !== 'unlocked') throw new Error('Node not unlocked for participant');

  const { data: gsRow, error: gsErr } = await supabase
    .from('participant_game_state')
    .select('*')
    .eq('participant_id', participantId)
    .maybeSingle();

  if (gsErr) throw new Error('Failed to load game state');

  const timestamp = new Date().toISOString();
  const gameState = (gsRow ?? {
    participant_id: participantId,
    total_correct: 0,
    total_mistakes: 0,
    score: 0,
    penalty_counter: 0,
    last_checkpoint_id: null,
    current_node_id: null,
    current_question_id: null,
    last_question_id: null,
    penalty_nodes_unlocked: 0,
    is_finished: 0,
    started_at: timestamp,
    finished_at: null,
    updated_at: timestamp,
  }) as GameStateRow;

  const normalizedSubmitted = String(answer ?? '').trim().toLowerCase();
  const normalizedCorrect = String(questionRow.answer ?? '').trim().toLowerCase();
  const isCorrect = normalizedSubmitted === normalizedCorrect;

  // Append-only attempt log, this is what Rule [C] reads from
  await supabase.from('question_attempts').insert({
    participant_id: participantId,
    question_id: qId,
    node_id: gameNodeId,
    is_correct: isCorrect ? 1 : 0,
    attempted_at: timestamp,
  });

  let result: SubmitResult;
  let updatedState: GameStateRow;

  if (isCorrect) {
    const { state, submitResult } = await handleCorrectAnswer(
      participantId, questionRow, gameState, timestamp, gameNodeId
    );
    updatedState = state;
    result = submitResult;
  } else {
    const { state, submitResult } = await handleWrongAnswer(
      participantId, questionRow, gameState, timestamp, gameNodeId
    );
    updatedState = state;
    result = submitResult;
  }

  const newScore = await computeScore(participantId, updatedState.penalty_counter);

  await supabase
    .from('participant_game_state')
    .upsert(
      {
        participant_id: participantId,
        total_correct: updatedState.total_correct,
        total_mistakes: updatedState.total_mistakes,
        score: newScore,
        last_checkpoint_id: updatedState.last_checkpoint_id,
        current_node_id: updatedState.current_node_id,
        current_question_id: qId,

        // ── Rule [B]: always write the last SEEN question id ────────────────
        last_question_id: qId,

        penalty_nodes_unlocked: updatedState.penalty_nodes_unlocked,
        is_finished: updatedState.is_finished,
        finished_at: updatedState.finished_at,
        updated_at: timestamp,
        penalty_counter: updatedState.penalty_counter,
      },
      { onConflict: 'participant_id' }
    );

  return result;
}

// ─────────────────────────────────────────
// INTERNAL: CORRECT ANSWER HANDLER
// ─────────────────────────────────────────
async function handleCorrectAnswer(
  participantId: number,
  question: QuestionRow,
  gameState: GameStateRow,
  timestamp: string,
  gameNodeId: number
): Promise<{ state: GameStateRow; submitResult: SubmitCorrectResult }> {
  const { data: currentNodeData } = await supabase
    .from('nodes')
    .select('node_type')
    .eq('id', gameNodeId)
    .maybeSingle();

  const currentNodeType = (currentNodeData as { node_type: NodeType } | null)?.node_type;

  await supabase
    .from('participant_node_progress')
    .upsert(
      {
        participant_id: participantId,
        node_id: gameNodeId,
        status: 'solved',
        solved_at: timestamp,
      },
      { onConflict: 'participant_id,node_id' }
    );

  const updated: GameStateRow = {
    ...gameState,
    total_correct: gameState.total_correct + 1,
    last_question_id: question.id,
    current_node_id: gameNodeId,
  };

  if (currentNodeType === 'penalty') {
    updated.penalty_counter = Math.max(0, (gameState.penalty_counter ?? 0) - 1);
  }

  if (currentNodeType === 'start' || currentNodeType === 'checkpoint') {
    updated.last_checkpoint_id = gameNodeId;
  }

  // ── Final node ──────────────────────────────────────────────────────────────
  if (currentNodeType === 'final') {
    updated.is_finished = 1;
    updated.finished_at = timestamp;

    const finalScore = await computeScore(participantId, updated.penalty_counter);

    const { data: participant } = await supabase
      .from('participants')
      .select('team_name')
      .eq('id', participantId)
      .maybeSingle();

    const teamName = (participant as { team_name: string } | null)?.team_name ?? 'Unknown';

    const { count: solvedCount } = await supabase
      .from('participant_node_progress')
      .select('node_id', { count: 'exact', head: true })
      .eq('participant_id', participantId)
      .eq('status', 'solved');

    await supabase.from('leaderboard').upsert(
      {
        participant_id: participantId,
        team_name: teamName,
        score: finalScore,
        total_correct: updated.total_correct,
        total_mistakes: updated.total_mistakes,
        penalty_counter: updated.penalty_counter,
        puzzles_solved: solvedCount ?? 0,
        finished_at: timestamp,
      },
      { onConflict: 'participant_id' }
    );

    await supabase
      .from('participant_question_assignment')
      .delete()
      .eq('participant_id', participantId)
      .eq('node_id', gameNodeId);

    return {
      state: updated,
      submitResult: { correct: true, nextNodeId: null, isFinished: true },
    };
  }


  const { data: edges } = await supabase
    .from('node_edges')
    .select('to_node')
    .eq('from_node', gameNodeId);

  let nextNodeId: number | null = null;

  for (const e of (edges || []) as { to_node: number }[]) {
    const { data: nextNodeData } = await supabase
      .from('nodes')
      .select('id, node_type')
      .eq('id', e.to_node)
      .maybeSingle();

    const nextNode = nextNodeData as { id: number; node_type: NodeType } | null;
    if (!nextNode) continue;
    if (nextNode.node_type === 'penalty') continue;

    nextNodeId = nextNode.id;

    if (nextNode.node_type === 'final') {
      const { data: allProgress } = await supabase
        .from('participant_node_progress')
        .select('node_id, status')
        .eq('participant_id', participantId);

      const progressList = (allProgress || []) as { node_id: number; status: string }[];

      const allSolved = progressList
        .filter((p) => p.node_id !== nextNode.id)
        .every((p) => p.status === 'solved');

      if (allSolved) {
        await supabase
          .from('participant_node_progress')
          .upsert(
            {
              participant_id: participantId,
              node_id: nextNode.id,
              status: 'unlocked',
              unlocked_at: timestamp,
            },
            { onConflict: 'participant_id,node_id' }
          );
      }
    } else {
      await supabase
        .from('participant_node_progress')
        .upsert(
          {
            participant_id: participantId,
            node_id: nextNode.id,
            status: 'unlocked',
            unlocked_at: timestamp,
          },
          { onConflict: 'participant_id,node_id' }
        );
    }
  }

  await supabase
    .from('participant_question_assignment')
    .delete()
    .eq('participant_id', participantId)
    .eq('node_id', gameNodeId);

  return {
    state: updated,
    submitResult: { correct: true, nextNodeId, isFinished: false },
  };
}

// ─────────────────────────────────────────
// INTERNAL: WRONG ANSWER HANDLER
// ─────────────────────────────────────────
async function handleWrongAnswer(
  participantId: number,
  question: QuestionRow,
  gameState: GameStateRow,
  timestamp: string,
  gameNodeId: number
): Promise<{ state: GameStateRow; submitResult: SubmitWrongResult }> {
  const { data: currentNodeData } = await supabase
    .from('nodes')
    .select('node_type')
    .eq('id', gameNodeId)
    .maybeSingle();

  const currentNodeType = (currentNodeData as { node_type: NodeType } | null)?.node_type;

  const updated: GameStateRow = {
    ...gameState,
    total_mistakes: gameState.total_mistakes + 1,
    penalty_counter: (gameState.penalty_counter ?? 0) + 1,
  };

  // ── Penalty node wrong answer ────────────────────────────────────────────────
  if (currentNodeType === 'penalty') {
    await supabase
      .from('participant_question_assignment')
      .delete()
      .eq('participant_id', participantId)
      .eq('node_id', gameNodeId);

    updated.current_node_id = gameNodeId;

    return {
      state: updated,
      submitResult: {
        correct: false,
        penaltyNodeUnlocked: null,
        sentBackToNodeId: gameNodeId,
      },
    };
  }


  // ── Main node wrong answer ──────────────────────────────────────────────────

  // Unlock the next sequential penalty node
  let penaltyNodeUnlocked: number | null = null;

  const { data: allPenaltyNodes } = await supabase
    .from('nodes')
    .select('id')
    .eq('node_type', 'penalty')
    .order('id', { ascending: true });

  if (allPenaltyNodes && allPenaltyNodes.length > 0) {
    const penaltyIds = (allPenaltyNodes as { id: number }[]).map((n) => n.id);

    const { data: existingPenaltyProgress } = await supabase
      .from('participant_node_progress')
      .select('node_id, status')
      .eq('participant_id', participantId)
      .in('node_id', penaltyIds);

    const alreadyActivePenaltyIds = new Set(
      ((existingPenaltyProgress || []) as { node_id: number; status: string }[])
        .filter((p) => p.status === 'unlocked' || p.status === 'solved')
        .map((p) => p.node_id)
    );

    const nextPenalty = (allPenaltyNodes as { id: number }[]).find(
      (n) => !alreadyActivePenaltyIds.has(n.id)
    );

    if (nextPenalty) {
      await supabase
        .from('participant_node_progress')
        .upsert(
          {
            participant_id: participantId,
            node_id: nextPenalty.id,
            status: 'unlocked',
            unlocked_at: timestamp,
          },
          { onConflict: 'participant_id,node_id' }
        );
      updated.penalty_nodes_unlocked = updated.penalty_nodes_unlocked + 1;
      penaltyNodeUnlocked = nextPenalty.id;
    }
  }

  // Determine reset target
  let resetTargetId: number;

  if (currentNodeType === 'start') {
    resetTargetId = gameNodeId;
  } else if (updated.last_checkpoint_id != null) {
    resetTargetId = updated.last_checkpoint_id;
  } else {
    const { data: startNode } = await supabase
      .from('nodes')
      .select('id')
      .eq('node_type', 'start')
      .maybeSingle();
    resetTargetId = (startNode as { id: number } | null)?.id ?? gameNodeId;
  }

  // Build preserved set: active penalty nodes + reset target
  const { data: penaltyNodes } = await supabase
    .from('nodes')
    .select('id')
    .eq('node_type', 'penalty');

  const penaltyNodeIds = ((penaltyNodes || []) as { id: number }[]).map((n) => n.id);

  const { data: activePenalties } = await supabase
    .from('participant_node_progress')
    .select('node_id')
    .eq('participant_id', participantId)
    .in('node_id', penaltyNodeIds)
    .in('status', ['unlocked', 'solved']);


  const preservedIds = new Set(
    ((activePenalties || []) as { node_id: number }[]).map((p) => p.node_id)
  );
  preservedIds.add(resetTargetId);

  const { data: alreadySolved } = await supabase
    .from('participant_node_progress')
    .select('node_id')
    .eq('participant_id', participantId)
    .eq('status', 'solved');

  for (const p of (alreadySolved || []) as { node_id: number }[]) {
    preservedIds.add(p.node_id);
  }

  // Lock everything outside the preserved set
  const { data: allProgress } = await supabase
    .from('participant_node_progress')
    .select('node_id')
    .eq('participant_id', participantId);

  const nodesToLock = ((allProgress || []) as { node_id: number }[])
    .map((p) => p.node_id)
    .filter((id) => !preservedIds.has(id));

  if (nodesToLock.length > 0) {
    await supabase
      .from('participant_node_progress')
      .update({ status: 'locked', solved_at: null })
      .eq('participant_id', participantId)
      .in('node_id', nodesToLock);
  }

  // Re-open reset target
  await supabase
    .from('participant_node_progress')
    .upsert(
      {
        participant_id: participantId,
        node_id: resetTargetId,
        status: 'unlocked',
        solved_at: null,
        unlocked_at: timestamp,
      },
      { onConflict: 'participant_id,node_id' }
    );

  // Delete assignment for reset target (forces fresh question draw)
  await supabase
    .from('participant_question_assignment')
    .delete()
    .eq('participant_id', participantId)
    .eq('node_id', resetTargetId);

  // Delete assignment for the node they got wrong (forces fresh question draw)
  await supabase
    .from('participant_question_assignment')
    .delete()
    .eq('participant_id', participantId)
    .eq('node_id', gameNodeId);

  updated.current_node_id = resetTargetId;

  return {
    state: updated,
    submitResult: {
      correct: false,
      penaltyNodeUnlocked,
      sentBackToNodeId: resetTargetId,
    },
  };
}

// ─────────────────────────────────────────
// 4. SCORE
// ─────────────────────────────────────────
export async function computeScore(
  participantId: number,
  penaltyCounterOverride?: number
): Promise<number> {
  const { data: progressRows } = await supabase
    .from('participant_node_progress')
    .select('node_id, status')
    .eq('participant_id', participantId);

  if (!progressRows || progressRows.length === 0) return 0;

  const nodeIds = (progressRows as { node_id: number; status: string }[]).map(p => p.node_id);

  const { data: nodeRows } = await supabase
    .from('nodes')
    .select('id, node_type')
    .in('id', nodeIds);

  if (!nodeRows) return 0;

  const nodeTypeMap = new Map<number, NodeType>();
  for (const n of nodeRows as { id: number; node_type: NodeType }[]) {
    nodeTypeMap.set(n.id, n.node_type);
  }

  let normalPoints     = 0;
  let checkpointPoints = 0;
  let finalPoints      = 0;

  for (const p of progressRows as { node_id: number; status: string }[]) {
    if (p.status !== 'solved') continue;
    const nodeType = nodeTypeMap.get(p.node_id);
    if (!nodeType) continue;
    if (nodeType === 'normal')                                   normalPoints     += 25;
    else if (nodeType === 'start' || nodeType === 'checkpoint')  checkpointPoints += 30;
    else if (nodeType === 'final')                               finalPoints      += 50;
    // penalty nodes: solving gives +0 pts, just reduces penalty_counter by 1
  }

  let penaltyCounter: number;
  if (penaltyCounterOverride !== undefined) {
    penaltyCounter = penaltyCounterOverride;
  } else {
    const { data: gsRow } = await supabase
      .from('participant_game_state')
      .select('penalty_counter')
      .eq('participant_id', participantId)
      .maybeSingle();
    penaltyCounter = (gsRow as { penalty_counter: number } | null)?.penalty_counter ?? 0;
  }

  const total = normalPoints + checkpointPoints + finalPoints - (penaltyCounter * 3);
  return Math.max(0, total);
}