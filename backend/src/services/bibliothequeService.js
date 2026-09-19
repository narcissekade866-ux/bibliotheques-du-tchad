const { pool } = require('../config/db');

async function create(data, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO bibliotheque
        (nom_officiel, nom_alternatif, type, annee_creation,
         responsable_institution, statut_fonctionnement, raison_non_fonctionnel,
         enquete_repondant_nom, enquete_repondant_fonction, enquete_repondant_contact,
         consentement_utilisation, statut_validation, cree_par_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'en_attente',$12)
       RETURNING *`,
      [
        data.nom_officiel,
        data.nom_alternatif || null,
        data.type || null,
        data.annee_creation || null,
        data.responsable_institution || null,
        data.statut_fonctionnement || 'fonctionnel',
        data.raison_non_fonctionnel || null,
        data.enquete_repondant_nom || null,
        data.enquete_repondant_fonction || null,
        data.enquete_repondant_contact || null,
        data.consentement_utilisation || false,
        userId,
      ]
    );

    const biblio = result.rows[0];

    if (data.localisation) {
      const loc = data.localisation;
      await client.query(
        `INSERT INTO localisation
          (bibliotheque_id, ville_id, subdivision_id, quartier,
           point_repere, latitude, longitude, precision_gps_m)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          biblio.id,
          loc.ville_id,
          loc.subdivision_id || null,
          loc.quartier || null,
          loc.point_repere || null,
          loc.latitude || null,
          loc.longitude || null,
          loc.precision_gps_m || null,
        ]
      );
    }

    await client.query('COMMIT');
    return { bibliotheque: biblio };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getById(id, userRole) {
  const biblio = await pool.query(
    'SELECT * FROM bibliotheque WHERE id = $1',
    [id]
  );

  if (biblio.rows.length === 0) {
    return null;
  }

  const row = biblio.rows[0];

  if (
    row.statut_validation !== 'valide' &&
    userRole !== 'administrateur' &&
    userRole !== '_owner'
  ) {
    return null;
  }

  const sections = [
    { key: 'localisation', query: `SELECT l.*, v.nom AS ville_nom, s.nom AS subdivision_nom FROM localisation l JOIN ville v ON v.id = l.ville_id LEFT JOIN subdivision_administrative s ON s.id = l.subdivision_id WHERE l.bibliotheque_id = $1` },
    { key: 'horaires', query: 'SELECT * FROM horaires WHERE bibliotheque_id = $1 ORDER BY ARRAY_POSITION(ARRAY[\'lundi\',\'mardi\',\'mercredi\',\'jeudi\',\'vendredi\',\'samedi\',\'dimanche\']::jour_semaine[], jour)', multi: true },
    { key: 'conditions_acces', query: 'SELECT * FROM conditions_acces WHERE bibliotheque_id = $1' },
    { key: 'pret_consultation', query: 'SELECT * FROM pret_consultation WHERE bibliotheque_id = $1' },
    { key: 'public_frequentation', query: 'SELECT * FROM public_frequentation WHERE bibliotheque_id = $1' },
    { key: 'collection_catalogue', query: 'SELECT * FROM collection_catalogue WHERE bibliotheque_id = $1' },
    { key: 'services', query: 'SELECT * FROM services WHERE bibliotheque_id = $1' },
    { key: 'activites', query: 'SELECT * FROM activite WHERE bibliotheque_id = $1', multi: true },
    { key: 'infrastructure', query: 'SELECT * FROM infrastructure WHERE bibliotheque_id = $1' },
    { key: 'communication', query: 'SELECT * FROM communication WHERE bibliotheque_id = $1' },
    { key: 'besoins_partenariats', query: 'SELECT * FROM besoins_partenariats WHERE bibliotheque_id = $1' },
    { key: 'images', query: 'SELECT * FROM image WHERE bibliotheque_id = $1 ORDER BY created_at', multi: true },
  ];

  const results = await Promise.all(
    sections.map((s) => pool.query(s.query, [id]))
  );

  const detail = { ...row };
  sections.forEach((s, i) => {
    detail[s.key] = s.multi ? results[i].rows : (results[i].rows[0] || null);
  });

  return detail;
}

async function list(filters) {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (filters.statut_validation) {
    conditions.push(`b.statut_validation = $${paramIndex++}`);
    params.push(filters.statut_validation);
  } else {
    conditions.push(`b.statut_validation = $${paramIndex++}`);
    params.push('valide');
  }

  if (filters.ville_id) {
    conditions.push(`l.ville_id = $${paramIndex++}`);
    params.push(filters.ville_id);
  }

  if (filters.type) {
    conditions.push(`b.type = $${paramIndex++}`);
    params.push(filters.type);
  }

  if (filters.q) {
    conditions.push(
      `(b.nom_officiel ILIKE $${paramIndex} OR b.nom_alternatif ILIKE $${paramIndex} OR l.quartier ILIKE $${paramIndex})`
    );
    params.push(`%${filters.q}%`);
    paramIndex++;
  }

  const hasGeo = filters.lat != null && filters.lng != null;
  if (hasGeo) {
    conditions.push(
      `ST_DWithin(l.geom, ST_SetSRID(ST_MakePoint($${paramIndex}, $${paramIndex + 1}), 4326)::geography, $${paramIndex + 2})`
    );
    params.push(filters.lng, filters.lat, filters.rayon);
    paramIndex += 3;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const distanceSelect = hasGeo
    ? `, ST_Distance(l.geom, ST_SetSRID(ST_MakePoint($${paramIndex}, $${paramIndex + 1}), 4326)::geography) AS distance_m`
    : '';
  const distanceParams = hasGeo ? [filters.lng, filters.lat] : [];
  if (hasGeo) paramIndex += 2;
  const orderBy = hasGeo ? 'ORDER BY distance_m ASC' : 'ORDER BY b.created_at DESC';

  const offset = (filters.page - 1) * filters.limit;

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM bibliotheque b
     LEFT JOIN localisation l ON l.bibliotheque_id = b.id
     ${where}`,
    params
  );

  const total = parseInt(countResult.rows[0].count, 10);

  const result = await pool.query(
    `SELECT b.*, v.nom AS ville_nom, l.quartier, l.latitude, l.longitude${distanceSelect}
     FROM bibliotheque b
     LEFT JOIN localisation l ON l.bibliotheque_id = b.id
     LEFT JOIN ville v ON v.id = l.ville_id
     ${where}
     ${orderBy}
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, ...distanceParams, filters.limit, offset]
  );

  return {
    bibliotheques: result.rows,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.ceil(total / filters.limit),
    },
  };
}

async function update(id, data, userId) {
  const existing = await pool.query(
    'SELECT id, cree_par_id, statut_validation FROM bibliotheque WHERE id = $1',
    [id]
  );

  if (existing.rows.length === 0) {
    return { error: 'Bibliothèque introuvable', status: 404 };
  }

  const fields = [];
  const values = [];
  let paramIndex = 1;

  const updatableFields = [
    'nom_officiel', 'nom_alternatif', 'type', 'annee_creation',
    'responsable_institution', 'statut_fonctionnement', 'raison_non_fonctionnel',
    'enquete_repondant_nom', 'enquete_repondant_fonction', 'enquete_repondant_contact',
    'consentement_utilisation',
  ];

  for (const field of updatableFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${paramIndex++}`);
      values.push(data[field]);
    }
  }

  fields.push(`statut_validation = $${paramIndex++}`);
  values.push('en_attente');

  values.push(id);

  const result = await pool.query(
    `UPDATE bibliotheque SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  if (data.localisation) {
    const loc = data.localisation;
    await pool.query(
      `INSERT INTO localisation
        (bibliotheque_id, ville_id, subdivision_id, quartier,
         point_repere, latitude, longitude, precision_gps_m)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (bibliotheque_id) DO UPDATE SET
         ville_id = EXCLUDED.ville_id,
         subdivision_id = EXCLUDED.subdivision_id,
         quartier = EXCLUDED.quartier,
         point_repere = EXCLUDED.point_repere,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         precision_gps_m = EXCLUDED.precision_gps_m`,
      [
        id,
        loc.ville_id,
        loc.subdivision_id || null,
        loc.quartier || null,
        loc.point_repere || null,
        loc.latitude || null,
        loc.longitude || null,
        loc.precision_gps_m || null,
      ]
    );
  }

  return { bibliotheque: result.rows[0] };
}

async function validateBibliotheque(id, action, motif, adminId) {
  const existing = await pool.query(
    'SELECT id, statut_validation FROM bibliotheque WHERE id = $1',
    [id]
  );

  if (existing.rows.length === 0) {
    return { error: 'Bibliothèque introuvable', status: 404 };
  }

  const newStatut = action === 'valider' ? 'valide' : 'rejete';

  const result = await pool.query(
    `UPDATE bibliotheque
     SET statut_validation = $1, valide_par_id = $2
     WHERE id = $3
     RETURNING *`,
    [newStatut, adminId, id]
  );

  if (action === 'rejeter' && motif) {
    await pool.query(
      `INSERT INTO historique_modification
        (bibliotheque_id, champ_modifie, ancienne_valeur, nouvelle_valeur, modifie_par_id, statut)
       VALUES ($1, 'statut_validation', $2, $3, $4, 'approuve')`,
      [id, existing.rows[0].statut_validation, `rejete: ${motif}`, adminId]
    );
  }

  return { bibliotheque: result.rows[0] };
}

module.exports = { create, getById, list, update, validateBibliotheque };
