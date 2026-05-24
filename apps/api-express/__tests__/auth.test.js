import request from 'supertest';
import { createApp } from '../src/app.js';

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
});
