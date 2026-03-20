import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();
const LEADERBOARD_CACHE_TTL_MS = 5_000;

router.get('/', async (_req, res) => {
  try {
    const { data: cacheRow } = await supabase
      .from('leaderboard_cache')
      .select('data, cached_at')
      .eq('id', 1)
      .maybeSingle();

    if (cacheRow) {
      const ageMs = Date.now() - new Date((cacheRow as { data: unknown; cached_at: string }).cached_at).getTime();
      if (ageMs < LEADERBOARD_CACHE_TTL_MS) {
        res.json((cacheRow as { data: unknown; cached_at: string }).data);
        return;
      }
    }

    const { data: participants, error: pErr } = await supabase
      .from('participants')
      .select('id, team_name');

    if (pErr || !participants) throw new Error('Failed to fetch participants');

    const participantIds = (participants as { id: number; team_name: string }[]).map(p => p.id);

    if (participantIds.length === 0) {
      res.json([]);
      return;
    }
    const [gameStatesResult, progressResult] = await Promise.all([
      supabase
        .from('participant_game_state')
        .select('participant_id, score, total_correct, total_mistakes, penalty_counter, is_finished, finished_at')
        .in('participant_id', participantIds),
      supabase
        .from('participant_node_progress')
        .select('participant_id, node_id, status, solved_at')
        .in('participant_id', participantIds),
    ]);

    if (gameStatesResult.error) throw new Error('Failed to fetch game states');
    if (progressResult.error)   throw new Error('Failed to fetch progress');

    const gameStateMap = new Map<number, {
      score:           number;
      total_correct:   number;
      total_mistakes:  number;
      penalty_counter: number;
      is_finished:     number | boolean;
      finished_at:     string | null;
    }>();
    for (const gs of (gameStatesResult.data || []) as any[]) {
      gameStateMap.set(gs.participant_id, gs);
    }

    const progressMap = new Map<number, Map<number, { status: string; solved_at: string | null }>>();
    for (const p of (progressResult.data || []) as {
      participant_id: number;
      node_id:        number;
      status:         string;
      solved_at:      string | null;
    }[]) {
      if (!progressMap.has(p.participant_id)) {
        progressMap.set(p.participant_id, new Map());
      }
      progressMap.get(p.participant_id)!.set(p.node_id, {
        status:    p.status,
        solved_at: p.solved_at,
      });
    }
    const rows = (participants as { id: number; team_name: string }[]).map(p => {
      const gs    = gameStateMap.get(p.id);
      const nodes = progressMap.get(p.id) || new Map();

      const nodeData: Array<{ node_id: number; status: string; solved_at: string | null }> = [];
      for (let i = 1; i <= 11; i++) {
        const node = nodes.get(i);
        nodeData.push({
          node_id:   i,
          status:    node?.status   ?? 'unsolved',
          solved_at: node?.solved_at ?? null,
        });
      }

      return {
        participant_id:  p.id,
        team_name:       p.team_name,
        score:           gs?.score           ?? 0,
        total_correct:   gs?.total_correct   ?? 0,
        total_mistakes:  gs?.total_mistakes  ?? 0,
        penalty_counter: gs?.penalty_counter ?? 0,
        is_finished:     Boolean(gs?.is_finished),
        finished_at:     gs?.finished_at     ?? null,
        nodes:           nodeData,
      };
    });
    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.penalty_counter !== b.penalty_counter) return a.penalty_counter - b.penalty_counter;
      const solvedA = a.nodes.filter(n => n.status === 'solved').length;
      const solvedB = b.nodes.filter(n => n.status === 'solved').length;
      return solvedB - solvedA;
    });
    supabase
      .from('leaderboard_cache')
      .upsert(
        { id: 1, data: rows, cached_at: new Date().toISOString() },
        { onConflict: 'id' },
      )
      .then(({ error }) => {
        if (error) console.error('Leaderboard cache write failed:', error.message);
      });

    res.json(rows);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;