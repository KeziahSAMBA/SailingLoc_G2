import { jest, describe, it, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';

const mockFindMany = jest.fn().mockResolvedValue([]);
jest.unstable_mockModule('../src/config/db.js', () => ({
  default: { boat: { findMany: mockFindMany } },
}));

const { default: boatRoutes } = await import('../src/routes/boatRoutes.js');

const app = express();
app.use(express.json());
app.use('/api/boats', boatRoutes);

describe('Boat routes', () => {
  it('should return 200 on GET /api/boats', async () => {
    const response = await request(app).get('/api/boats');
    expect(response.status).toBe(200);
  });
});
