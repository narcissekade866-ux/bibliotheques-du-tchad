const { z } = require('zod');

const ouiNonPartiel = z.enum(['oui', 'non', 'partiel']).optional();
const ouiNonParfois = z.enum(['oui', 'non', 'parfois']).optional();
const textArr = z.array(z.string().max(500)).optional();

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

  horaires: z
    .array(
      z.object({
        jour: z.enum(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']),
        heure_ouverture: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        heure_fermeture: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        horaires_variables: z.boolean().optional(),
        ouvert_vacances: ouiNonParfois,
        periodes_fermeture: z.string().max(500).optional(),
      })
    )
    .optional(),

  conditions_acces: z
    .object({
      acces_gratuit: ouiNonPartiel,
      montant_par_visite: z.number().min(0).optional(),
      abonnement_mensuel: z.number().min(0).optional(),
      abonnement_trimestriel: z.number().min(0).optional(),
      abonnement_annuel: z.number().min(0).optional(),
      conditions_inscription: textArr,
      consultation_sans_inscription: ouiNonPartiel,
      conditions_eleves_etudiants: z.string().max(1000).optional(),
      acces_personnes_exterieures: ouiNonPartiel,
      modes_paiement: textArr,
    })
    .optional(),

  pret_consultation: z
    .object({
      lecture_sur_place: z.boolean().optional(),
      emprunt_domicile: ouiNonPartiel,
      nb_max_livres_empruntables: z.number().int().min(0).optional(),
      duree_max_pret: z.string().max(200).optional(),
      penalites_retard: z.string().max(500).optional(),
      systeme_suivi_prets: z.string().max(200).optional(),
      livres_exclus_pret: z.string().max(500).optional(),
      action_si_non_retour: z.string().max(500).optional(),
    })
    .optional(),

  public_frequentation: z
    .object({
      public_cible: textArr,
      frequentation_moyenne_jour: z.number().int().min(0).optional(),
      frequentation_moyenne_semaine: z.number().int().min(0).optional(),
      moments_forte_frequentation: textArr,
      outil_suivi_frequentation: z.string().max(200).optional(),
      motifs_frequentation: textArr,
      freins_frequentation_jeunes: textArr,
      accessible_handicap: ouiNonPartiel,
    })
    .optional(),

  collection_catalogue: z
    .object({
      nb_livres_estime: z.number().int().min(0).optional(),
      source_du_nombre: z.string().max(200).optional(),
      mode_classement: textArr,
      domaines_couverts: textArr,
      domaine_principal: z.string().max(200).optional(),
      types_ouvrages: textArr,
      langues_disponibles: textArr,
      etat_des_livres: z.string().max(200).optional(),
      accepte_dons: ouiNonPartiel,
      besoins_prioritaires_livres: z.string().max(1000).optional(),
      dispose_catalogue: z.boolean().optional(),
      format_catalogue: z.string().max(200).optional(),
      mise_a_jour_catalogue: z.string().max(200).optional(),
      logiciel_gestion: z.string().max(200).optional(),
    })
    .optional(),

  services: z
    .object({
      salle_lecture: z.boolean().optional(),
      nb_places: z.number().int().min(0).optional(),
      espaces_disponibles: textArr,
      accompagnement_recherche: ouiNonPartiel,
      wifi_gratuit: z.boolean().optional(),
      wifi_payant: z.boolean().optional(),
      ordinateurs_libre_acces: z.boolean().optional(),
      nb_ordinateurs: z.number().int().min(0).optional(),
      imprimante: z.boolean().optional(),
      photocopieur: z.boolean().optional(),
      scanner: z.boolean().optional(),
      autres_services: z.string().max(1000).optional(),
    })
    .optional(),

  activite: z
    .object({
      organise_activites: z.boolean().optional(),
      types_activites: textArr,
      frequence: z.string().max(200).optional(),
      public_participant: textArr,
      gratuites: ouiNonPartiel,
      besoins_organisation: textArr,
    })
    .optional(),

  infrastructure: z
    .object({
      problemes_materiels: textArr,
      besoin_rehabilitation: ouiNonPartiel,
      types_travaux: z.string().max(1000).optional(),
    })
    .optional(),

  communication: z
    .object({
      canaux_decouverte: textArr,
      site_web: z.string().max(500).optional(),
      reseaux_sociaux: textArr,
      whatsapp_public: z.string().max(50).optional(),
      email_public: z.string().max(200).optional(),
      interesse_fiche_numerique: ouiNonPartiel,
    })
    .optional(),

  besoins_partenariats: z
    .object({
      defis_principaux: z.string().max(2000).optional(),
      types_appui_necessaire: textArr,
      appui_prioritaire: z.string().max(1000).optional(),
      a_deja_recu_appui: z.boolean().optional(),
      partenaire_precedent: z.string().max(500).optional(),
      recherche_partenaires: z.boolean().optional(),
      type_partenariat_souhaite: textArr,
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
  statut_fonctionnement: z
    .enum(['fonctionnel', 'non_fonctionnel', 'partiellement_fonctionnel', 'temporairement_ferme'])
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
