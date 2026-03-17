/**
 * Allowed root folders in the Supabase Storage bucket for question assets.
 * Must match bucket layout: Audios, Images, PDFs, Text.
 */
const ALLOWED_PREFIXES = ['Audios/', 'Images/', 'PDFs/', 'Text/'] as const;

export function isAllowedFilePath(filePath: string | null | undefined): boolean {
  if (filePath == null || typeof filePath !== 'string') return false;
  const trimmed = filePath.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.includes('..') || trimmed.startsWith('/')) return false;
  const normalized = trimmed.replace(/\\/g, '/');
  return ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}
