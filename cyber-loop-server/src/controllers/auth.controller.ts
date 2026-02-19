import { Request, Response } from 'express';

export async function login(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ error: 'Not implemented (Phase 3)' });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ error: 'Not implemented (Phase 3)' });
}
