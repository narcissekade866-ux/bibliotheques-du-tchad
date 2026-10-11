const path = require('path');
const { pool, cleanupTestData } = require('./setup');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

async function cleanImportedTestData() {
  const uuids = [
    'aaaaaaaa-bbbb-cccc-dddd-111111111111',
    'aaaaaaaa-bbbb-cccc-dddd-222222222222',
    'test-idem-uuid-1111',
    'test-idem-uuid-2222',
    'test-idem-uuid-3333',
  ];
  for (const uuid of uuids) {
    const res = await pool.query('SELECT id FROM bibliotheque WHERE kobo_uuid = $1', [uuid]);
    if (res.rows.length > 0) {
      const id = res.rows[0].id;
      await pool.query('DELETE FROM enquete WHERE bibliotheque_id = $1', [id]);
      await pool.query('DELETE FROM besoins_partenariats WHERE bibliotheque_id = $1', [id]);
      await pool.query('DELETE FROM communication WHERE bibliotheque_id = $1', [id]);
      await pool.query('DELETE FROM infrastructure WHERE bibliotheque_id = $1', [id]);
      await pool.query('DELETE FROM activite WHERE bibliotheque_id = $1', [id]);
      await pool.query('DELETE FROM services WHERE bibliotheque_id = $1', [id]);
      await pool.query('DELETE FROM collection_catalogue WHERE bibliotheque_id = $1', [id]);
      await pool.query('DELETE FROM public_frequentation WHERE bibliotheque_id = $1', [id]);
      await pool.query('DELETE FROM pret_consultation WHERE bibliotheque_id = $1', [id]);
      await pool.query('DELETE FROM conditions_acces WHERE bibliotheque_id = $1', [id]);
      await pool.query('DELETE FROM horaires WHERE bibliotheque_id = $1', [id]);
      await pool.query('DELETE FROM image WHERE bibliotheque_id = $1', [id]);
      await pool.query('DELETE FROM localisation WHERE bibliotheque_id = $1', [id]);
      await pool.query('DELETE FROM bibliotheque WHERE id = $1', [id]);
    }
  }
}

beforeAll(async () => {
  await cleanImportedTestData();
});

afterAll(async () => {
  await cleanImportedTestData();
  await cleanupTestData();
  await pool.end();
});

describe('JSON import with idempotence', () => {
  const testSubmissions = [
    {
      _uuid: 'test-idem-uuid-1111',
      bibliotheque_id: 'IDEM001',
      b1_nom_officiel: 'Biblio Idempotent Test 1',
      b3_type: 'publique',
      b6_fonctionnelle: 'oui',
      ville: 'ndjamena',
      c1_quartier: 'Quartier Idem',
      c3_gps: '12.1 15.0 300 5',
      a1_nom_repondant: 'Test Person',
      a5_autorisation: 'oui',
      d1_jours_ouverture: 'lundi mardi',
      e1_gratuit: 'oui',
      f1_lecture_sur_place: 'oui',
      k1_organise_activites: 'non',
      m2_besoin_travaux: 'non',
    },
    {
      _uuid: 'test-idem-uuid-2222',
      bibliotheque_id: 'IDEM002',
      b1_nom_officiel: 'Biblio Idempotent Test 2',
      b3_type: 'associative',
      b6_fonctionnelle: 'partiellement',
      ville: 'ndjamena',
      c1_quartier: 'Quartier Idem 2',
      c3_gps: '12.2 15.1 310 8',
      a1_nom_repondant: 'Test Person 2',
      a5_autorisation: 'non',
      d1_jours_ouverture: 'lundi',
      e1_gratuit: 'non',
      f1_lecture_sur_place: 'oui',
      k1_organise_activites: 'non',
      m2_besoin_travaux: 'oui',
    },
  ];

  test('first import creates records', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const sub of testSubmissions) {
        const { importSubmission, getField } = requireImport();
        const result = await importSubmission(client, sub, null, false);
        expect(result).toBeTruthy();
        expect(result.status).toBe('imported');
        expect(result.id).toBeTruthy();
      }

      await client.query('COMMIT');
    } finally {
      client.release();
    }

    const count = await pool.query(
      "SELECT COUNT(*) FROM bibliotheque WHERE kobo_uuid LIKE 'test-idem-uuid-%'"
    );
    expect(parseInt(count.rows[0].count, 10)).toBe(2);
  });

  test('second import of same data returns existing (no duplicates)', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const sub of testSubmissions) {
        const { importSubmission } = requireImport();
        const result = await importSubmission(client, sub, null, false);
        expect(result.status).toBe('existing');
      }

      await client.query('COMMIT');
    } finally {
      client.release();
    }

    const count = await pool.query(
      "SELECT COUNT(*) FROM bibliotheque WHERE kobo_uuid LIKE 'test-idem-uuid-%'"
    );
    expect(parseInt(count.rows[0].count, 10)).toBe(2);
  });

  test('import with one extra submission adds exactly one', async () => {
    const extraSub = {
      _uuid: 'test-idem-uuid-3333',
      bibliotheque_id: 'IDEM003',
      b1_nom_officiel: 'Biblio Idempotent Test 3',
      b3_type: 'scolaire',
      b6_fonctionnelle: 'oui',
      ville: 'ndjamena',
      c1_quartier: 'Quartier Idem 3',
      c3_gps: '12.3 15.2 320 4',
      a1_nom_repondant: 'Test Person 3',
      a5_autorisation: 'oui',
      d1_jours_ouverture: 'lundi mardi mercredi',
      e1_gratuit: 'oui',
      f1_lecture_sur_place: 'oui',
      k1_organise_activites: 'non',
      m2_besoin_travaux: 'non',
    };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const sub of [...testSubmissions, extraSub]) {
        const { importSubmission } = requireImport();
        const result = await importSubmission(client, sub, null, false);
        if (sub._uuid === 'test-idem-uuid-3333') {
          expect(result.status).toBe('imported');
        } else {
          expect(result.status).toBe('existing');
        }
      }

      await client.query('COMMIT');
    } finally {
      client.release();
    }

    const count = await pool.query(
      "SELECT COUNT(*) FROM bibliotheque WHERE kobo_uuid LIKE 'test-idem-uuid-%'"
    );
    expect(parseInt(count.rows[0].count, 10)).toBe(3);
  });

  test('partiellement_fonctionnel is stored correctly', async () => {
    const result = await pool.query(
      "SELECT statut_fonctionnement FROM bibliotheque WHERE kobo_uuid = 'test-idem-uuid-2222'"
    );
    expect(result.rows[0].statut_fonctionnement).toBe('partiellement_fonctionnel');
  });

  test('kobo_uuid is stored', async () => {
    const result = await pool.query(
      "SELECT kobo_uuid FROM bibliotheque WHERE kobo_uuid = 'test-idem-uuid-1111'"
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].kobo_uuid).toBe('test-idem-uuid-1111');
  });
});

describe('XLSX label translation', () => {
  test('buildXlsFormMappings reads survey and choices', () => {
    const originalPath = process.env.XLSFORM_PATH;
    const { buildXlsFormMappings } = requireImportForXlsx();
    const { surveyFields, choiceMaps } = buildXlsFormMappings();
    expect(surveyFields.length).toBeGreaterThan(10);
    expect(Object.keys(choiceMaps).length).toBeGreaterThan(5);
    expect(choiceMaps['oui_non_partiel']['Oui']).toBe('oui');
    expect(choiceMaps['oui_non_partiel']['Partiellement']).toBe('partiellement');
  });
});

function requireImport() {
  delete require.cache[require.resolve('../src/scripts/import-kobo.js')];
  const mod = require('../src/scripts/import-kobo.js');
  return mod;
}

function requireImportForXlsx() {
  delete require.cache[require.resolve('../src/scripts/import-kobo.js')];
  const mod = require('../src/scripts/import-kobo.js');
  return mod;
}
