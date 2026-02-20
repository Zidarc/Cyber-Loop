import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../config/db';

const BCRYPT_COST = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'Well ofc this isnt the key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export interface ParticipantRow {
  id: number;
  username: string;
  password_hash: string;
  team_name: string;
  is_active: number;
  active_token_hash: string | null;
}

export interface JwtPayload {
  participantId: number;
  username: string;
  teamName: string;
  role: 'participant';
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const authService = {
  async login(username: string, password: string): Promise<{ token: string } | null> {
    const trimmed = String(username ?? '').trim();
    const stmt = db.prepare(
      'SELECT id, username, password_hash, team_name, is_active, active_token_hash FROM participants WHERE username = ?'
    );
    const row = stmt.get(trimmed) as ParticipantRow | undefined;
    if (!row) return null;

    if (row.is_active !== 1) return null;

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) return null;

    const payload: JwtPayload & { loginId: string } = {
      participantId: row.id,
      username: row.username,
      teamName: row.team_name,
      role: 'participant',
      loginId: crypto.randomUUID(),
    };

    const token = jwt.sign(
      payload,
      JWT_SECRET as jwt.Secret,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );
    const tokenHash = hashToken(token);

    const updateStmt = db.prepare('UPDATE participants SET active_token_hash = ? WHERE id = ?');
    updateStmt.run(tokenHash, row.id);

    return { token };
  },

  async logout(participantId: number, token: string): Promise<boolean> {
    const tokenHash = hashToken(token);
    const stmt = db.prepare('SELECT active_token_hash FROM participants WHERE id = ?');
    const row = stmt.get(participantId) as { active_token_hash: string | null } | undefined;
    if (!row || row.active_token_hash !== tokenHash) return false;

    const clearStmt = db.prepare('UPDATE participants SET active_token_hash = NULL WHERE id = ?');
    clearStmt.run(participantId);
    return true;
  },

  getParticipantById(id: number): { active_token_hash: string | null; is_active: number } | null {
    const stmt = db.prepare('SELECT active_token_hash, is_active FROM participants WHERE id = ?');
    return (stmt.get(id) as { active_token_hash: string | null; is_active: number } | undefined) ?? null;
  },
};
