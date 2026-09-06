import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('API health', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('rejects mutating requests from a foreign Origin', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: 'a@b.c', password: 'x' });
    expect(res.status).toBe(403);
  });
});
