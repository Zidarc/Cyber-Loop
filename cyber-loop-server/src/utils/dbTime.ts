import { supabase } from '../config/supabase';

function coerceIso(value: unknown): string | null {
  if (typeof value === 'string' && value.trim() !== '') return value;
  if (Array.isArray(value) && value.length > 0) return coerceIso(value[0]);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.server_now === 'string' && obj.server_now.trim() !== '') return obj.server_now;
  }
  return null;
}

export async function getSupabaseNowIso(): Promise<string> {
  const { data, error } = await supabase.rpc('server_now');
  const iso = !error ? coerceIso(data) : null;
  return iso ?? new Date().toISOString();
}

export async function getSupabaseNowMs(): Promise<number> {
  const iso = await getSupabaseNowIso();
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : Date.now();
}
