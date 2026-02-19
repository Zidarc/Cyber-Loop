import { Request, Response, NextFunction } from 'express';

export async function verifyToken(
  _req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  // Stub: JWT verification implemented in Phase 3
  next();
}
