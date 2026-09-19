const { z } = require('zod');

const createBibliothequeSchema = z.object({
  nom_officiel: z.string().min(2).max(500),
  nom_alternatif: z.string().max(500).optional(),
  type: z
    .enum([
      'publique', 'universitaire', 'scolaire', 'specialisee',
      'communautaire', 'privee', 'associative', 'autre',
    ])
    .optional(),
  annee_creation: z.number().int().min(1800).max(2100).optional(),
  responsable_institution: z.string().max(500).optional(),
  statut_fonctionnement: z
    .enum(['fonctionnel', 'temporairement_ferme', 'non_fonctionnel'])
    .optional(),
  raison_non_fonctionnel: z.string().max(1000).optional(),
  enquete_repondant_nom: z.string().max(200).optional(),
  enquete_repondant_fonction: z.string().max(200).optional(),
  enquete_repondant_contact: z.string().max(200).optional(),
  consentement_utilisation: z.boolean().optional(),

  localisation: z
    .object({
      ville_id: z.string().uuid(),
      subdivision_id: z.string().uuid().optional(),
      quartier: z.string().max(200).optional(),
      point_repere: z.string().max(500).optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      precision_gps_m: z.number().min(0).max(9999).optional(),
    })
    .optional(),
});

const updateBibliothequeSchema = createBibliothequeSchema.partial();

const validationActionSchema = z.object({
  action: z.enum(['valider', 'rejeter']),
  motif_rejet: z.string().max(1000).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  ville_id: z.string().uuid().optional(),
  type: z
    .enum([
      'publique', 'universitaire', 'scolaire', 'specialisee',
      'communautaire', 'privee', 'associative', 'autre',
    ])
    .optional(),
  statut_validation: z
    .enum(['brouillon', 'en_attente', 'valide', 'rejete'])
    .optional(),
  q: z.string().max(200).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  rayon: z.coerce.number().min(100).max(50000).default(5000),
});

module.exports = {
  createBibliothequeSchema,
  updateBibliothequeSchema,
  validationActionSchema,
  listQuerySchema,
};
