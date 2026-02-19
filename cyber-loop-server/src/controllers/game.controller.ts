import { Request, Response } from 'express';

export async function getState(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ error: 'Not implemented (Phase 6)' });
}

export async function getQuestion(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ error: 'Not implemented (Phase 6)' });
}

export async function submitAnswer(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ error: 'Not implemented (Phase 6)' });
}
