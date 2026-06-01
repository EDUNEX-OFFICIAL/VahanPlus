import request from 'supertest';
import jwt from 'jsonwebtoken';
import { SESSION_COOKIE_NAME } from '@vahanplus/contracts';
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';

describe('auth routes', () => {
  const app = createApp();

  it('POST /auth/login rejects empty body', async () => {
    const res = await request(app).post('/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('GET /auth/me requires token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /auth/me accepts session cookie', async () => {
    const token = jwt.sign({ sub: 'user-1', username: 'tester' }, config.jwtSecret, {
      expiresIn: '1h',
    });
    const res = await request(app)
      .get('/auth/me')
      .set('Cookie', [`${SESSION_COOKIE_NAME}=${token}`]);
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: 'user-1', username: 'tester' });
  });

  it('POST /auth/logout clears session cookie', async () => {
    const res = await request(app).post('/auth/logout');
    expect(res.status).toBe(204);
    const setCookie = res.headers['set-cookie'];
    expect(setCookie?.some((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))).toBe(true);
  });
});
