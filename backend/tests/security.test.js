const request = require('supertest');
const app = require('../src/app');
const { pool, cleanupTestData, testEmail, createTestUser, generateAccessToken } = require('./setup');

afterAll(async () => {
  await cleanupTestData();
  await pool.end();
});

describe('SQL injection protection', () => {
  test('login resists SQL injection in email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: "' OR 1=1 --", mot_de_passe: 'anything' });

    expect(res.status).toBe(400);
  });

  test('login resists SQL injection in password', async () => {
    const email = testEmail('sqli');
    await request(app)
      .post('/api/auth/register')
      .send({ nom: 'SQLi Test', email, mot_de_passe: 'SecureP@ss1' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, mot_de_passe: "' OR '1'='1" });

    expect(res.status).toBe(401);
  });

  test('register resists SQL injection in nom', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom: "Robert'; DROP TABLE utilisateur; --",
        email: testEmail('sqli2'),
        mot_de_passe: 'SecureP@ss1',
      });

    expect([201, 400]).toContain(res.status);

    const check = await pool.query("SELECT COUNT(*) FROM utilisateur");
    expect(parseInt(check.rows[0].count, 10)).toBeGreaterThan(0);
  });

  test('search resists SQL injection in query params', async () => {
    const res = await request(app)
      .get("/api/bibliotheques?q=' OR 1=1 --");

    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body.bibliotheques || res.body)).toBe(true);
    }
  });
});

describe('XSS protection', () => {
  test('register with XSS in nom does not execute script', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    const email = testEmail('xss');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: xssPayload, email, mot_de_passe: 'SecureP@ss1' });

    if (res.status === 201) {
      const token = res.body.access_token;
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.body.nom).toBe(xssPayload);
    }
  });

  test('security headers are set', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });
});

describe('UUID validation', () => {
  test('rejects malformed UUID in bibliotheque route', async () => {
    const res = await request(app).get('/api/bibliotheques/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Identifiant invalide');
  });

  test('rejects SQL injection via UUID param', async () => {
    const res = await request(app).get(
      "/api/bibliotheques/'; DROP TABLE bibliotheque; --"
    );
    expect(res.status).toBe(400);
  });

  test('accepts valid UUID format', async () => {
    const res = await request(app).get(
      '/api/bibliotheques/00000000-0000-0000-0000-000000000000'
    );
    expect([200, 404]).toContain(res.status);
  });
});

describe('Authentication enforcement', () => {
  test('admin routes reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  test('admin routes reject non-admin users', async () => {
    const user = await createTestUser({ email: testEmail('nonadmin'), role: 'visiteur' });
    const token = generateAccessToken(user);

    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  test('admin routes accept admin users', async () => {
    const admin = await createTestUser({ email: testEmail('admin'), role: 'administrateur' });
    const token = generateAccessToken(admin);

    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  test('image upload rejects non-admin', async () => {
    const user = await createTestUser({ email: testEmail('imgnonadm'), role: 'visiteur' });
    const token = generateAccessToken(user);

    const res = await request(app)
      .post('/api/images/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', Buffer.from('fake'), 'test.jpg');

    expect(res.status).toBe(403);
  });
});

describe('Input validation', () => {
  test('rejects malformed JSON body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"broken json');

    expect(res.status).toBe(400);
  });

  test('rejects oversized payload', async () => {
    const huge = 'x'.repeat(2 * 1024 * 1024);
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: huge, mot_de_passe: 'test' }));

    expect(res.status).toBe(413);
  });
});
