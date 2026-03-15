import { Router } from 'express';
import { startCompetition, endCompetition, getCompetitionStatus } from '../services/competition.service';

const router = Router();

router.post('/start', async (_req, res) => {
  try {
    const status = await startCompetition();
    res.json(status);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.post('/end', async (_req, res) => {
  try {
    await endCompetition();
    res.json({ ok: true });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.get('/status', async (_req, res) => {
  try {
    const status = await getCompetitionStatus();
    res.json(status);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

export default router;