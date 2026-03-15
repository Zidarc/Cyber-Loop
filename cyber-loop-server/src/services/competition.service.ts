import { supabase } from '../config/supabase';
const COMPETITION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

export type CompetitionStatus = {
  isActive: boolean;
  startedAt: string | null;
  endsAt: string | null;
  remainingMs: number | null;
};

export async function startCompetition(): Promise<CompetitionStatus> {
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + COMPETITION_DURATION_MS);

  const { error: cfgErr } = await supabase
    .from('competition_config')
    .update({
      is_active: true,
      started_at: startedAt.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .eq('id', 1);

  if (cfgErr) throw new Error('Failed to update competition config');

  const { error: partErr } = await supabase
    .from('participants')
    .update({ is_active: 1 })
    .neq('id', 0);

  if (partErr) throw new Error('Failed to activate participants');

  return {
    isActive: true,
    startedAt: startedAt.toISOString(),
    endsAt: endsAt.toISOString(),
    remainingMs: COMPETITION_DURATION_MS,
  };
}

export async function endCompetition(): Promise<void> {
  await supabase
    .from('competition_config')
    .update({ is_active: false })
    .eq('id', 1);

  await supabase
    .from('participants')
    .update({ is_active: 0 })
    .neq('id', 0);
}

export async function getCompetitionStatus(): Promise<CompetitionStatus> {
  const { data, error } = await supabase
    .from('competition_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    return { isActive: false, startedAt: null, endsAt: null, remainingMs: null };
  }

  const cfg = data as {
    is_active: boolean;
    started_at: string | null;
    ends_at: string | null;
  };

  const now = Date.now();
  const endsAt = cfg.ends_at ? new Date(cfg.ends_at).getTime() : null;
  const remainingMs = endsAt ? Math.max(0, endsAt - now) : null;

  // Auto-end if time passed but still marked active
  if (cfg.is_active && endsAt && now >= endsAt) {
    await endCompetition();
    return {
      isActive: false,
      startedAt: cfg.started_at,
      endsAt: cfg.ends_at,
      remainingMs: 0,
    };
  }

  return {
    isActive: cfg.is_active,
    startedAt: cfg.started_at,
    endsAt: cfg.ends_at,
    remainingMs,
  };
}