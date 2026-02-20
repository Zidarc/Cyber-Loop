/**
 * Auth integration tests: valid login, invalid credentials, deactivated accounts,
 * multiple logins invalidating prior tokens.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
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
