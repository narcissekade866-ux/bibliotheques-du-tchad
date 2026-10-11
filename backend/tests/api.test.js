const request = require('supertest');
const app = require('../src/app');
const { pool, cleanupTestData } = require('./setup');

afterAll(async () => {
  await cleanupTestData();
  await pool.end();
});

describe('GET /api/health', () => {
  test('returns ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /api/stats', () => {
  test('returns public statistics', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('bibliotheques_total');
    expect(res.body).toHaveProperty('par_type');
    expect(res.body).toHaveProperty('par_ville');
    expect(res.body).toHaveProperty('avis');
    expect(typeof res.body.bibliotheques_total).toBe('number');
    expect(Array.isArray(res.body.par_type)).toBe(true);
    expect(Array.isArray(res.body.par_ville)).toBe(true);
  });
});

describe('GET /api/bibliotheques', () => {
  test('returns a list of libraries', async () => {
    const res = await request(app).get('/api/bibliotheques');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('bibliotheques');
    expect(Array.isArray(res.body.bibliotheques)).toBe(true);
  });

  test('supports pagination', async () => {
    const res = await request(app).get('/api/bibliotheques?page=1&limit=5');
    expect(res.status).toBe(200);
    expect(res.body.bibliotheques.length).toBeLessThanOrEqual(5);
  });
});

describe('GET /api/villes', () => {
  test('returns available cities', async () => {
    const res = await request(app).get('/api/villes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/avis/bibliotheque/:id', () => {
  test('rejects invalid UUID', async () => {
    const res = await request(app).get('/api/avis/bibliotheque/invalid');
    expect(res.status).toBe(400);
  });

  test('returns empty avis for nonexistent library', async () => {
    const res = await request(app).get(
      '/api/avis/bibliotheque/00000000-0000-0000-0000-000000000000'
    );
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.avis).toEqual([]);
  });
});

describe('Error handling', () => {
  test('returns 404 for unknown route', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});
