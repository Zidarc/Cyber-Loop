import { supabase } from '../config/supabase';
import { isAllowedFilePath } from '../utils/filePath';
import { getFullGameState, getNextQuestion, submitAnswer as engineSubmitAnswer } from '../game/gameEngine';
import { getCompetitionStatus } from './competition.service';

const BUCKET = process.env.SUPABASE_BUCKET_QUESTIONS?.trim() || 'question-assets';
const SIGNED_URL_EXPIRES_SEC = 10 * 60;


export type MimeHint = 'image' | 'pdf' | 'audio' | 'text';

export type FileEntry = {
  url:      string;
  path:     string;
  mimeHint: MimeHint;
  label:    string;
};


export type GetQuestionFileResult =
  | { ok: true; url: string }
  | { ok: false; status: 'not_found' | 'forbidden' | 'invalid_path' | 'storage_error' };


export type GetQuestionFilesResult =
  | { ok: true;  files: FileEntry[] }
  | { ok: false; status: 'not_found' | 'forbidden' | 'invalid_path' | 'storage_error' };

function parseFilePaths(raw: string | null | undefined): string[] {
  if (raw == null || typeof raw !== 'string' || raw.trim() === '') return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((p): p is string => typeof p === 'string' && p.trim() !== '');
      }
    } catch {
    }
  }
  return [trimmed];
}

function getMimeHint(filePath: string): MimeHint {
  const lower = filePath.toLowerCase();
  if (lower.startsWith('images/') || /\.(png|jpg|jpeg|gif|webp|svg)$/.test(lower)) return 'image';
  if (lower.startsWith('pdfs/')   || lower.endsWith('.pdf'))                          return 'pdf';
  if (lower.startsWith('audios/') || /\.(mp3|wav|ogg|m4a|flac)$/.test(lower))        return 'audio';
  return 'text';
}

function getDisplayFileName(filePath: string): string {
  const cleanPath = String(filePath || '').trim().split('?')[0].split('#')[0];
  if (!cleanPath) return '';

  const rawName = cleanPath.split(/[\\/]/).filter(Boolean).pop() || '';
  if (!rawName) return '';

  let decoded = rawName;
  try {
    decoded = decodeURIComponent(rawName);
  } catch {
    // Keep the raw name if decoding fails.
  }

  const stripped = decoded.replace(/^puzzle\d+[_-]+/i, '');
  return stripped || decoded;
}

function makeLabel(filePath: string, mimeHint: MimeHint, index: number, total: number): string {
  const fileName = getDisplayFileName(filePath);
  if (fileName) return fileName;

  const base = mimeHint === 'image' ? 'Image'
             : mimeHint === 'pdf'   ? 'PDF'
             : mimeHint === 'audio' ? 'Audio'
             :                        'File';
  return total === 1 ? base : `${base} ${index + 1}`;
}


async function resolveNodeAccess(
  participantId: number,
  questionId: number,
): Promise<
  | { ok: false; status: 'not_found' | 'forbidden' }
  | { ok: true;  rawFilePath: string | null; nodeId: number }
> {
  const [{ data: question, error: qError }, { data: assignment }] = await Promise.all([
    supabase
      .from('questions')
      .select('node_id, file_path, question_type')
      .eq('id', questionId)
      .maybeSingle(),
    supabase
      .from('participant_question_assignment')
      .select('node_id')
      .eq('participant_id', participantId)
      .eq('question_id', questionId)
      .maybeSingle(),
  ]);

  if (qError || !question) return { ok: false, status: 'not_found' };

  const nodeId =
    (assignment as { node_id: number } | null)?.node_id ??
    (question as { node_id: number }).node_id;

  const { data: progress, error: pError } = await supabase
    .from('participant_node_progress')
    .select('status')
    .eq('participant_id', participantId)
    .eq('node_id', nodeId)
    .maybeSingle();

  if (pError || !progress) return { ok: false, status: 'forbidden' };
  const status = (progress as { status: string }).status;
  if (status !== 'unlocked' && status !== 'solved') return { ok: false, status: 'forbidden' };

  return {
    ok: true,
    rawFilePath: (question as { file_path: string | null }).file_path,
    nodeId,
  };
}

export const gameService = {
  async getState(participantId: number) {
    const [gameState, competition] = await Promise.all([
      getFullGameState(participantId),
      getCompetitionStatus(),
    ]);

    return {
      ...gameState,
      competition: {
        endsAt:      competition.endsAt,
        remainingMs: competition.remainingMs,
      },
    };
  },

  async getQuestion(nodeId: number, participantId: number) {
    return getNextQuestion(nodeId, participantId);
  },

  async submitAnswer(participantId: number, questionId: number, answer: string) {
    const submitResult = await engineSubmitAnswer(participantId, questionId, answer);
    const fullState    = await getFullGameState(participantId);
    return { ...fullState, submitResult };
  },

  async getQuestionFiles(
    participantId: number,
    questionId:   number,
  ): Promise<GetQuestionFilesResult> {
    const qId = Number(questionId);
    if (!Number.isInteger(qId) || qId < 1) return { ok: false, status: 'not_found' };

    const access = await resolveNodeAccess(participantId, qId);
    if (!access.ok) return { ok: false, status: access.status };

    const paths = parseFilePaths(access.rawFilePath);
    if (paths.length === 0) return { ok: false, status: 'not_found' };

    for (const p of paths) {
      if (!isAllowedFilePath(p)) return { ok: false, status: 'invalid_path' };
    }

    const results = await Promise.all(
      paths.map((p) =>
        supabase.storage
          .from(BUCKET)
          .createSignedUrl(p.trim(), SIGNED_URL_EXPIRES_SEC)
      )
    );

    const files: FileEntry[] = [];
    for (let i = 0; i < paths.length; i++) {
      const { data: signed, error: sError } = results[i];
      if (sError || !signed?.signedUrl) return { ok: false, status: 'storage_error' };
      const mimeHint = getMimeHint(paths[i]);
      files.push({
        url:      signed.signedUrl,
        path:     paths[i],
        mimeHint,
        label:    makeLabel(paths[i], mimeHint, i, paths.length),
      });
    }

    return { ok: true, files };
  },

  async getQuestionFile(
    participantId: number,
    questionId:   number,
  ): Promise<GetQuestionFileResult> {
    const result = await this.getQuestionFiles(participantId, questionId);
    if (!result.ok) return { ok: false, status: result.status };
    return { ok: true, url: result.files[0].url };
  },
};