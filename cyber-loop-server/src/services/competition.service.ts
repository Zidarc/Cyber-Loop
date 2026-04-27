import { supabase } from '../config/supabase';
import { getSupabaseNowIso, getSupabaseNowMs } from '../utils/dbTime';

const COMPETITION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
const CACHE_TTL_MS = 5_000;                          // 5-second TTL

export type CompetitionStatus = {
  isActive:    boolean;
  startedAt:   string | null;
  endsAt:      string | null;
  remainingMs: number | null;
};

let _cache: { status: CompetitionStatus; ts: number } | null = null;

function invalidateCache(): void {
  _cache = null;
}

export async function startCompetition(): Promise<CompetitionStatus> {
  invalidateCache();

  const startedAtIso = await getSupabaseNowIso();
  const startedAtMs  = new Date(startedAtIso).getTime();
  const endsAtIso    = new Date(startedAtMs + COMPETITION_DURATION_MS).toISOString();

  const { error: cfgErr } = await supabase
    .from('competition_config')
    .update({
      is_active:  true,
      started_at: startedAtIso,
      ends_at:    endsAtIso,
    })
    .eq('id', 1);

  if (cfgErr) throw new Error('Failed to update competition config');

  const { error: partErr } = await supabase
    .from('participants')
    .update({ is_active: 1 })
    .neq('id', 0);

  if (partErr) throw new Error('Failed to activate participants');

  return {
    isActive:    true,
    startedAt:   startedAtIso,
    endsAt:      endsAtIso,
    remainingMs: COMPETITION_DURATION_MS,
  };
}

export async function endCompetition(): Promise<void> {
  invalidateCache();

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
  const cacheNow = Date.now();

  if (_cache && cacheNow - _cache.ts < CACHE_TTL_MS) {
    return _cache.status;
  }

  const { data, error } = await supabase
    .from('competition_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    const status: CompetitionStatus = {
      isActive: false, startedAt: null, endsAt: null, remainingMs: null,
    };
    _cache = { status, ts: cacheNow };
    return status;
  }

  const cfg = data as {
    is_active:  boolean;
    started_at: string | null;
    ends_at:    string | null;
  };

  const nowMs = await getSupabaseNowMs();
  const endsAtMs    = cfg.ends_at ? new Date(cfg.ends_at).getTime() : null;
  const remainingMs = endsAtMs ? Math.max(0, endsAtMs - nowMs) : null;
  if (cfg.is_active && endsAtMs && nowMs >= endsAtMs) {
    await supabase.rpc('try_end_competition');

    const status: CompetitionStatus = {
      isActive:    false,
      startedAt:   cfg.started_at,
      endsAt:      cfg.ends_at,
      remainingMs: 0,
    };
    _cache = { status, ts: cacheNow };
    return status;
  }

  const status: CompetitionStatus = {
    isActive:    cfg.is_active,
    startedAt:   cfg.started_at,
    endsAt:      cfg.ends_at,
    remainingMs,
  };
  _cache = { status, ts: cacheNow };
  return status;
}