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
  penaltyCounter: number;
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


// 1. GAME STATE INIT
export async function getFullGameState(
  participantId: number,
): Promise<FullGameStateResult> {
  //1. Load
  let { data: gsRow, error: gsErr } = await supabase
    .from('participant_game_state')
    .select('*')
    .eq('participant_id', participantId)
    .maybeSingle();

  if (gsErr) throw new Error('Failed to load game state');

  if (!gsRow) {
    const timestamp = new Date().toISOString();

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
        { onConflict: 'participant_id' },
      )
      .select('*')
      .single();

    if (createErr) throw new Error('Failed to create game state');
    gsRow = newGs;

    // Seed the start node as 'unlocked' for this participant.
    const { data: startNodeData } = await supabase
      .from('nodes')
      .select('id')
      .eq('node_type', 'start')
      .maybeSingle();

    const startNodeId = (startNodeData as { id: number } | null)?.id;
    if (startNodeId != null) {
      await supabase
        .from('participant_node_progress')
        .upsert(
          {
            participant_id: participantId,
            node_id: startNodeId,
            status: 'unlocked',
            unlocked_at: timestamp,
            solved_at: null,
          },
          { onConflict: 'participant_id,node_id', ignoreDuplicates: true },
        );
    }
  }

  //2. Parallel: all nodes + this participant's progress
  const [nodesResult, progressResult] = await Promise.all([
    supabase.from('nodes').select('id, label, node_type, is_visible'),
    supabase
      .from('participant_node_progress')
      .select('node_id, status, unlocked_at, solved_at')
      .eq('participant_id', participantId),
  ]);

  if (nodesResult.error || !nodesResult.data) throw new Error('Failed to load nodes');
  if (progressResult.error)                    throw new Error('Failed to load node progress');

  //3. Build response
  const progressByNode = new Map<number, NodeProgressRow>();
  for (const p of (progressResult.data || []) as NodeProgressRow[]) {
    progressByNode.set(p.node_id, p);
  }

  const nodes: NodeWithStatus[] = (nodesResult.data as NodeRow[]).map((n) => {
    const progress  = progressByNode.get(n.id);
    const status    = progress ? progress.status : ('locked' as const);
    const isPenalty = n.node_type === 'penalty';

    // Penalty nodes are visible only when this participant has unlocked or solved them.
    const isVisible = isPenalty
      ? status === 'unlocked' || status === 'solved'
      : Boolean(n.is_visible);

    return {
      id:         n.id,
      label:      n.label,
      nodeType:   n.node_type,
      isVisible,
      status,
      unlockedAt: progress?.unlocked_at ?? null,
      solvedAt:   progress?.solved_at   ?? null,
    };
  });

  const gs = gsRow as GameStateRow;

  return {
    nodes,
    gameState: {
      totalCorrect:         gs.total_correct,
      totalMistakes:        gs.total_mistakes,
      score:                gs.score,
      lastCheckpointId:     gs.last_checkpoint_id,
      lastQuestionId:       gs.last_question_id,
      penaltyNodesUnlocked: gs.penalty_nodes_unlocked,
      penaltyCounter:       gs.penalty_counter ?? 0,
      isFinished:           Boolean(gs.is_finished),
      startedAt:            gs.started_at,
      finishedAt:           gs.finished_at,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET QUESTION FOR A NODE
// ─────────────────────────────────────────────────────────────────────────────
//
// POOL ELIGIBILITY RULES:
//
//  [A] Currently active assignment — excluded
//      A question already assigned to one of this participant's unlocked nodes
//      cannot be assigned to another node simultaneously.
//
//  [B] Immediate-repeat block — excluded for exactly ONE draw
//      last_question_id = the last question seen, correct OR wrong.
//      Prevents the same question from appearing twice in a row.
//
//  [C] Post-checkpoint permanent exclusion
//      Once a checkpoint is passed (lastCheckpointId != null), questions
//      correctly answered at nodes that are STILL solved are permanently
//      excluded from the pool for this participant.
//      Source: question_attempts WHERE is_correct = 1, filtered to currently
//      solved node IDs.
//
//  [D] Pre-checkpoint re-entry
//      If lastCheckpointId is null, rule [C] never runs.
export async function getNextQuestion(
  nodeId: number,
  participantId: number,
): Promise<PublicQuestion> {
  //Node must be unlocked
  const { data: progressRow } = await supabase
    .from('participant_node_progress')
    .select('status')
    .eq('participant_id', participantId)
    .eq('node_id', nodeId)
    .maybeSingle();

  const nodeStatus = (progressRow as { status: string } | null)?.status;
  if (!nodeStatus || nodeStatus === 'locked')  throw new Error('Node is locked');
  if (nodeStatus === 'solved')                 throw new Error('Node is already solved');

  //Return existing assignment if present
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

  //Determine pool type
  const { data: nodeData } = await supabase
    .from('nodes')
    .select('node_type')
    .eq('id', nodeId)
    .maybeSingle();

  const nodeType  = (nodeData as { node_type: NodeType } | null)?.node_type;
  if (!nodeType) throw new Error('Node not found');

  const isPenalty               = nodeType === 'penalty';
  const poolType: 'main' | 'penalty' = isPenalty ? 'penalty' : 'main';

  const { data: gsRow } = await supabase
    .from('participant_game_state')
    .select('last_question_id, last_checkpoint_id')
    .eq('participant_id', participantId)
    .maybeSingle();

  const lastQuestionId  = (gsRow as { last_question_id:  number | null } | null)?.last_question_id;
  const lastCheckpointId = (gsRow as { last_checkpoint_id: number | null } | null)?.last_checkpoint_id;

  //Rule [A]: currently active assignments (IDs to exclude)
  const { data: allAssignments } = await supabase
    .from('participant_question_assignment')
    .select('question_id')
    .eq('participant_id', participantId);

  const assignedIds = new Set(
    ((allAssignments || []) as { question_id: number }[]).map((r) => r.question_id),
  );

  //Rule [C]: post-checkpoint permanently excluded question IDs
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
        .select('question_id, node_id, attempted_at')
        .eq('participant_id', participantId)
        .eq('is_correct', 1)
        .in('node_id', solvedNodeIds)
        .order('attempted_at', { ascending: false });  // newest first

      // Keep only the most recent correct answer per node.
      const latestPerNode = new Map<number, number>(); // node_id → question_id
      for (const attempt of (correctAttempts || []) as {
        question_id: number;
        node_id:     number;
        attempted_at: string;
      }[]) {
        if (!latestPerNode.has(attempt.node_id)) {
          latestPerNode.set(attempt.node_id, attempt.question_id);
        }
      }

      solvedQuestionIds = new Set(latestPerNode.values());
    }
  }

  // Rule [C] exclusion is applied as a second NOT IN if the set is non-empty.
  const abExcluded: number[] = [...assignedIds];
  if (lastQuestionId != null) abExcluded.push(lastQuestionId);
  let query = supabase
    .from('questions')
    .select('id, node_id, pool_type, question_type, question_text, file_path, difficulty')
    .eq('pool_type', poolType);

  if (abExcluded.length > 0) {
    query = query.not('id', 'in', `(${abExcluded.join(',')})`) as typeof query;
  }
  if (solvedQuestionIds.size > 0) {
    query = query.not('id', 'in', `(${[...solvedQuestionIds].join(',')})`) as typeof query;
  }

  const { data: eligible } = await query;

  if (!eligible || eligible.length === 0) throw new Error('Question pool exhausted');

  const chosen = (eligible as PublicQuestion[])[Math.floor(Math.random() * eligible.length)];

  const { error: insertErr } = await supabase
    .from('participant_question_assignment')
    .insert({
      participant_id: participantId,
      node_id:        nodeId,
      question_id:    chosen.id,
    });

  let finalQuestion = chosen;

  if (insertErr) {
    const { data: existing } = await supabase
      .from('participant_question_assignment')
      .select('question_id')
      .eq('participant_id', participantId)
      .eq('node_id', nodeId)
      .maybeSingle();

    if (!existing) throw new Error('Assignment conflict and re-fetch failed');

    const existingQId = (existing as { question_id: number }).question_id;
    const { data: existingQ } = await supabase
      .from('questions')
      .select('id, node_id, pool_type, question_type, question_text, file_path, difficulty')
      .eq('id', existingQId)
      .maybeSingle();

    if (!existingQ) throw new Error('Conflicting assignment question not found');
    finalQuestion = existingQ as PublicQuestion;
  }

  supabase
    .from('participant_game_state')
    .upsert(
      {
        participant_id:      participantId,
        current_node_id:     nodeId,
        current_question_id: finalQuestion.id,
      },
      { onConflict: 'participant_id' },
    )
    .then(({ error }) => {
      if (error) console.error('getNextQuestion: game state update failed:', error.message);
    });

  return finalQuestion;
}

// 3. SUBMIT ANSWER
export async function submitAnswer(
  participantId: number,
  questionId: number,
  answer: string,
): Promise<SubmitResult> {
  const qId = Number(questionId);
  if (!Number.isInteger(qId) || qId < 1) throw new Error('Invalid question id');

  //Parallel: fetch question + assignment
  const [questionResult, assignmentResult] = await Promise.all([
    supabase
      .from('questions')
      .select('id, node_id, pool_type, question_type, question_text, file_path, answer, difficulty')
      .eq('id', qId)
      .maybeSingle(),
    supabase
      .from('participant_question_assignment')
      .select('node_id')
      .eq('participant_id', participantId)
      .eq('question_id', qId)
      .maybeSingle(),
  ]);

  if (questionResult.error || !questionResult.data) throw new Error('Question not found');
  const questionRow = questionResult.data as QuestionRow;

  const gameNodeId = (assignmentResult.data as { node_id: number } | null)?.node_id;
  if (!gameNodeId) throw new Error('Question not assigned to participant');

  const [progressResult, gsResult, nodeTypeResult] = await Promise.all([
    supabase
      .from('participant_node_progress')
      .select('status')
      .eq('participant_id', participantId)
      .eq('node_id', gameNodeId)
      .maybeSingle(),
    supabase
      .from('participant_game_state')
      .select('*')
      .eq('participant_id', participantId)
      .maybeSingle(),
    supabase
      .from('nodes')
      .select('node_type')
      .eq('id', gameNodeId)
      .maybeSingle(),
  ]);

  if (progressResult.error) throw new Error('Failed to load node progress');
  if (gsResult.error)        throw new Error('Failed to load game state');

  const nodeStatus = (progressResult.data as { status: string } | null)?.status;
  if (nodeStatus !== 'unlocked') throw new Error('Node not unlocked for participant');

  const currentNodeType = (nodeTypeResult.data as { node_type: NodeType } | null)?.node_type;
  if (!currentNodeType) throw new Error('Node not found');

  const timestamp = new Date().toISOString();
  const gameState = (gsResult.data ?? {
    participant_id:         participantId,
    total_correct:          0,
    total_mistakes:         0,
    score:                  0,
    penalty_counter:        0,
    last_checkpoint_id:     null,
    current_node_id:        null,
    current_question_id:    null,
    last_question_id:       null,
    penalty_nodes_unlocked: 0,
    is_finished:            0,
    started_at:             timestamp,
    finished_at:            null,
    updated_at:             timestamp,
  }) as GameStateRow;

  //Compare answer
  const normalizedSubmitted = String(answer ?? '').trim().toLowerCase();
  const normalizedCorrect   = String(questionRow.answer ?? '').trim().toLowerCase();
  const isCorrect           = normalizedSubmitted === normalizedCorrect;

  if (isCorrect) {
    return handleCorrectAnswer(
      participantId, questionRow, gameState, timestamp, gameNodeId, currentNodeType,
    );
  } else {
    return handleWrongAnswer(
      participantId, questionRow, gameState, timestamp, gameNodeId, currentNodeType,
    );
  }
}

// INTERNAL: CORRECT ANSWER HANDLER
// Reads all the information the RPC needs, computes in-memory state changes,
// then makes ONE atomic call to finalize_correct_answer.
async function handleCorrectAnswer(
  participantId: number,
  question: QuestionRow,
  gameState: GameStateRow,
  timestamp: string,
  gameNodeId: number,
  currentNodeType: NodeType,
): Promise<SubmitCorrectResult> {
  //Build in-memory state (mirrors what the RPC will persist)
  const updated: GameStateRow = {
    ...gameState,
    total_correct:    gameState.total_correct + 1,
    last_question_id: question.id,
    current_node_id:  gameNodeId,
  };

  if (currentNodeType === 'penalty') {
    updated.penalty_counter = Math.max(0, (gameState.penalty_counter ?? 0) - 1);
  }
  if (currentNodeType === 'start' || currentNodeType === 'checkpoint') {
    updated.last_checkpoint_id = gameNodeId;
  }

  //Final node: mark finished, write leaderboard snapshot
  if (currentNodeType === 'final') {
    updated.is_finished = 1;
    updated.finished_at = timestamp;

    const { data: participant } = await supabase
      .from('participants')
      .select('team_name')
      .eq('id', participantId)
      .maybeSingle();

    const teamName = (participant as { team_name: string } | null)?.team_name ?? 'Unknown';

    const { error: rpcErr } = await supabase.rpc('finalize_correct_answer', {
      p_participant_id:        participantId,
      p_node_id:               gameNodeId,
      p_question_id:           question.id,
      p_node_type:             currentNodeType,
      p_ts:                    timestamp,
      p_total_correct:         updated.total_correct,
      p_total_mistakes:        updated.total_mistakes,
      p_last_checkpoint_id:    updated.last_checkpoint_id ?? null,
      p_penalty_counter:       updated.penalty_counter,
      p_penalty_nodes_unlocked: updated.penalty_nodes_unlocked,
      p_is_finished:           1,
      p_finished_at:           timestamp,
      p_unlock_node_id:        null,
      p_leaderboard_team_name: teamName,
      p_last_question_id:      question.id,
    });

    if (rpcErr) throw new Error(`finalize_correct_answer (final) failed: ${rpcErr.message}`);
    return { correct: true, nextNodeId: null, isFinished: true };
  }

  //Non-final node: determine which node to unlock next
  let nextNodeId:   number | null = null;
  let unlockNodeId: number | null = null;

  //Helper: check whether Final should be unlocked right now
  // Returns the Final node's id if it should be unlocked, null otherwise.
  async function checkFinalUnlock(beingSolvedNow: number): Promise<number | null> {
    if ((updated.penalty_counter ?? 0) !== 0) return null;

    const { data: finalNodeData } = await supabase
      .from('nodes')
      .select('id')
      .eq('node_type', 'final')
      .maybeSingle();

    const finalNodeId = (finalNodeData as { id: number } | null)?.id ?? null;
    if (finalNodeId === null) return null;

    // Fetch direct predecessors of Final from the edge table
    const { data: incomingEdges } = await supabase
      .from('node_edges')
      .select('from_node')
      .eq('to_node', finalNodeId);

    const predecessorIds = ((incomingEdges || []) as { from_node: number }[]).map(
      (e) => e.from_node,
    );

    if (predecessorIds.length === 0) return null;

    // Check every predecessor is solved (or is the node being solved right now)
    const { data: predProgress } = await supabase
      .from('participant_node_progress')
      .select('node_id, status')
      .eq('participant_id', participantId)
      .in('node_id', predecessorIds);

    const progressMap = new Map(
      ((predProgress || []) as { node_id: number; status: string }[]).map(
        (p) => [p.node_id, p.status],
      ),
    );

    const allPredecessorsSolved = predecessorIds.every(
      (id) => progressMap.get(id) === 'solved' || id === beingSolvedNow,
    );

    return allPredecessorsSolved ? finalNodeId : null;
  }

  if (currentNodeType === 'penalty') {
    // Penalty nodes have no edges — the only thing they can trigger is the
    // Final unlock when penalty_counter drops to 0.
    const finalId = await checkFinalUnlock(gameNodeId);
    if (finalId !== null) {
      nextNodeId   = finalId;
      unlockNodeId = finalId;
    }
  } else {
    const { data: edges } = await supabase
      .from('node_edges')
      .select('to_node')
      .eq('from_node', gameNodeId);

    const edgeTargetIds = ((edges || []) as { to_node: number }[]).map((e) => e.to_node);

    if (edgeTargetIds.length > 0) {
      const { data: nextNodes } = await supabase
        .from('nodes')
        .select('id, node_type')
        .in('id', edgeTargetIds);

      for (const nextNode of (nextNodes || []) as { id: number; node_type: NodeType }[]) {
        if (nextNode.node_type === 'penalty') continue;

        nextNodeId = nextNode.id;

        if (nextNode.node_type === 'final') {
          const finalId = await checkFinalUnlock(gameNodeId);
          if (finalId !== null) {
            unlockNodeId = finalId;
          }
        } else {
          unlockNodeId = nextNode.id;
        }
      }
    }
  }

  const { error: rpcErr } = await supabase.rpc('finalize_correct_answer', {
    p_participant_id:         participantId,
    p_node_id:                gameNodeId,
    p_question_id:            question.id,
    p_node_type:              currentNodeType,
    p_ts:                     timestamp,
    p_total_correct:          updated.total_correct,
    p_total_mistakes:         updated.total_mistakes,
    p_last_checkpoint_id:     updated.last_checkpoint_id ?? null,
    p_penalty_counter:        updated.penalty_counter,
    p_penalty_nodes_unlocked: updated.penalty_nodes_unlocked,
    p_is_finished:            0,
    p_finished_at:            null,
    p_unlock_node_id:         unlockNodeId,
    p_leaderboard_team_name:  null,
    p_last_question_id:       question.id,
  });

  if (rpcErr) throw new Error(`finalize_correct_answer failed: ${rpcErr.message}`);
  return { correct: true, nextNodeId, isFinished: false };
}


async function handleWrongAnswer(
  participantId: number,
  question: QuestionRow,
  gameState: GameStateRow,
  timestamp: string,
  gameNodeId: number,
  currentNodeType: NodeType,
): Promise<SubmitWrongResult> {
  const totalMistakesUpdated = gameState.total_mistakes + 1;

  // Penalty node wrong answer — simple path
  // Stays on the penalty node. penalty_counter does NOT increment on penalty
  // node mistakes — only main-node mistakes create penalty debt.
  if (currentNodeType === 'penalty') {
    const { error: rpcErr } = await supabase.rpc('finalize_wrong_answer', {
      p_participant_id:         participantId,
      p_node_id:                gameNodeId,
      p_question_id:            question.id,
      p_ts:                     timestamp,
      p_penalty_node_to_unlock: null,
      p_reset_target_id:        gameNodeId,
      p_nodes_to_lock:          [],
      p_total_correct:          gameState.total_correct,
      p_total_mistakes:         totalMistakesUpdated,
      p_last_checkpoint_id:     gameState.last_checkpoint_id ?? null,
      p_penalty_counter:        gameState.penalty_counter ?? 0,
      p_penalty_nodes_unlocked: gameState.penalty_nodes_unlocked,
      p_current_node_id:        gameNodeId,
    });

    if (rpcErr) throw new Error(`finalize_wrong_answer (penalty) failed: ${rpcErr.message}`);
    return { correct: false, penaltyNodeUnlocked: null, sentBackToNodeId: gameNodeId };
  }

  //Main node wrong answer
  const { data: allPenaltyNodes } = await supabase
    .from('nodes')
    .select('id')
    .eq('node_type', 'penalty')
    .order('id', { ascending: true });
  const penaltyIds = ((allPenaltyNodes || []) as { id: number }[]).map((n) => n.id);

  let penaltyNodeUnlocked: number | null = null;
  let penaltyNodesUnlockedUpdated = gameState.penalty_nodes_unlocked;

  if (penaltyIds.length > 0) {
    const { data: existingPenaltyProgress } = await supabase
      .from('participant_node_progress')
      .select('node_id, status')
      .eq('participant_id', participantId)
      .in('node_id', penaltyIds);

    // Only treat currently UNLOCKED (not yet solved) penalty nodes as "active".
    // Solved penalty nodes have already discharged their debt and their slot is
    // considered free — but since solving them already decremented the counter,
    // we don't re-unlock them. We just don't count them as blocking a new slot.
    const currentlyUnlockedPenaltyIds = new Set(
      ((existingPenaltyProgress || []) as { node_id: number; status: string }[])
        .filter((p) => p.status === 'unlocked')
        .map((p) => p.node_id),
    );

    const nextPenalty = ((allPenaltyNodes || []) as { id: number }[]).find(
      (n) => !currentlyUnlockedPenaltyIds.has(n.id),
    );

    if (nextPenalty) {
      penaltyNodeUnlocked       = nextPenalty.id;
      penaltyNodesUnlockedUpdated += 1;
    }
  }

  const penaltyCounterUpdated = penaltyNodeUnlocked !== null
    ? (gameState.penalty_counter ?? 0) + 1
    : (gameState.penalty_counter ?? 0);

  //Determine reset target
  let resetTargetId: number;

  if (currentNodeType === 'start') {
    resetTargetId = gameNodeId;
  } else if (gameState.last_checkpoint_id != null) {
    resetTargetId = gameState.last_checkpoint_id;
  } else {
    const { data: startNode } = await supabase
      .from('nodes')
      .select('id')
      .eq('node_type', 'start')
      .maybeSingle();
    resetTargetId = (startNode as { id: number } | null)?.id ?? gameNodeId;
  }

  //Build preserved set and compute nodes to lock
  //  Preserved set rules:
  //   1. The reset target itself.
  //   2. All graph ancestors of the reset target (BFS on reversed edges).
  //   3. Active (unlocked or solved) penalty nodes — always kept regardless
  //      of graph position because they live off the main path.
  //
  //  Everything else in the participant's progress rows gets locked.

  // Fetch all edges and participant progress in parallel
  const [edgesResult, progressResult2] = await Promise.all([
    supabase.from('node_edges').select('from_node, to_node'),
    supabase
      .from('participant_node_progress')
      .select('node_id, status')
      .eq('participant_id', participantId),
  ]);

  const progressRows = (progressResult2.data || []) as {
    node_id: number;
    status:  string;
  }[];

  // Build reverse adjacency map: to_node → [from_nodes]
  const reverseAdj = new Map<number, number[]>();
  for (const edge of (edgesResult.data || []) as { from_node: number; to_node: number }[]) {
    if (!reverseAdj.has(edge.to_node)) reverseAdj.set(edge.to_node, []);
    reverseAdj.get(edge.to_node)!.push(edge.from_node);
  }

  // BFS backwards from resetTargetId — collects the reset target + all ancestors
  const ancestorIds = new Set<number>();
  const queue: number[] = [resetTargetId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (ancestorIds.has(current)) continue;
    ancestorIds.add(current);
    for (const parent of (reverseAdj.get(current) || [])) {
      queue.push(parent);
    }
  }

  const penaltyIdSet = new Set(penaltyIds);

  // Build preserved set: ancestors + active penalty nodes
  const preservedIds = new Set<number>(ancestorIds);

  for (const p of progressRows) {
    if (penaltyIdSet.has(p.node_id) && (p.status === 'unlocked' || p.status === 'solved')) {
      preservedIds.add(p.node_id);
    }
  }

  const nodesToLock = progressRows
    .map((p) => p.node_id)
    .filter((id) => !preservedIds.has(id));

  //Single atomic RPC write
  const { error: rpcErr } = await supabase.rpc('finalize_wrong_answer', {
    p_participant_id:         participantId,
    p_node_id:                gameNodeId,
    p_question_id:            question.id,
    p_ts:                     timestamp,
    p_penalty_node_to_unlock: penaltyNodeUnlocked,
    p_reset_target_id:        resetTargetId,
    p_nodes_to_lock:          nodesToLock,
    p_total_correct:          gameState.total_correct,
    p_total_mistakes:         totalMistakesUpdated,
    p_last_checkpoint_id:     gameState.last_checkpoint_id ?? null,
    p_penalty_counter:        penaltyCounterUpdated,
    p_penalty_nodes_unlocked: penaltyNodesUnlockedUpdated,
    p_current_node_id:        resetTargetId,
  });

  if (rpcErr) throw new Error(`finalize_wrong_answer failed: ${rpcErr.message}`);

  return {
    correct:             false,
    penaltyNodeUnlocked,
    sentBackToNodeId:    resetTargetId,
  };
}

// 4. SCORE  (standalone utility — not used on the submit path)
export async function computeScore(
  participantId: number,
  penaltyCounterOverride?: number,
): Promise<number> {
  const { data: progressRows } = await supabase
    .from('participant_node_progress')
    .select('node_id, status')
    .eq('participant_id', participantId);

  if (!progressRows || progressRows.length === 0) return 0;

  const nodeIds = (progressRows as { node_id: number; status: string }[]).map((p) => p.node_id);

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
    // penalty nodes: solving gives +0 pts, just reduces penalty_counter
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

  const total = normalPoints + checkpointPoints + finalPoints - penaltyCounter * 3;
  return Math.max(0, total);
}