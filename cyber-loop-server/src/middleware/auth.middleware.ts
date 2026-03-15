import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authService, hashToken } from '../services/auth.service';
import type { JwtPayload } from '../services/auth.service';
import { getCompetitionStatus } from '../services/competition.service'; // ← add

const JWT_SECRET = process.env.JWT_SECRET || 'Well ofc this isnt the key';

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
}

export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({ error: 'No token' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const tokenHash = hashToken(token);

    const row = await authService.getParticipantById(payload.participantId);
    if (!row || row.is_active !== 1) {
      res.status(403).json({ error: 'Account disabled' });
      return;
    }
    if (row.active_token_hash !== tokenHash) {
      res.status(403).json({ error: 'Session invalidated' });
      return;
    }

    // Competition active check ← add this block
    const competition = await getCompetitionStatus();
    if (!competition.isActive) {
      res.status(403).json({ error: 'Competition has ended' });
      return;
    }

    (req as Request & { user: JwtPayload }).user = payload;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
}