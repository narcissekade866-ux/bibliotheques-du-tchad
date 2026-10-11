const sharp = require('sharp');
const path = require('path');
const { pool, cleanupTestData } = require('./setup');

async function createTestImage(width, height, options = {}) {
  let pipeline = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 100, g: 150, b: 200 },
    },
  }).jpeg({ quality: 95 });

  if (options.exifOrientation) {
    pipeline = pipeline.withMetadata({ orientation: options.exifOrientation });
  }
  if (options.addGpsExif) {
    pipeline = pipeline.withMetadata({
      orientation: options.exifOrientation || 1,
    });
  }

  return pipeline.toBuffer();
}

let processImage;
beforeAll(async () => {
  delete require.cache[require.resolve('../src/scripts/import-kobo.js')];
  ({ processImage } = require('../src/scripts/import-kobo.js'));
});

afterAll(async () => {
  await cleanupTestData();
  await pool.end();
});

describe('Image processing with sharp', () => {
  test('large image is resized to max 1600px', async () => {
    const bigBuffer = await createTestImage(4000, 3000);
    const result = await processImage(bigBuffer);

    expect(result.error).toBeUndefined();
    expect(result.width).toBeLessThanOrEqual(1600);
    expect(result.height).toBeLessThanOrEqual(1600);
    expect(result.width).toBe(1600);
    expect(result.height).toBe(1200);
    expect(result.processedSize).toBeLessThan(result.originalSize);
  });

  test('small image is NOT enlarged (withoutEnlargement)', async () => {
    const smallBuffer = await createTestImage(800, 600);
    const result = await processImage(smallBuffer);

    expect(result.error).toBeUndefined();
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  test('portrait image with EXIF orientation 6 is auto-rotated', async () => {
    const portraitBuffer = await createTestImage(600, 800, { exifOrientation: 6 });
    const result = await processImage(portraitBuffer);

    expect(result.error).toBeUndefined();
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  test('EXIF metadata is stripped from output', async () => {
    const bufferWithMeta = await createTestImage(1000, 750, { exifOrientation: 3 });
    const result = await processImage(bufferWithMeta);

    expect(result.error).toBeUndefined();
    const outputMeta = await sharp(result.buffer).metadata();
    expect(outputMeta.orientation).toBeUndefined();
    expect(outputMeta.exif).toBeUndefined();
  });

  test('invalid MIME type is rejected', async () => {
    const textBuffer = Buffer.from('This is not an image');
    const result = await processImage(textBuffer);

    expect(result.error).toMatch(/invalid/);
  });

  test('output is always JPEG', async () => {
    const pngBuffer = await sharp({
      create: { width: 500, height: 500, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } },
    }).png().toBuffer();

    const result = await processImage(pngBuffer);
    expect(result.error).toBeUndefined();
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe('jpeg');
  });
});

describe('Photo added to existing fiche', () => {
  const testUuid = 'test-photo-add-uuid-0001';

  beforeAll(async () => {
    const res = await pool.query('SELECT id FROM bibliotheque WHERE kobo_uuid = $1', [testUuid]);
    if (res.rows.length > 0) {
      await pool.query('DELETE FROM image WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM enquete WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM besoins_partenariats WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM communication WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM infrastructure WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM activite WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM services WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM collection_catalogue WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM public_frequentation WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM pret_consultation WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM conditions_acces WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM horaires WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM localisation WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM bibliotheque WHERE id = $1', [res.rows[0].id]);
    }
  });

  afterAll(async () => {
    const res = await pool.query('SELECT id FROM bibliotheque WHERE kobo_uuid = $1', [testUuid]);
    if (res.rows.length > 0) {
      await pool.query('DELETE FROM image WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM enquete WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM besoins_partenariats WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM communication WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM infrastructure WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM activite WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM services WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM collection_catalogue WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM public_frequentation WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM pret_consultation WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM conditions_acces WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM horaires WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM localisation WHERE bibliotheque_id = $1', [res.rows[0].id]);
      await pool.query('DELETE FROM bibliotheque WHERE id = $1', [res.rows[0].id]);
    }
  });

  test('import adds photo to existing fiche without duplicate', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { importSubmission } = require('../src/scripts/import-kobo.js');

      const sub = {
        _uuid: testUuid,
        b1_nom_officiel: 'Test Photo Add',
        b3_type: 'publique',
        b6_fonctionnelle: 'oui',
        ville: 'ndjamena',
        c1_quartier: 'Test Quartier',
        c3_gps: '12.1 15.0 300 5',
        a1_nom_repondant: 'Test',
        a5_autorisation: 'oui',
        d1_jours_ouverture: 'lundi',
        e1_gratuit: 'oui',
        f1_lecture_sur_place: 'oui',
        k1_organise_activites: 'non',
        m2_besoin_travaux: 'non',
      };

      const result1 = await importSubmission(client, sub, null, false);
      expect(result1.status).toBe('imported');
      const bibId = result1.id;

      const imagesBefore = await client.query(
        'SELECT id FROM image WHERE bibliotheque_id = $1', [bibId]
      );
      expect(imagesBefore.rows.length).toBe(0);

      const testImage = await createTestImage(1000, 750);
      const fakeMediaFiles = new Map();
      fakeMediaFiles.set('test-photo.jpg', {
        getData: () => testImage,
        _entryPath: `attachments/xxx/${testUuid}/test-photo.jpg`,
      });

      sub.c3_photo_facade = 'test-photo.jpg';
      const result2 = await importSubmission(client, sub, fakeMediaFiles, false);
      expect(result2.status).toBe('photo_added');

      const imagesAfter = await client.query(
        'SELECT id FROM image WHERE bibliotheque_id = $1', [bibId]
      );
      expect(imagesAfter.rows.length).toBe(1);

      const result3 = await importSubmission(client, sub, fakeMediaFiles, false);
      expect(result3.status).toBe('existing');

      const imagesFinal = await client.query(
        'SELECT id FROM image WHERE bibliotheque_id = $1', [bibId]
      );
      expect(imagesFinal.rows.length).toBe(1);

      await client.query('COMMIT');
    } finally {
      client.release();
    }
  });
});
