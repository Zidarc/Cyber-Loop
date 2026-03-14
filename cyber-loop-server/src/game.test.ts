/**
 * Game API integration tests: state, question, answer endpoints.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import gameRoutes from './routes/game.routes';
import authRoutes from './routes/auth.routes';

const BCRYPT_COST = 12;
const tokenStore: Record<number, string | null> = { 1: null };

const participants = [
  {
    id: 1,
    username: 'team1',
    password_hash: bcrypt.hashSync('password123', BCRYPT_COST),
    team_name: 'Team Alpha',
    is_active: 1,
    get active_token_hash() {
      return tokenStore[1];
    },
  },
];

const defaultGameState = {
  participant_id: 1,
  total_correct: 0,
  total_mistakes: 0,
  score: 0,
  last_checkpoint_id: null,
  current_node_id: null,
  current_question_id: null,
  last_question_id: null,
  penalty_nodes_unlocked: 0,
  is_finished: 0,
  started_at: new Date().toISOString(),
  finished_at: null,
  updated_at: new Date().toISOString(),
};

const defaultNodes = [
  { id: 1, label: 'START', node_type: 'start' },
  { id: 2, label: '1', node_type: 'normal' },
  { id: 26, label: 'FINAL', node_type: 'final' },
];

const defaultProgress = [
  { node_id: 1, status: 'unlocked', unlocked_at: new Date().toISOString(), solved_at: null },
  { node_id: 2, status: 'unlocked', unlocked_at: new Date().toISOString(), solved_at: null },
  { node_id: 26, status: 'locked', unlocked_at: null, solved_at: null },
];

const defaultQuestions = [
  {
    id: 101,
    node_id: 1,
    pool_type: 'main',
    question_type: 'text',
    question_text: 'Test question?',
    file_path: null,
    answer: 'answer_1_1',
    difficulty: 1,
  },
];

vi.mock('./config/supabase', () => {
  const chain = (data: unknown) => ({
    eq: () => chain(data),
    in: () => Promise.resolve({ data: data ?? [], error: null }),
    maybeSingle: () => Promise.resolve({ data, error: null }),
    then: (resolve: (v: { data: unknown; error: null }) => void) =>
      Promise.resolve({ data: data ?? null, error: null }).then(resolve),
  });

  const from = (table: string) => ({
    select: (cols?: string) => {
      const eq = (field: string, value: unknown) => {
        const maybeSingle = () => {
          if (table === 'participants' && field === 'username') {
            const p = participants.find((r) => r.username === value);
            if (!p) return Promise.resolve({ data: null, error: null });
            return Promise.resolve({
              data: { ...p, active_token_hash: tokenStore[1] },
              error: null,
            });
          }
          if (table === 'participants' && field === 'id') {
            const p = participants.find((r) => r.id === value);
            return Promise.resolve({
              data: p ? { ...p, active_token_hash: tokenStore[1], is_active: 1 } : null,
              error: null,
            });
          }
          if (table === 'participant_game_state') {
            return Promise.resolve({ data: defaultGameState, error: null });
          }
          if (table === 'participant_node_progress') {
            const prog =
              field === 'node_id'
                ? defaultProgress.find((p) => p.node_id === value)
                : defaultProgress[0];
            return Promise.resolve({ data: prog ?? null, error: null });
          }
          if (table === 'questions' && field !== 'pool_type') {
            return Promise.resolve({ data: defaultQuestions[0], error: null });
          }
          if (table === 'nodes') {
            const n = field === 'id' ? defaultNodes.find((n) => n.id === value) : null;
            return Promise.resolve({ data: n ?? null, error: null });
          }
          if (table === 'participant_question_assignment') {
            return {
              eq: (f2: string) => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: f2 === 'question_id' ? { node_id: 1 } : null,
                    error: null,
                  }),
              }),
              in: () => Promise.resolve({ data: [], error: null }),
            };
          }
          return Promise.resolve({ data: null, error: null });
        };
        if (table === 'questions' && field === 'pool_type') {
          return { then: (resolve: (v: unknown) => void) => Promise.resolve({ data: defaultQuestions, error: null }).then(resolve) };
        }
        const result = {
          eq: (f2: string, v2: unknown) =>
            table === 'participant_node_progress' && f2 === 'node_id'
              ? {
                  maybeSingle: () => {
                    const prog = defaultProgress.find((p) => p.node_id === v2);
                    return Promise.resolve({ data: prog ?? null, error: null });
                  },
                }
              : { maybeSingle: () => maybeSingle() },
          in: () => Promise.resolve({ data: [], error: null }),
          maybeSingle,
          then: (resolve: (v: unknown) => void) => {
            const d =
              table === 'participant_node_progress'
                ? defaultProgress
                : table === 'questions'
                  ? defaultQuestions
                  : table === 'node_edges'
                    ? []
                    : null;
            return Promise.resolve({ data: d, error: null }).then(resolve);
          },
        };
        return result;
      };
      return {
        eq,
        then: (resolve: (v: unknown) => void) => {
          if (table === 'nodes') {
            return Promise.resolve({ data: defaultNodes, error: null }).then(resolve);
          }
          return Promise.resolve({ data: null, error: null }).then(resolve);
        },
      };
    },
    insert: () => Promise.resolve({ error: null }),
    upsert: () => Promise.resolve({ error: null }),
    update: () => ({ eq: () => Promise.resolve({ error: null }) }),
  });

  const update = (updates: { active_token_hash?: string | null }) => ({
    eq: (field: string, id: number) => {
      if (field === 'id' && id === 1) tokenStore[1] = updates.active_token_hash ?? null;
      return Promise.resolve({ error: null });
    },
  });

  return {
    supabase: {
      from: (t: string) => (t === 'participants' ? { ...from(t), update } : from(t)),
      storage: { from: () => ({ createSignedUrl: () => Promise.resolve({ data: { signedUrl: 'https://example.com/file' }, error: null }) }) },
    },
    default: { from },
  };
});

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/game', gameRoutes);
  return app;
}

async function getToken(): Promise<string> {
  const app = createTestApp();
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'team1', password: 'password123' })
    .expect(200);
  return res.body.token;
}

describe('Game API', () => {
  const app = createTestApp();

  beforeEach(() => {
    tokenStore[1] = null;
  });

  it('state endpoint returns 401 without token', async () => {
    await request(app).get('/api/game/state').expect(401);
  });

  it('state endpoint returns game state with valid token', async () => {
    const token = await getToken();
    const res = await request(app)
      .get('/api/game/state')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveProperty('nodes');
    expect(res.body).toHaveProperty('gameState');
  });

  it('answer endpoint returns 401 without token', async () => {
    await request(app)
      .post('/api/game/answer')
      .send({ questionId: 101, nodeId: 1, answer: 'answer_1_1' })
      .expect(401);
  });

  it('answer endpoint returns 400 for invalid payload', async () => {
    const token = await getToken();
    await request(app)
      .post('/api/game/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: 0, nodeId: 1, answer: 'x' })
      .expect(400);
  });

  it('answer endpoint accepts valid payload and returns state', async () => {
    const token = await getToken();
    const res = await request(app)
      .post('/api/game/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: 101, nodeId: 1, answer: 'answer_1_1' })
      .expect(200);
    expect(res.body).toHaveProperty('nodes');
    expect(res.body).toHaveProperty('gameState');
    expect(res.body.gameState).toMatchObject({
      totalCorrect: expect.any(Number),
      totalMistakes: expect.any(Number),
      score: expect.any(Number),
      isFinished: expect.any(Boolean),
    });
  });
});
