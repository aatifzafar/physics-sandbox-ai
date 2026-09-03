import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('API Endpoints', () => {
  const app = createApp();

  describe('GET /api/health', () => {
    it('should return 200 with health status', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('PhysicsAI backend is running');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('POST /api/simulations/generate validation', () => {
    it('should return 400 when prompt is empty', async () => {
      const res = await request(app)
        .post('/api/simulations/generate')
        .send({ prompt: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 when request body is missing prompt', async () => {
      const res = await request(app)
        .post('/api/simulations/generate')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Unknown routes', () => {
    it('should return 404 for unknown endpoints', async () => {
      const res = await request(app).get('/api/unknown-endpoint');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
