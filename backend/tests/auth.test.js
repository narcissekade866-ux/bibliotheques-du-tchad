const request = require('supertest');
const app = require('../src/app');
const { pool, cleanupTestData, testEmail, createTestUser, generateAccessToken } = require('./setup');

afterAll(async () => {
  await cleanupTestData();
  await pool.end();
});

describe('POST /api/auth/register', () => {
  test('creates a new user and returns tokens', async () => {
    const email = testEmail('register');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Test Register', email, mot_de_passe: 'SecureP@ss1' });

    expect(res.status).toBe(201);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.refresh_token).toBeDefined();
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.role).toBe('visiteur');
    expect(res.body.user.mot_de_passe_hash).toBeUndefined();
  });

  test('rejects duplicate email', async () => {
    const email = testEmail('dup');
    await request(app)
      .post('/api/auth/register')
      .send({ nom: 'First', email, mot_de_passe: 'SecureP@ss1' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Second', email, mot_de_passe: 'SecureP@ss2' });

    expect(res.status).toBe(409);
  });

  test('rejects short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Test', email: testEmail('short'), mot_de_passe: '1234567' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Données invalides');
  });

  test('rejects common password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Test', email: testEmail('common'), mot_de_passe: 'password' });

    expect(res.status).toBe(400);
  });

  test('rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Test' });

    expect(res.status).toBe(400);
  });

  test('rejects invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Test', email: 'not-an-email', mot_de_passe: 'SecureP@ss1' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  let loginEmail;

  beforeAll(async () => {
    loginEmail = testEmail('login');
    await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Login User', email: loginEmail, mot_de_passe: 'SecureP@ss1' });
  });

  test('returns tokens with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: loginEmail, mot_de_passe: 'SecureP@ss1' });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.refresh_token).toBeDefined();
    expect(res.body.user.email).toBe(loginEmail);
  });

  test('returns generic error for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: loginEmail, mot_de_passe: 'WrongPass1' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Identifiants incorrects');
  });

  test('returns generic error for nonexistent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nope@nowhere.test', mot_de_passe: 'Whatever1' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Identifiants incorrects');
  });

  test('does not reveal if email exists or not', async () => {
    const realRes = await request(app)
      .post('/api/auth/login')
      .send({ email: loginEmail, mot_de_passe: 'WrongPass1' });
    const fakeRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'fake@fake.test', mot_de_passe: 'WrongPass1' });

    expect(realRes.body.message).toBe(fakeRes.body.message);
  });
});

describe('POST /api/auth/refresh', () => {
  test('rotates tokens correctly', async () => {
    const email = testEmail('refresh');
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Refresh User', email, mot_de_passe: 'SecureP@ss1' });

    const refreshToken = regRes.body.refresh_token;

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.refresh_token).toBeDefined();
    expect(res.body.refresh_token).not.toBe(refreshToken);
  });

  test('rejects reused refresh token (rotation)', async () => {
    const email = testEmail('reuse');
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Reuse User', email, mot_de_passe: 'SecureP@ss1' });

    const oldToken = regRes.body.refresh_token;
    await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: oldToken });

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: oldToken });

    expect(res.status).toBe(401);
  });

  test('rejects invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: 'totally-invalid-token' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  test('returns profile for authenticated user', async () => {
    const user = await createTestUser({ email: testEmail('me'), role: 'visiteur' });
    const token = generateAccessToken(user);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user.id);
    expect(res.body.email).toBe(user.email);
    expect(res.body.mot_de_passe_hash).toBeUndefined();
  });

  test('rejects request without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('rejects expired/invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.jwt.token');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  test('invalidates refresh token', async () => {
    const email = testEmail('logout');
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Logout User', email, mot_de_passe: 'SecureP@ss1' });

    const refreshToken = regRes.body.refresh_token;

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .send({ refresh_token: refreshToken });

    expect(logoutRes.status).toBe(200);

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: refreshToken });

    expect(refreshRes.status).toBe(401);
  });
});
