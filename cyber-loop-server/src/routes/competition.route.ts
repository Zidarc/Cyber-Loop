import { Router } from 'express';
import { getCompetitionStatus } from '../services/competition.service';

const router = Router();

// Public — no auth needed, frontend uses this on landing page before login
router.get('/status', async (_req, res) => {
  try {
    const status = await getCompetitionStatus();
    res.json(status);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to get competition status' });
  }
});

export default router;