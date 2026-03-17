import { Router } from 'express';
import { supabase } from '../config/supabase';
const router = Router();


router.get('/', async (_req, res) => {
  try {
    // 1. All participants
    const { data: participants, error: pErr } = await supabase
      .from('participants')
      .select('id, team_name');
    if (pErr || !participants) throw new Error('Failed to fetch participants');
    const participantIds = (participants as { id: number; team_name: string }[]).map(p => p.id);
    if (participantIds.length === 0) {
      res.json([]);
      return;
    }

    // 2. Game states (score, mistakes, penalty_counter)
    const { data: gameStates, error: gsErr } = await supabase
      .from('participant_game_state')
      .select('participant_id, score, total_correct, total_mistakes, penalty_counter, is_finished, finished_at')
      .in('participant_id', participantIds);
    if (gsErr) throw new Error('Failed to fetch game states');

    // 3. Full node progress for all nodes (1-8 regular, 9-11 penalty)
    const { data: allProgress, error: progErr } = await supabase
      .from('participant_node_progress')
      .select('participant_id, node_id, status, solved_at')
      .in('participant_id', participantIds);
    if (progErr) throw new Error('Failed to fetch progress');

    // Build lookup maps
    const gameStateMap = new Map<number, {
      score: number;
      total_correct: number;
      total_mistakes: number;
      penalty_counter: number;
      is_finished: number | boolean;
      finished_at: string | null;
    }>();
    for (const gs of (gameStates || []) as any[]) {
      gameStateMap.set(gs.participant_id, gs);
    }

    // Map node progress per participant: { participantId -> { nodeId -> { status, solved_at } } }
    const progressMap = new Map<number, Map<number, { status: string; solved_at: string | null }>>();
    for (const p of (allProgress || []) as { participant_id: number; node_id: number; status: string; solved_at: string | null }[]) {
      if (!progressMap.has(p.participant_id)) {
        progressMap.set(p.participant_id, new Map());
      }
      progressMap.get(p.participant_id)!.set(p.node_id, {
        status: p.status,
        solved_at: p.solved_at,
      });
    }

    // Assemble rows
    const rows = (participants as { id: number; team_name: string }[]).map(p => {
      const gs = gameStateMap.get(p.id);
      const nodes = progressMap.get(p.id) || new Map();

      // Build node array: nodes 1-8 are regular, 9-11 are penalty
      const nodeData: Array<{
        node_id: number;
        status: string;
        solved_at: string | null;
      }> = [];
      for (let i = 1; i <= 11; i++) {
        const node = nodes.get(i);
        nodeData.push({
          node_id: i,
          status: node?.status ?? 'unsolved',
          solved_at: node?.solved_at ?? null,
        });
      }

      return {
        participant_id: p.id,
        team_name: p.team_name,
        score: gs?.score ?? 0,
        total_correct: gs?.total_correct ?? 0,
        total_mistakes: gs?.total_mistakes ?? 0,
        penalty_counter: gs?.penalty_counter ?? 0,
        is_finished: Boolean(gs?.is_finished),
        finished_at: gs?.finished_at ?? null,
        nodes: nodeData, // [{ node_id, status, solved_at }, ...]
      };
    });

    // Sort: highest score → fewest penalties → most solved nodes
    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.penalty_counter !== b.penalty_counter) return a.penalty_counter - b.penalty_counter;
      const solvedA = a.nodes.filter((n) => n.status === 'solved').length;
      const solvedB = b.nodes.filter((n) => n.status === 'solved').length;
      return solvedB - solvedA;
    });

    res.json(rows);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;