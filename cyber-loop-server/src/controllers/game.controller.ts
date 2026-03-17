import { Request, Response } from 'express';
import type { JwtPayload } from '../services/auth.service';
import { gameService } from '../services/game.service';

export async function getState(req: Request, res: Response): Promise<void> {
  const user = (req as Request & { user?: JwtPayload }).user;
  if (!user?.participantId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const state = await gameService.getState(user.participantId);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load game state' });
  }
}

export async function getQuestion(req: Request, res: Response): Promise<void> {
  const user = (req as Request & { user?: JwtPayload }).user;
  if (!user?.participantId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const nodeId = Number(req.params.nodeId);
  if (!Number.isInteger(nodeId) || nodeId < 1) {
    res.status(400).json({ error: 'Invalid node ID' });
    return;
  }

  try {
    const question = await gameService.getQuestion(nodeId, user.participantId);
    res.json(question);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';

    if (msg === 'Node is locked') {
      res.status(403).json({ error: 'Node is locked' });
    } else if (msg === 'Node is already solved') {
      res.status(409).json({ error: 'Node is already solved' });
    } else if (msg === 'Question pool exhausted') {
      res.status(404).json({ error: 'No questions available for this node' });
    } else if (msg === 'Node not found') {
      res.status(404).json({ error: 'Node not found' });
    } else {
      res.status(500).json({ error: 'Failed to get question' });
    }
  }
}

export async function submitAnswer(req: Request, res: Response): Promise<void> {
  const user = (req as Request & { user?: JwtPayload }).user;
  if (!user?.participantId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { questionId, answer } = req.body as { questionId?: number; answer?: string };

  const qId = Number(questionId);
  if (!Number.isInteger(qId) || qId < 1 || typeof answer !== 'string') {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }

  try {
    const state = await gameService.submitAnswer(user.participantId, qId, answer);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit answer' });
  }
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