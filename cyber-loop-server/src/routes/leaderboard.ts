import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('score',           { ascending: false })
      .order('penalty_counter', { ascending: true  })
      .order('puzzles_solved',  { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;