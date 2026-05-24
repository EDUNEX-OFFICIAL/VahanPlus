import request from 'supertest';
import { createApp } from '../src/app.js';

describe('health routes', () => {
  const app = createApp();

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('api-express');
  });
});
