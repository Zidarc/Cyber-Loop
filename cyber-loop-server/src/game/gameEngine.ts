import { supabase } from '../config/supabase';

export type NodeType = 'start' | 'normal' | 'checkpoint' | 'penalty' | 'final';

interface NodeRow {
  id: number;
  label: string;
  node_type: NodeType;
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

interface QuestionAttemptRow {
  question_id: number;
  node_id: number;
  is_correct: boolean | number;
  attempted_at: string;
}

interface NodeConfig {
  startNodeId: number;
  finalNodeId: number;
  checkpointNodeIds: number[];
  penaltyNodeIds: number[];
  penaltyNodeCount: number;
}

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function parseIntListEnv(name: string, fallback: number[]): number[] {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parts = raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const ids = parts
    .map((p) => Number(p))
    .filter((n) => Number.isInteger(n) && n > 0);
  return ids.length ? ids : fallback;
}

function buildNodeConfig(): NodeConfig {
  const startNodeId = parseIntEnv('GAME_START_NODE_ID', 1);
  const finalNodeId = parseIntEnv('GAME_FINAL_NODE_ID', 7);
  const checkpointNodeIds = parseIntListEnv('GAME_CHECKPOINT_NODE_IDS', [1, 4]);
  const penaltyNodeCount = parseIntEnv('GAME_PENALTY_NODE_COUNT', 5);

  const penaltyNodeIds = parseIntListEnv('GAME_PENALTY_NODE_IDS', []);

  return {
    startNodeId,
    finalNodeId,
    checkpointNodeIds,
    penaltyNodeIds,
    penaltyNodeCount,
  };
}

const nodeConfig: NodeConfig = buildNodeConfig();

export async function getFullGameState(
  participantId: number
): Promise<{
  nodes: Array<{
    id: number;
    label: string;
    nodeType: NodeType;
    status: NodeProgressRow['status'];
    unlockedAt: string | null;
    solvedAt: string | null;
  }>;
  gameState: {
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
}> {
  const { data: gameStateRow, error: gsError } = await supabase
    .from('participant_game_state')
    .select('*')
    .eq('participant_id', participantId)
    .maybeSingle();

  if (gsError) {
    throw new Error('Failed to load game state');
  }

  const { data: nodeRows, error: nodesError } = await supabase
    .from('nodes')
    .select('id, label, node_type');

  if (nodesError || !nodeRows) {
    throw new Error('Failed to load nodes');
  }

  const { data: progressRows, error: progressError } = await supabase
    .from('participant_node_progress')
    .select('node_id, status, unlocked_at, solved_at')
    .eq('participant_id', participantId);

  if (progressError || !progressRows) {
    throw new Error('Failed to load node progress');
  }

  const progressByNode = new Map<number, NodeProgressRow>();
  for (const p of progressRows as NodeProgressRow[]) {
    progressByNode.set(p.node_id, p);
  }

  const nodes = (nodeRows as NodeRow[]).map((n) => {
    const progress = progressByNode.get(n.id);
    const status = progress ? progress.status : ('locked' as const);
    return {
      id: n.id,
      label: n.label,
      nodeType: n.node_type,
      status,
      unlockedAt: progress ? progress.unlocked_at : null,
      solvedAt: progress ? progress.solved_at : null,
    };
  });

  const gs = (gameStateRow || {
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
    started_at: null,
    finished_at: null,
    updated_at: null,
  }) as GameStateRow;

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

export async function getNextQuestion(
  nodeId: number,
  participantId: number
): Promise<QuestionRow | null> {
  const poolType = await getPoolTypeForNode(nodeId);
  if (!poolType) return null;

  const { data: existingAssignment, error: assignErr } = await supabase
    .from('participant_question_assignment')
    .select('question_id')
    .eq('participant_id', participantId)
    .eq('node_id', nodeId)
    .maybeSingle();

  if (assignErr) throw new Error('Failed to load assignment');

  if (existingAssignment) {
    const qId = (existingAssignment as { question_id: number }).question_id;
    const { data: question, error: qErr } = await supabase
      .from('questions')
      .select('*')
      .eq('id', qId)
      .maybeSingle();
    if (qErr || !question) return null;
    return question as QuestionRow;
  }

  const { data: poolQuestions, error: qError } = await supabase
    .from('questions')
    .select('*')
    .eq('pool_type', poolType);

  if (qError || !poolQuestions || poolQuestions.length === 0) return null;

  const { data: assignments, error: aErr } = await supabase
    .from('participant_question_assignment')
    .select('question_id')
    .eq('participant_id', participantId)
    .in('question_id', (poolQuestions as QuestionRow[]).map((q) => q.id));

  if (aErr) throw new Error('Failed to load assignments');

  const assignedIds = new Set(
    ((assignments || []) as { question_id: number }[]).map((r) => r.question_id)
  );
  const available = (poolQuestions as QuestionRow[]).filter((q) => !assignedIds.has(q.id));
  if (available.length === 0) return null;

  const chosen = available[Math.floor(Math.random() * available.length)];

  await supabase.from('participant_question_assignment').insert({
    participant_id: participantId,
    node_id: nodeId,
    question_id: chosen.id,
  });

  await supabase
    .from('participant_game_state')
    .upsert(
      { participant_id: participantId, last_question_id: chosen.id },
      { onConflict: 'participant_id' }
    );

  return chosen;
}

export async function submitAnswer(
  participantId: number,
  questionId: number,
  answer: string
): Promise<unknown> {
  const qId = Number(questionId);
  if (!Number.isInteger(qId) || qId < 1) {
    throw new Error('Invalid question id');
  }

  const { data: question, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .eq('id', qId)
    .maybeSingle();

  if (qErr || !question) {
    throw new Error('Question not found');
  }

  const questionRow = question as QuestionRow;

  const { data: assignmentRow } = await supabase
    .from('participant_question_assignment')
    .select('node_id')
    .eq('participant_id', participantId)
    .eq('question_id', qId)
    .maybeSingle();

  const gameNodeId = (assignmentRow as { node_id: number } | null)?.node_id ?? questionRow.node_id;

  const { data: progressRow, error: progErr } = await supabase
    .from('participant_node_progress')
    .select('status')
    .eq('participant_id', participantId)
    .eq('node_id', gameNodeId)
    .maybeSingle();

  if (progErr || !progressRow) {
    throw new Error('Node not unlocked for participant');
  }

  const status = (progressRow as { status: string }).status;
  if (status !== 'unlocked' && status !== 'solved') {
    throw new Error('Node not unlocked for participant');
  }

  const { data: gsRow, error: gsErr } = await supabase
    .from('participant_game_state')
    .select('*')
    .eq('participant_id', participantId)
    .maybeSingle();

  if (gsErr) {
    throw new Error('Failed to load game state');
  }

  const gameState = (gsRow || {
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
    started_at: new Date().toISOString(),
    finished_at: null,
    updated_at: new Date().toISOString(),
  }) as GameStateRow;

  const timestamp = new Date().toISOString();
  const normalizedAnswer = String(answer ?? '').trim().toLowerCase();
  const correctAnswer = String(questionRow.answer ?? '').trim().toLowerCase();
  const isCorrect = normalizedAnswer === correctAnswer;

  await supabase.from('question_attempts').insert({
    participant_id: participantId,
    question_id: qId,
    node_id: gameNodeId,
    is_correct: isCorrect ? 1 : 0,
    attempted_at: timestamp,
  });

  const updated = isCorrect
    ? await handleCorrectAnswer(participantId, questionRow, gameState, timestamp, gameNodeId)
    : await handleWrongAnswer(participantId, questionRow, gameState, timestamp, gameNodeId);

  const { error: upsertErr } = await supabase
    .from('participant_game_state')
    .upsert(
      {
        participant_id: participantId,
        total_correct: updated.total_correct,
        total_mistakes: updated.total_mistakes,
        score: updated.score,
        last_checkpoint_id: updated.last_checkpoint_id,
        current_node_id: gameNodeId,
        current_question_id: qId,
        last_question_id: updated.last_question_id,
        penalty_nodes_unlocked: updated.penalty_nodes_unlocked,
        is_finished: updated.is_finished,
        finished_at: updated.finished_at,
        updated_at: timestamp,
      },
      { onConflict: 'participant_id' }
    );

  if (upsertErr) {
    throw new Error(`Failed to update game state: ${upsertErr.message}`);
  }

  return getFullGameState(participantId);
}

async function handleCorrectAnswer(
  participantId: number,
  question: QuestionRow,
  gameState: GameStateRow,
  timestamp: string,
  gameNodeId: number
): Promise<GameStateRow> {
  await supabase
    .from('participant_node_progress')
    .upsert(
      {
        participant_id: participantId,
        node_id: gameNodeId,
        status: 'solved',
        solved_at: timestamp,
        unlocked_at: gameState.started_at ?? timestamp,
      },
      { onConflict: 'participant_id,node_id' }
    );

  const updated: GameStateRow = {
    ...gameState,
    total_correct: gameState.total_correct + 1,
    last_question_id: question.id,
  };

  const { data: edges } = await supabase
    .from('node_edges')
    .select('to_node')
    .eq('from_node', gameNodeId);

  if (edges && edges.length > 0) {
    for (const e of edges as { to_node: number }[]) {
      await supabase
        .from('participant_node_progress')
        .upsert(
          {
            participant_id: participantId,
            node_id: e.to_node,
            status: 'unlocked',
            unlocked_at: timestamp,
          },
          { onConflict: 'participant_id,node_id' }
        );
    }
  }

  const isCheckpoint =
    nodeConfig.checkpointNodeIds.includes(gameNodeId) ||
    (await isCheckpointNode(gameNodeId));

  if (isCheckpoint) {
    updated.last_checkpoint_id = gameNodeId;
  }

  const threshold = 17 + Math.min(updated.total_mistakes, 7);
  if (updated.total_correct >= threshold) {
    await supabase
      .from('participant_node_progress')
      .upsert(
        {
          participant_id: participantId,
          node_id: nodeConfig.finalNodeId,
          status: 'unlocked',
          unlocked_at: timestamp,
        },
        { onConflict: 'participant_id,node_id' }
      );
  }

  if (gameNodeId === nodeConfig.finalNodeId) {
    updated.is_finished = 1;
    updated.finished_at = timestamp;

    const score = computeScore(updated.total_correct, updated.total_mistakes);
    updated.score = score;

    const { data: participant } = await supabase
      .from('participants')
      .select('team_name')
      .eq('id', participantId)
      .maybeSingle();

    const teamName = (participant as { team_name: string } | null)?.team_name ?? 'Unknown';

    await supabase.from('leaderboard').upsert(
      {
        participant_id: participantId,
        team_name: teamName,
        score,
        total_correct: updated.total_correct,
        total_mistakes: updated.total_mistakes,
        finished_at: timestamp,
      },
      { onConflict: 'participant_id' }
    );
  }

  return updated;
}

async function handleWrongAnswer(
  participantId: number,
  question: QuestionRow,
  gameState: GameStateRow,
  timestamp: string,
  _gameNodeId: number
): Promise<GameStateRow> {
  const updated: GameStateRow = {
    ...gameState,
    total_mistakes: gameState.total_mistakes + 1,
    last_question_id: question.id,
  };

  if (updated.penalty_nodes_unlocked < nodeConfig.penaltyNodeCount) {
    const index = updated.penalty_nodes_unlocked;
    const penaltyNodeId =
      nodeConfig.penaltyNodeIds[index] ?? (await getPenaltyNodeIdByIndex(index));

    if (penaltyNodeId != null) {
      await supabase
        .from('participant_node_progress')
        .upsert(
          {
            participant_id: participantId,
            node_id: penaltyNodeId,
            status: 'unlocked',
            unlocked_at: timestamp,
          },
          { onConflict: 'participant_id,node_id' }
        );

      updated.penalty_nodes_unlocked = updated.penalty_nodes_unlocked + 1;
    }
  }

  const resetNodeId = updated.last_checkpoint_id ?? nodeConfig.startNodeId;

  const { data: resetProgress } = await supabase
    .from('participant_node_progress')
    .select('solved_at')
    .eq('participant_id', participantId)
    .eq('node_id', resetNodeId)
    .maybeSingle();

  const resetSolvedAt = (resetProgress as { solved_at: string | null } | null)?.solved_at;

  const { data: mainNodes } = await supabase
    .from('nodes')
    .select('id, node_type')
    .in('node_type', ['start', 'normal', 'checkpoint', 'final']);

  if (mainNodes && mainNodes.length > 0) {
    const mainIds = (mainNodes as NodeRow[]).map((n) => n.id);

    const { data: progresses } = await supabase
      .from('participant_node_progress')
      .select('node_id, solved_at')
      .eq('participant_id', participantId)
      .in('node_id', mainIds);

    for (const p of (progresses || []) as { node_id: number; solved_at: string | null }[]) {
      if (p.node_id === resetNodeId) continue;

      if (!resetSolvedAt || (p.solved_at && p.solved_at > resetSolvedAt)) {
        await supabase
          .from('participant_node_progress')
          .update({
            status: 'locked',
            solved_at: null,
          })
          .eq('participant_id', participantId)
          .eq('node_id', p.node_id);
      }
    }
  }

  return updated;
}

async function isCheckpointNode(nodeId: number): Promise<boolean> {
  const { data } = await supabase
    .from('nodes')
    .select('node_type')
    .eq('id', nodeId)
    .maybeSingle();

  const nodeType = (data as { node_type: NodeType } | null)?.node_type;
  return nodeType === 'checkpoint';
}

async function getPenaltyNodeIdByIndex(index: number): Promise<number | null> {
  const { data } = await supabase
    .from('nodes')
    .select('id')
    .eq('node_type', 'penalty')
    .order('id', { ascending: true })
    .range(index, index);

  const row = (data as { id: number }[] | null)?.[0];
  return row ? row.id : null;
}

/** Returns which question pool to use for this node: main path (7 questions) or penalty (5 questions). */
async function getPoolTypeForNode(nodeId: number): Promise<'main' | 'penalty' | null> {
  const { data, error } = await supabase
    .from('nodes')
    .select('node_type')
    .eq('id', nodeId)
    .maybeSingle();

  if (error || !data) return null;
  const nodeType = (data as { node_type: NodeType }).node_type;
  return nodeType === 'penalty' ? 'penalty' : 'main';
}

export function computeScore(totalCorrect: number, totalMistakes: number): number {
  const base = totalCorrect * 10;
  const penalty = totalMistakes * 2;
  return Math.max(0, base - penalty);
}
