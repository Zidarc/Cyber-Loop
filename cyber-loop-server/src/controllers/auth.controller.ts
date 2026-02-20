import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import type { JwtPayload } from '../services/auth.service';

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
}

export async function login(req: Request, res: Response): Promise<void> {
  const username = req.body?.username ?? '';
  const password = req.body?.password ?? '';

  const result = await authService.login(username, password);

  if (!result) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  res.json({ token: result.token });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = extractBearerToken(req.headers.authorization);
  const user = (req as Request & { user?: JwtPayload }).user;

  if (!token || !user?.participantId) {
    res.status(401).json({ error: 'No token' });
    return;
  }

  const success = await authService.logout(user.participantId, token);
  if (!success) {
    res.status(403).json({ error: 'Session invalidated' });
    return;
  }

  res.status(200).json({ message: 'Logged out successfully' });
}
