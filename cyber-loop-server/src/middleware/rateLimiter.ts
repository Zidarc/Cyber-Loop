import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import type { JwtPayload } from '../services/auth.service';

// Login: 10 attempts per minute per IP
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many requests, please try again later.' },
});

// Answer submissions: 10 attempts per 15 seconds per participant.
export const answerRateLimiter = rateLimit({
  windowMs: 15 * 1000,
  max: 10,
  keyGenerator: (req: Request): string => {
    const user = (req as Request & { user?: JwtPayload }).user;
    return user?.participantId?.toString() ?? req.ip ?? 'unknown';
  },
  message: { error: 'Too many answer submissions, please slow down.' },
});