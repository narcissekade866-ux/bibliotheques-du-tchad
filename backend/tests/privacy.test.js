const request = require('supertest');
const app = require('../src/app');
const { pool, cleanupTestData, createTestUser, generateAccessToken } = require('./setup');

const PERSONAL_FIELDS = [
  'enquete_repondant_nom',
  'enquete_repondant_contact',
  'consentement_utilisation',
  'cree_par_id',
  'valide_par_id',
];

let testBiblioId;

beforeAll(async () => {
  const result = await pool.query(
    `INSERT INTO bibliotheque
       (nom_officiel, type, statut_fonctionnement, statut_validation,
        enquete_repondant_nom, enquete_repondant_contact, consentement_utilisation)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      'Test Privacy Biblio',
      'publique',
      'fonctionnel',
      'valide',
      'Nom Confidentiel',
      '+235 99 99 99 99',
      true,
    ]
  );
  testBiblioId = result.rows[0].id;
});

afterAll(async () => {
  if (testBiblioId) {
    await pool.query('DELETE FROM localisation WHERE bibliotheque_id = $1', [testBiblioId]);
    await pool.query('DELETE FROM bibliotheque WHERE id = $1', [testBiblioId]);
  }
  await cleanupTestData();
  await pool.end();
});

function assertNoPersonalFields(obj) {
  for (const field of PERSONAL_FIELDS) {
    expect(obj).not.toHaveProperty(field);
  }
}

describe('Public API must not expose personal fields', () => {
  test('GET /api/bibliotheques list excludes personal fields', async () => {
    const res = await request(app).get('/api/bibliotheques');
    expect(res.status).toBe(200);
    for (const biblio of res.body.bibliotheques) {
      assertNoPersonalFields(biblio);
    }
  });

  test('GET /api/bibliotheques/:id detail excludes personal fields for anonymous user', async () => {
    const res = await request(app).get(`/api/bibliotheques/${testBiblioId}`);
    expect(res.status).toBe(200);
    assertNoPersonalFields(res.body);
  });

  test('GET /api/bibliotheques/:id detail excludes personal fields for authenticated non-admin', async () => {
    const user = await createTestUser({ role: 'visiteur' });
    const token = generateAccessToken(user);
    const res = await request(app)
      .get(`/api/bibliotheques/${testBiblioId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    assertNoPersonalFields(res.body);
  });

  test('GET /api/bibliotheques/:id detail INCLUDES personal fields for admin', async () => {
    const admin = await createTestUser({ role: 'administrateur' });
    const token = generateAccessToken(admin);
    const res = await request(app)
      .get(`/api/bibliotheques/${testBiblioId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('enquete_repondant_nom');
    expect(res.body).toHaveProperty('enquete_repondant_contact');
    expect(res.body).toHaveProperty('consentement_utilisation');
  });
});
