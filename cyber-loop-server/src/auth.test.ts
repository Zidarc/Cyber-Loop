/**
 * Auth integration tests: valid login, invalid credentials, deactivated accounts,
 * multiple logins invalidating prior tokens.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';

const BCRYPT_COST = 12;
const tokenStore: Record<number, string | null> = { 1: null, 2: null };
const participants = [
  {
    id: 1,
    username: 'testteam',
    password_hash: bcrypt.hashSync('password123', BCRYPT_COST),
    team_name: 'Test Team',
    is_active: 1,
    get active_token_hash() {
      return tokenStore[1];
    },
  },
  {
    id: 2,
    username: 'inactive',
    password_hash: bcrypt.hashSync('password123', BCRYPT_COST),
    team_name: 'Inactive Team',
    is_active: 0,
    get active_token_hash() {
      return tokenStore[2];
    },
  },
];

vi.mock('./config/supabase', () => {
  const from = (table: string) => {
    if (table !== 'participants') {
      return {
        select: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: new Error('unknown table') }) }),
        }),
        update: () => ({ eq: () => Promise.resolve({ error: new Error('unknown') }) }),
      };
    }
    return {
      select: (cols: string) => ({
        eq: (field: string, value: unknown) => ({
          maybeSingle: () => {
            if (field === 'username') {
              const p = participants.find((r) => r.username === value);
              if (!p) return Promise.resolve({ data: null, error: null });
              return Promise.resolve({
                data: {
                  id: p.id,
                  username: p.username,
                  password_hash: p.password_hash,
                  team_name: p.team_name,
                  is_active: p.is_active,
                  active_token_hash: tokenStore[p.id],
                },
                error: null,
              });
            }
            if (field === 'id') {
              const p = participants.find((r) => r.id === value);
              if (!p) return Promise.resolve({ data: null, error: null });
              const colsList = cols.split(',').map((c) => c.trim());
              const data: Record<string, unknown> = {};
              if (colsList.includes('active_token_hash')) data.active_token_hash = tokenStore[p.id];
              if (colsList.includes('is_active')) data.is_active = p.is_active;
              return Promise.resolve({ data, error: null });
            }
            return Promise.resolve({ data: null, error: null });
          },
        }),
      }),
      update: (updates: { active_token_hash?: string | null }) => ({
        eq: (field: string, id: number) => {
          if (field === 'id' && (id === 1 || id === 2)) {
            tokenStore[id] = updates.active_token_hash ?? null;
          }
          return Promise.resolve({ error: null });
        },
      }),
    };
  };
  return { supabase: { from }, default: { from } };
});

import authRoutes from './routes/auth.routes';
import { verifyToken } from './middleware/auth.middleware';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);

  app.get('/api/protected', verifyToken, (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}

describe('Auth', () => {
  const app = createTestApp();

  beforeEach(() => {
    tokenStore[1] = null;
    tokenStore[2] = null;
  });

  it('valid login returns token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testteam', password: 'password123' })
      .expect(200);

    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(0);
  });

  it('invalid credentials returns generic error', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testteam', password: 'wrongpassword' })
      .expect(401);

    expect(res.body).toEqual({ error: 'Invalid credentials' });
  });

  it('nonexistent user returns generic error', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'password123' })
      .expect(401);

    expect(res.body).toEqual({ error: 'Invalid credentials' });
  });

  it('deactivated account is rejected', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'inactive', password: 'password123' })
      .expect(401);

    expect(res.body).toEqual({ error: 'Invalid credentials' });
  });

  it('multiple logins invalidate prior tokens', async () => {
    const login1 = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testteam', password: 'password123' })
      .expect(200);
    const token1 = login1.body.token;

    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testteam', password: 'password123' })
      .expect(200);
    const token2 = login2.body.token;

    expect(token1).not.toBe(token2);

    await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${token1}`)
      .expect(403);

    await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${token2}`)
      .expect(200);
  });

  it('logout clears session', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testteam', password: 'password123' })
      .expect(200);
    const token = loginRes.body.token;

    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('rejects too short username', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ username: 'ab', password: 'password123' })
      .expect(400);
  });

  it('rejects too short password', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ username: 'testteam', password: '12345' })
      .expect(400);
  });
});
