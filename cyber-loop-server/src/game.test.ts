import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

import gameRoutes from './routes/game.routes';

vi.mock('./config/supabase', () => {
  const state: any = {
    participant_game_state: {},
    nodes: [],
    node_edges: [],
    questions: [],
    participant_node_progress: [],
    question_attempts: [],
    leaderboard: [],
    participants: [],
  };

  const from = (table: string) => {
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    };
  };

  return { supabase: { from }, default: { from } };
});

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/game', gameRoutes);
  return app;
}

describe('Game basic wiring', () => {
  const app = createTestApp();

  it('state endpoint is protected', async () => {
    const res = await request(app).get('/api/game/state').expect(401);
    expect(res.body).toHaveProperty('error');
  });
});

