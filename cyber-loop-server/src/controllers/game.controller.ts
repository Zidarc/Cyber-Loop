import { Request, Response } from 'express';
import type { JwtPayload } from '../services/auth.service';
import { gameService } from '../services/game.service';

export async function getState(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ error: 'Not implemented (Phase 6)' });
}

export async function getQuestion(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ error: 'Not implemented (Phase 6)' });
}

export async function submitAnswer(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ error: 'Not implemented (Phase 6)' });
}

export async function getQuestionFile(req: Request, res: Response): Promise<void> {
  const user = (req as Request & { user?: JwtPayload }).user;
  if (!user?.participantId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const questionId = Number(req.params.questionId);
  if (!Number.isInteger(questionId) || questionId < 1) {
    res.status(400).json({ error: 'Invalid question ID' });
    return;
  }

  const result = await gameService.getQuestionFile(user.participantId, questionId);

  if (!result.ok) {
    if (result.status === 'not_found') {
      res.status(404).json({ error: 'Question or file not found' });
      return;
    }
    if (result.status === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    if (result.status === 'invalid_path') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    res.status(502).json({ error: 'Failed to get file' });
    return;
  }

  res.json({ url: result.url });
}
