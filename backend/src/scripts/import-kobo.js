#!/usr/bin/env node

/**
 * Import KoboToolbox data into the database.
 *
 * Usage:
 *   node src/scripts/import-kobo.js <path-to-kobo-export.json>
 *   node src/scripts/import-kobo.js <path-to-kobo-export.zip>
 *
 * Accepts either a JSON file (array of submissions) or a KoboToolbox ZIP
 * export (JSON + media attachments). When a ZIP is provided, facade photos
 * (c3_photo_facade) are imported into backend/uploads/ and linked to the
 * bibliotheque record.
 *
 * Compatible with both XLSForm v1 (single-value fields) and v2
 * (select_multiple for a2_fonction, b3_type, b6_raison, f4_suivi_emprunts,
 * g5_registre_outil, i1_catalogue_format, k3_frequence).
 */

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const AdmZip = require('adm-zip');
const { pool } = require('../config/db');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const JOUR_MAP = {
  lundi: 'lundi', mardi: 'mardi', mercredi: 'mercredi',
  jeudi: 'jeudi', vendredi: 'vendredi', samedi: 'samedi', dimanche: 'dimanche',
};

const TYPE_MAP = {
  publique: 'publique', universitaire: 'universitaire', scolaire: 'scolaire',
  specialisee: 'specialisee', communautaire: 'communautaire', privee: 'privee',
  associative: 'associative', autre: 'autre',
};

const FONCTIONNEL_MAP = {
  oui: 'fonctionnel', non: 'non_fonctionnel', partiel: 'temporairement_ferme',
};

const ALLOWED_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// --- Helpers ---

function splitMultiple(val) {
  if (!val) return null;
  const parts = String(val).split(/\s+/).filter(Boolean);
  return parts.length > 0 ? parts : null;
}

function splitMultipleOrSingle(val) {
  if (!val) return null;
  const parts = String(val).split(/\s+/).filter(Boolean);
  return parts.length > 0 ? parts : null;
}

function toInt(val) {
  if (val === undefined || val === null || val === '') return null;
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? null : n;
}

function toDecimal(val) {
  if (val === undefined || val === null || val === '') return null;
  const n = parseFloat(val);
  return Number.isNaN(n) ? null : n;
}

function toBool(val) {
  if (val === undefined || val === null) return null;
  return val === 'oui' || val === true;
}

function toOuiNonPartiel(val) {
  if (!val) return null;
  if (['oui', 'non', 'partiel'].includes(val)) return val;
  return null;
}

function toOuiNonParfois(val) {
  if (!val) return null;
  if (['oui', 'non', 'parfois'].includes(val)) return val;
  return null;
}

function parseGeopoint(gps) {
  if (!gps) return { lat: null, lng: null, precision: null };
  const parts = String(gps).split(/\s+/);
  return {
    lat: toDecimal(parts[0]),
    lng: toDecimal(parts[1]),
    precision: toDecimal(parts[3]),
  };
}

function appendAutre(arr, autreVal) {
  if (!autreVal) return arr;
  const result = arr ? [...arr] : [];
  result.push(autreVal);
  return result.length > 0 ? result : null;
}

function resolveAutre(val, autreVal) {
  if (val === 'autre' && autreVal) return autreVal;
  return val || null;
}

const ALL_GROUPS = [
  '', 'group_repondant/', 'group_bibliotheque/', 'group_localisation/',
  'group_horaires/', 'group_acces/', 'group_pret/', 'group_frequentation/',
  'group_collections/', 'group_catalogue/', 'group_services/',
  'group_activites/', 'group_infrastructure/', 'group_communication/',
  'group_besoins/',
];

function getField(row, ...keys) {
  for (const key of keys) {
    for (const prefix of ALL_GROUPS) {
      const full = `${prefix}${key}`;
      if (row[full] !== undefined && row[full] !== null && row[full] !== '') {
        return row[full];
      }
    }
  }
  return undefined;
}

// --- ZIP handling ---

function loadFromZip(zipPath) {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  let jsonData = null;
  const mediaFiles = new Map();

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const name = path.basename(entry.entryName);
    const ext = path.extname(name).toLowerCase();

    if (ext === '.json' && !jsonData) {
      const raw = entry.getData().toString('utf-8');
      jsonData = JSON.parse(raw);
    } else if (ALLOWED_IMAGE_EXTS.has(ext)) {
      mediaFiles.set(name, entry);
    }
  }

  if (!jsonData) {
    throw new Error('No JSON file found in ZIP archive');
  }

  return { jsonData, mediaFiles };
}

function findAttachment(row, mediaFiles) {
  const photoField = getField(row, 'c3_photo_facade');
  if (!photoField) return null;

  const photoName = path.basename(String(photoField));

  if (mediaFiles.has(photoName)) return { name: photoName, entry: mediaFiles.get(photoName) };

  const attachments = row._attachments || [];
  for (const att of attachments) {
    const attName = path.basename(att.filename || att.download_url || '');
    if (attName && mediaFiles.has(attName)) {
      return { name: attName, entry: mediaFiles.get(attName) };
    }
  }

  for (const [name, entry] of mediaFiles) {
    if (name.includes(photoName) || photoName.includes(name)) {
      return { name, entry };
    }
  }

  return null;
}

async function importPhoto(client, bibId, attachment) {
  if (!attachment) return;

  const ext = path.extname(attachment.name).toLowerCase() || '.jpg';
  const newName = `${crypto.randomUUID()}${ext}`;
  const destPath = path.join(UPLOADS_DIR, newName);

  const buffer = attachment.entry.getData();

  const { fileTypeFromBuffer } = await import('file-type');
  const detected = await fileTypeFromBuffer(buffer);
  const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!detected || !allowedMimes.has(detected.mime)) {
    console.warn(`    SKIP photo: invalid MIME (${detected?.mime || 'unknown'}) for ${attachment.name}`);
    return;
  }

  fs.writeFileSync(destPath, buffer);

  const url = `/uploads/${newName}`;
  await client.query(
    `INSERT INTO image (bibliotheque_id, type, url) VALUES ($1, 'photo', $2)`,
    [bibId, url]
  );

  return url;
}

// --- DB resolvers ---

async function resolveVille(client, villeNom, precisezVille) {
  const nomRecherche = villeNom === 'autre' ? (precisezVille || villeNom) : villeNom;
  const normalisedNom = nomRecherche === 'ndjamena' ? "N'Djaména" : nomRecherche;

  const existing = await client.query(
    `SELECT id FROM ville WHERE LOWER(nom) = LOWER($1)`,
    [normalisedNom]
  );

  if (existing.rows.length > 0) return existing.rows[0].id;

  const inserted = await client.query(
    `INSERT INTO ville (nom) VALUES ($1) RETURNING id`,
    [normalisedNom]
  );
  return inserted.rows[0].id;
}

async function resolveSubdivision(client, villeId, arrondissement, autre) {
  if (!arrondissement || arrondissement === 'autre') {
    if (!autre) return null;
    const existing = await client.query(
      `SELECT id FROM subdivision_administrative WHERE ville_id = $1 AND LOWER(nom) = LOWER($2)`,
      [villeId, autre]
    );
    if (existing.rows.length > 0) return existing.rows[0].id;
    const inserted = await client.query(
      `INSERT INTO subdivision_administrative (ville_id, nom) VALUES ($1, $2) RETURNING id`,
      [villeId, autre]
    );
    return inserted.rows[0].id;
  }

  const existing = await client.query(
    `SELECT id FROM subdivision_administrative WHERE ville_id = $1 AND LOWER(nom) LIKE $2`,
    [villeId, `%${arrondissement.replace(/_/g, ' ')}%`]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;
  return null;
}

// --- Main import ---

async function importSubmission(client, row, mediaFiles) {
  const biblioId = getField(row, 'bibliotheque_id');
  const nomOfficiel = getField(row, 'b1_nom_officiel');
  if (!nomOfficiel) {
    console.warn(`  SKIP: missing nom_officiel (bibliotheque_id: ${biblioId})`);
    return null;
  }

  // B3 type: select_multiple in v2, take first valid enum value
  const typeRaw = getField(row, 'b3_type');
  const typeValues = splitMultiple(typeRaw);
  let typeMapped = null;
  if (typeValues) {
    for (const t of typeValues) {
      if (TYPE_MAP[t]) { typeMapped = TYPE_MAP[t]; break; }
    }
  }

  const fonctionnel = getField(row, 'b6_fonctionnelle');
  const statutFonctionnement = fonctionnel ? (FONCTIONNEL_MAP[fonctionnel] || 'fonctionnel') : 'fonctionnel';

  // B6 raison: select_multiple in v2
  const raisonValues = splitMultiple(getField(row, 'b6_raison'));
  const raisonAutre = getField(row, 'b6_raison_autre');
  const raisonAll = appendAutre(raisonValues, raisonAutre);
  const raison = raisonAll ? raisonAll.join(', ') : null;

  const nomAlternatif = getField(row, 'b2_autre_nom') === 'oui'
    ? getField(row, 'b2_autre_nom_precision')
    : null;

  // A2 fonction: select_multiple in v2
  const fonctionValues = splitMultiple(getField(row, 'a2_fonction'));
  const fonctionAutre = getField(row, 'a2_fonction_autre');
  const fonctionAll = appendAutre(fonctionValues, fonctionAutre);

  const bibRes = await client.query(
    `INSERT INTO bibliotheque (
      nom_officiel, nom_alternatif, type, annee_creation,
      responsable_institution, statut_fonctionnement, raison_non_fonctionnel,
      statut_validation, enquete_repondant_nom, enquete_repondant_fonction,
      enquete_repondant_contact, consentement_utilisation
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,'en_attente',$8,$9,$10,$11)
    RETURNING id`,
    [
      nomOfficiel,
      nomAlternatif,
      typeMapped,
      toInt(getField(row, 'b4_annee_creation')),
      getField(row, 'b5_responsable') || null,
      statutFonctionnement,
      raison,
      getField(row, 'a1_nom_repondant') || null,
      fonctionAll ? fonctionAll.join(', ') : null,
      getField(row, 'a3_telephone') || null,
      toBool(getField(row, 'a5_autorisation')),
    ]
  );

  const bibId = bibRes.rows[0].id;

  // --- Localisation ---
  const villeId = await resolveVille(
    client,
    getField(row, 'ville') || 'ndjamena',
    getField(row, 'precisez_ville')
  );
  const subdivId = await resolveSubdivision(
    client, villeId,
    getField(row, 'arrondissement'),
    getField(row, 'arrondissement_autre')
  );

  const gps = parseGeopoint(getField(row, 'c3_gps'));

  await client.query(
    `INSERT INTO localisation (bibliotheque_id, ville_id, subdivision_id, quartier, point_repere, latitude, longitude, precision_gps_m)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [bibId, villeId, subdivId, getField(row, 'c1_quartier') || null,
     getField(row, 'c2_point_repere') || null, gps.lat, gps.lng, gps.precision]
  );

  // --- Photo de façade ---
  if (mediaFiles) {
    const attachment = findAttachment(row, mediaFiles);
    if (attachment) {
      const photoUrl = await importPhoto(client, bibId, attachment);
      if (photoUrl) console.log(`    Photo: ${attachment.name} → ${photoUrl}`);
    }
  }

  // --- Horaires ---
  const jours = splitMultiple(getField(row, 'd1_jours_ouverture'));
  if (jours && jours.length > 0) {
    for (const jour of jours) {
      if (!JOUR_MAP[jour]) continue;
      await client.query(
        `INSERT INTO horaires (bibliotheque_id, jour, heure_ouverture, heure_fermeture, horaires_variables, ouvert_vacances, periodes_fermeture)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (bibliotheque_id, jour) DO NOTHING`,
        [bibId, JOUR_MAP[jour],
         getField(row, 'd2_heure_ouverture') || null,
         getField(row, 'd3_heure_fermeture') || null,
         toBool(getField(row, 'd4_horaires_variables')),
         toOuiNonParfois(getField(row, 'd5_ouvert_vacances')),
         getField(row, 'd6_periode_precision') || null]
      );
    }
  }

  // --- Conditions d'accès ---
  await client.query(
    `INSERT INTO conditions_acces (bibliotheque_id, acces_gratuit, montant_par_visite, abonnement_mensuel, abonnement_trimestriel, abonnement_annuel, conditions_inscription, consultation_sans_inscription, conditions_eleves_etudiants, acces_personnes_exterieures, modes_paiement)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [bibId,
     toOuiNonPartiel(getField(row, 'e1_gratuit')),
     toDecimal(getField(row, 'e1_montant_visite')),
     toDecimal(getField(row, 'e2_frais_mensuel')),
     toDecimal(getField(row, 'e2_frais_trimestriel')),
     toDecimal(getField(row, 'e2_frais_annuel')),
     splitMultiple(getField(row, 'e3_conditions_inscription')),
     toOuiNonPartiel(getField(row, 'e4_sans_inscription')),
     getField(row, 'e5_conditions_precision') || null,
     toOuiNonPartiel(getField(row, 'e6_acces_exterieurs')),
     splitMultiple(getField(row, 'e7_modes_paiement'))]
  );

  // --- Prêt et consultation ---
  const f3Precision = getField(row, 'f3_penalites_precision');
  const penalites = getField(row, 'f3_penalites_retard') === 'oui' ? (f3Precision || 'Oui') : null;

  // F4 suivi_emprunts: select_multiple in v2
  const suiviValues = splitMultiple(getField(row, 'f4_suivi_emprunts'));
  const suiviAutre = getField(row, 'f4_suivi_autre');
  const suiviAll = appendAutre(suiviValues, suiviAutre);

  await client.query(
    `INSERT INTO pret_consultation (bibliotheque_id, lecture_sur_place, emprunt_domicile, nb_max_livres_empruntables, duree_max_pret, penalites_retard, systeme_suivi_prets, livres_exclus_pret, action_si_non_retour)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [bibId,
     toBool(getField(row, 'f1_lecture_sur_place')),
     toOuiNonPartiel(getField(row, 'f2_emprunt_domicile')),
     toInt(getField(row, 'f2_nb_max_livres')),
     getField(row, 'f2_duree_max') || null,
     penalites,
     suiviAll ? suiviAll.join(', ') : null,
     getField(row, 'f5_livres_exclus_precision') || null,
     getField(row, 'f6_livre_non_retourne') || null]
  );

  // --- Public et fréquentation ---
  // G5 registre_outil: select_multiple in v2
  const registreValues = splitMultiple(getField(row, 'g5_registre_outil'));
  const registreAutre = getField(row, 'g5_registre_autre');
  const registreAll = appendAutre(registreValues, registreAutre);

  await client.query(
    `INSERT INTO public_frequentation (bibliotheque_id, public_cible, frequentation_moyenne_jour, frequentation_moyenne_semaine, moments_forte_frequentation, outil_suivi_frequentation, motifs_frequentation, freins_frequentation_jeunes, accessible_handicap)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [bibId,
     splitMultiple(getField(row, 'g1_public_principal')),
     toInt(getField(row, 'g2_frequentation_jour')),
     toInt(getField(row, 'g3_frequentation_semaine')),
     splitMultiple(getField(row, 'g4_moments_frequentes')),
     registreAll ? registreAll.join(', ') : null,
     splitMultiple(getField(row, 'g6_raisons_venue')),
     splitMultiple(getField(row, 'g7_freins_jeunes')),
     toOuiNonPartiel(getField(row, 'g8_accessible_handicap'))]
  );

  // --- Collection et catalogue ---
  // H3 methode_classement + h3_methode_autre
  const classementValues = splitMultiple(getField(row, 'h3_methode_classement'));
  const classementAutre = getField(row, 'h3_methode_autre');
  const classementAll = appendAutre(classementValues, classementAutre);

  // H5 domaine_principal: resolve "autre" with h5_domaine_autre
  const domainePrincipal = resolveAutre(
    getField(row, 'h5_domaine_principal'),
    getField(row, 'h5_domaine_autre')
  );

  // I1 catalogue_format: select_multiple in v2 ("les_deux" removed)
  const catalogueFormat = splitMultiple(getField(row, 'i1_catalogue_format'));

  await client.query(
    `INSERT INTO collection_catalogue (bibliotheque_id, nb_livres_estime, source_du_nombre, mode_classement, domaines_couverts, domaine_principal, types_ouvrages, langues_disponibles, etat_des_livres, accepte_dons, besoins_prioritaires_livres, dispose_catalogue, format_catalogue, mise_a_jour_catalogue, logiciel_gestion)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [bibId,
     toInt(getField(row, 'h1_nombre_livres')),
     getField(row, 'h2_provenance_nombre') || null,
     classementAll,
     splitMultiple(getField(row, 'h4_domaines')),
     domainePrincipal,
     splitMultiple(getField(row, 'h6_types_ouvrages')),
     splitMultiple(getField(row, 'h7_langues')),
     getField(row, 'h8_recence') || null,
     toOuiNonPartiel(getField(row, 'h9_dons_acceptes')),
     getField(row, 'h10_besoins_livres') || null,
     toBool(getField(row, 'i1_catalogue_existe')),
     catalogueFormat ? catalogueFormat.join(', ') : null,
     toOuiNonPartiel(getField(row, 'i1_catalogue_maj')),
     getField(row, 'i2_logiciel_nom') || null]
  );

  // --- Services ---
  const equipements = splitMultiple(getField(row, 'j4_equipements')) || [];
  await client.query(
    `INSERT INTO services (bibliotheque_id, salle_lecture, nb_places, espaces_disponibles, accompagnement_recherche, wifi_gratuit, ordinateurs_libre_acces, nb_ordinateurs, autres_services)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [bibId,
     toBool(getField(row, 'j1_salle_lecture')),
     toInt(getField(row, 'j1_places_assises')),
     splitMultiple(getField(row, 'j2_espaces')),
     toOuiNonPartiel(getField(row, 'j3_accompagnement_recherche') === 'parfois' ? 'partiel' : getField(row, 'j3_accompagnement_recherche')),
     equipements.includes('wifi_gratuit'),
     equipements.includes('ordinateurs'),
     toInt(getField(row, 'j4_nb_ordinateurs')),
     getField(row, 'j5_autres_services') || null]
  );

  // --- Activités ---
  const organise = toBool(getField(row, 'k1_organise_activites'));
  if (organise) {
    // K3 frequence: select_multiple in v2
    const frequenceValues = splitMultiple(getField(row, 'k3_frequence'));

    // K4 public + k4_public_autre
    const publicValues = splitMultiple(getField(row, 'k4_public'));
    const publicAutre = getField(row, 'k4_public_autre');
    const publicAll = appendAutre(publicValues, publicAutre);

    await client.query(
      `INSERT INTO activite (bibliotheque_id, organise_activites, types_activites, frequence, public_participant, gratuites, besoins_organisation)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [bibId, true,
       splitMultiple(getField(row, 'k2_types_activites')),
       frequenceValues ? frequenceValues.join(', ') : null,
       publicAll,
       toOuiNonPartiel(getField(row, 'k5_gratuites')),
       splitMultiple(getField(row, 'k6_besoins'))]
    );
  }

  // --- Infrastructure ---
  await client.query(
    `INSERT INTO infrastructure (bibliotheque_id, problemes_materiels, besoin_rehabilitation, types_travaux)
     VALUES ($1,$2,$3,$4)`,
    [bibId,
     splitMultiple(getField(row, 'm1_problemes')),
     toOuiNonPartiel(getField(row, 'm2_besoin_travaux')),
     getField(row, 'm2_travaux_precision') || null]
  );

  // --- Communication ---
  const plateformes = splitMultiple(getField(row, 'n3_plateformes'));
  await client.query(
    `INSERT INTO communication (bibliotheque_id, canaux_decouverte, site_web, reseaux_sociaux, whatsapp_public, email_public, interesse_fiche_numerique)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [bibId,
     splitMultiple(getField(row, 'n1_moyens_connaissance')),
     getField(row, 'n2_site_web_adresse') || null,
     plateformes,
     getField(row, 'n4_whatsapp_numero') || null,
     getField(row, 'n5_email_adresse') || null,
     toOuiNonPartiel(getField(row, 'n6_interet_fiche'))]
  );

  // --- Besoins et partenariats ---
  const defis = [
    getField(row, 'o1_defi_1'),
    getField(row, 'o1_defi_2'),
    getField(row, 'o1_defi_3'),
  ].filter(Boolean).join('; ') || null;

  // O3 appui_prioritaire: resolve "autre" with o3_appui_autre
  const appuiPrioritaire = resolveAutre(
    getField(row, 'o3_appui_prioritaire'),
    getField(row, 'o3_appui_autre')
  );

  await client.query(
    `INSERT INTO besoins_partenariats (bibliotheque_id, defis_principaux, types_appui_necessaire, appui_prioritaire, a_deja_recu_appui, partenaire_precedent, recherche_partenaires, type_partenariat_souhaite)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [bibId, defis,
     splitMultiple(getField(row, 'o2_appuis')),
     appuiPrioritaire,
     toBool(getField(row, 'o4_appui_recu')),
     getField(row, 'o4_appui_precision') || null,
     toBool(getField(row, 'o5_recherche_partenaires')),
     splitMultiple(getField(row, 'o6_type_partenariat'))]
  );

  // --- Enquête ---
  const modeCollecte = getField(row, 'mode_collecte');
  const modeCollecteAutre = getField(row, 'mode_collecte_autre');

  await client.query(
    `INSERT INTO enquete (bibliotheque_id, nom_enqueteur, date_collecte, mode_collecte)
     VALUES ($1,$2,$3,'import_kobo')`,
    [bibId,
     getField(row, 'nom_enqueteur') || null,
     getField(row, 'date_collecte') || null]
  );

  return bibId;
}

// --- Main ---

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node src/scripts/import-kobo.js <path-to-kobo-export.json|zip>');
    process.exit(1);
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  const ext = path.extname(absolutePath).toLowerCase();
  let submissions;
  let mediaFiles = null;

  if (ext === '.zip') {
    console.log('Extracting ZIP archive...');
    const result = loadFromZip(absolutePath);
    const parsed = result.jsonData;
    submissions = Array.isArray(parsed) ? parsed : (parsed.results || [parsed]);
    mediaFiles = result.mediaFiles;
    console.log(`  ${submissions.length} submission(s), ${mediaFiles.size} media file(s) found.`);
  } else {
    const raw = fs.readFileSync(absolutePath, 'utf-8');
    try {
      const parsed = JSON.parse(raw);
      submissions = Array.isArray(parsed) ? parsed : (parsed.results || [parsed]);
    } catch (err) {
      console.error(`Invalid JSON: ${err.message}`);
      process.exit(1);
    }
    console.log(`Found ${submissions.length} submission(s) to import.`);
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const client = await pool.connect();
  let imported = 0;
  let skipped = 0;
  let photos = 0;

  try {
    await client.query('BEGIN');

    for (let i = 0; i < submissions.length; i++) {
      const submission = submissions[i];
      const sp = `sp_${i}`;
      try {
        await client.query(`SAVEPOINT ${sp}`);
        const bibId = await importSubmission(client, submission, mediaFiles);
        if (bibId) {
          imported++;
          const nom = getField(submission, 'b1_nom_officiel');
          console.log(`  OK: ${nom} → ${bibId}`);
          await client.query(`RELEASE SAVEPOINT ${sp}`);
        } else {
          skipped++;
          await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
        }
      } catch (err) {
        skipped++;
        await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
        const biblioId = getField(submission, 'bibliotheque_id');
        console.error(`  ERR (${biblioId}): ${err.message}`);
      }
    }

    await client.query('COMMIT');
    console.log(`\nImport complete: ${imported} imported, ${skipped} skipped.`);
    console.log('All imported fiches have statut_validation = "en_attente" — validate them via the admin dashboard.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Import failed, all changes rolled back: ${err.message}`);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
