import { supabase } from '../config/supabase';
import { isAllowedFilePath } from '../utils/filePath';
import { getFullGameState, getNextQuestion, submitAnswer as engineSubmitAnswer } from '../game/gameEngine';

const BUCKET = process.env.SUPABASE_BUCKET_QUESTIONS?.trim() || 'question-assets';
const SIGNED_URL_EXPIRES_SEC = 60;

export type GetQuestionFileResult =
  | { ok: true; url: string }
  | { ok: false; status: 'not_found' | 'forbidden' | 'invalid_path' | 'storage_error' };

export const gameService = {
  async getState(participantId: number) {
    return getFullGameState(participantId);
  },

  async getQuestion(nodeId: number, participantId: number) {
    return getNextQuestion(nodeId, participantId);
  },

  async submitAnswer(participantId: number, questionId: number, answer: string) {
    return engineSubmitAnswer(participantId, questionId, answer);
  },

  async getQuestionFile(
    participantId: number,
    questionId: number
  ): Promise<GetQuestionFileResult> {
    const qId = Number(questionId);
    if (!Number.isInteger(qId) || qId < 1) {
      return { ok: false, status: 'not_found' };
    }

    const [{ data: question, error: qError }, { data: assignment }] = await Promise.all([
      supabase
        .from('questions')
        .select('node_id, file_path, question_type')
        .eq('id', qId)
        .maybeSingle(),
      supabase
        .from('participant_question_assignment')
        .select('node_id')
        .eq('participant_id', participantId)
        .eq('question_id', qId)
        .maybeSingle(),
    ]);

    if (qError || !question) return { ok: false, status: 'not_found' };
    const filePath = (question as { file_path: string | null }).file_path;
    if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
      return { ok: false, status: 'not_found' };
    }

    const nodeId = (assignment as { node_id: number } | null)?.node_id ?? (question as { node_id: number }).node_id;

    const { data: progress, error: pError } = await supabase
      .from('participant_node_progress')
      .select('status')
      .eq('participant_id', participantId)
      .eq('node_id', nodeId)
      .maybeSingle();

    if (pError || !progress) return { ok: false, status: 'forbidden' };
    const status = (progress as { status: string }).status;
    if (status !== 'unlocked' && status !== 'solved') {
      return { ok: false, status: 'forbidden' };
    }

    if (!isAllowedFilePath(filePath)) return { ok: false, status: 'invalid_path' };

    const { data: signed, error: sError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath.trim(), SIGNED_URL_EXPIRES_SEC);

    if (sError || !signed?.signedUrl) return { ok: false, status: 'storage_error' };
    return { ok: true, url: signed.signedUrl };
  },
};
