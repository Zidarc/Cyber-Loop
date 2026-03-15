import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabase } from '../config/supabase';

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

    const { data: row, error: selectError } = await supabase
      .from('participants')
      .select('id, username, password_hash, team_name, is_active, active_token_hash')
      .eq('username', trimmed)
      .maybeSingle();

    if (selectError || !row) return null;

    const participant = row as ParticipantRow;
    if (participant.is_active !== 1) return null;

    const valid = await bcrypt.compare(password, participant.password_hash);
    if (!valid) return null;

    const payload: JwtPayload & { loginId: string } = {
      participantId: participant.id,
      username: participant.username,
      teamName: participant.team_name,
      role: 'participant',
      loginId: crypto.randomUUID(),
    };

    const token = jwt.sign(
      payload,
      JWT_SECRET as jwt.Secret,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );
    const tokenHash = hashToken(token);

    const { error: updateError } = await supabase
      .from('participants')
      .update({ active_token_hash: tokenHash })
      .eq('id', participant.id);

    if (updateError) return null;

    return { token };
  },

  async logout(participantId: number, token: string): Promise<boolean> {
    const tokenHash = hashToken(token);

    const { data: row, error: selectError } = await supabase
      .from('participants')
      .select('active_token_hash')
      .eq('id', participantId)
      .maybeSingle();

    if (selectError || !row) return false;
    const stored = row as { active_token_hash: string | null };
    if (stored.active_token_hash !== tokenHash) return false;

    const { error: updateError } = await supabase
      .from('participants')
      .update({ active_token_hash: null })
      .eq('id', participantId);

    return !updateError;
  },

  async getParticipantById(
    id: number
  ): Promise<{ active_token_hash: string | null; is_active: number } | null> {
    const { data: row, error } = await supabase
      .from('participants')
      .select('active_token_hash, is_active')
      .eq('id', id)
      .maybeSingle();

    if (error || !row) return null;
    return row as { active_token_hash: string | null; is_active: number };
  },
};
