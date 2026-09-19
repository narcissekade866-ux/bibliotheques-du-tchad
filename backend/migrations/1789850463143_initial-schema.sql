-- Up Migration

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Types énumérés

CREATE TYPE statut_ville AS ENUM ('active', 'pilote', 'desactivee');
CREATE TYPE type_subdivision AS ENUM ('arrondissement', 'canton', 'quartier', 'autre');
CREATE TYPE role_utilisateur AS ENUM ('visiteur', 'responsable_bibliotheque', 'enqueteur', 'administrateur');
CREATE TYPE statut_utilisateur AS ENUM ('actif', 'suspendu', 'en_attente_verification');
CREATE TYPE type_bibliotheque AS ENUM (
  'publique', 'universitaire', 'scolaire', 'specialisee',
  'communautaire', 'privee', 'associative', 'autre'
);
CREATE TYPE statut_fonctionnement AS ENUM ('fonctionnel', 'temporairement_ferme', 'non_fonctionnel');
CREATE TYPE statut_validation AS ENUM ('brouillon', 'en_attente', 'valide', 'rejete');
CREATE TYPE jour_semaine AS ENUM ('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche');
CREATE TYPE oui_non_partiel AS ENUM ('oui', 'non', 'partiel');
CREATE TYPE oui_non_parfois AS ENUM ('oui', 'non', 'parfois');
CREATE TYPE type_image AS ENUM ('photo', 'logo', 'document');
CREATE TYPE statut_moderation AS ENUM ('en_attente', 'approuve', 'rejete', 'signale');
CREATE TYPE statut_modification AS ENUM ('en_attente', 'approuve', 'rejete');
CREATE TYPE mode_collecte AS ENUM ('terrain_papier', 'terrain_numerique', 'en_ligne', 'import_kobo');

-- Tables d'extensibilité multi-villes

CREATE TABLE ville (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  statut statut_ville NOT NULL DEFAULT 'active',
  centre_lat DECIMAL(9, 6),
  centre_long DECIMAL(9, 6),
  zoom_defaut INTEGER DEFAULT 13,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subdivision_administrative (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ville_id UUID NOT NULL REFERENCES ville(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  type type_subdivision NOT NULL DEFAULT 'arrondissement',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subdivision_ville ON subdivision_administrative(ville_id);

-- Utilisateurs

CREATE TABLE utilisateur (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telephone TEXT,
  mot_de_passe_hash TEXT NOT NULL,
  role role_utilisateur NOT NULL DEFAULT 'visiteur',
  statut statut_utilisateur NOT NULL DEFAULT 'actif',
  tentatives_connexion_echouees INTEGER NOT NULL DEFAULT 0,
  verrouille_jusqu_a TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_utilisateur_email ON utilisateur(email);
CREATE INDEX idx_utilisateur_role ON utilisateur(role);

-- Bibliothèque (sections A et B)

CREATE TABLE bibliotheque (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom_officiel TEXT NOT NULL,
  nom_alternatif TEXT,
  type type_bibliotheque,
  annee_creation INTEGER,
  responsable_institution TEXT,
  statut_fonctionnement statut_fonctionnement DEFAULT 'fonctionnel',
  raison_non_fonctionnel TEXT,
  statut_validation statut_validation NOT NULL DEFAULT 'en_attente',
  cree_par_id UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
  valide_par_id UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
  enquete_repondant_nom TEXT,
  enquete_repondant_fonction TEXT,
  enquete_repondant_contact TEXT,
  consentement_utilisation BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bibliotheque_statut_validation ON bibliotheque(statut_validation);
CREATE INDEX idx_bibliotheque_type ON bibliotheque(type);
CREATE INDEX idx_bibliotheque_nom ON bibliotheque(nom_officiel);

-- Localisation (section C)

CREATE TABLE localisation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bibliotheque_id UUID NOT NULL UNIQUE REFERENCES bibliotheque(id) ON DELETE CASCADE,
  ville_id UUID NOT NULL REFERENCES ville(id),
  subdivision_id UUID REFERENCES subdivision_administrative(id),
  quartier TEXT,
  point_repere TEXT,
  latitude DECIMAL(9, 6),
  longitude DECIMAL(9, 6),
  precision_gps_m DECIMAL(5, 1),
  geom GEOMETRY(Point, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_localisation_bibliotheque ON localisation(bibliotheque_id);
CREATE INDEX idx_localisation_ville ON localisation(ville_id);
CREATE INDEX idx_localisation_geom ON localisation USING GIST(geom);

-- Horaires (section D)

CREATE TABLE horaires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bibliotheque_id UUID NOT NULL REFERENCES bibliotheque(id) ON DELETE CASCADE,
  jour jour_semaine NOT NULL,
  heure_ouverture TIME,
  heure_fermeture TIME,
  horaires_variables BOOLEAN DEFAULT FALSE,
  ouvert_vacances oui_non_parfois,
  periodes_fermeture TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bibliotheque_id, jour)
);

CREATE INDEX idx_horaires_bibliotheque ON horaires(bibliotheque_id);

-- Conditions d'accès (section E)

CREATE TABLE conditions_acces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bibliotheque_id UUID NOT NULL UNIQUE REFERENCES bibliotheque(id) ON DELETE CASCADE,
  acces_gratuit oui_non_partiel,
  montant_par_visite DECIMAL(10, 0),
  abonnement_mensuel DECIMAL(10, 0),
  abonnement_trimestriel DECIMAL(10, 0),
  abonnement_annuel DECIMAL(10, 0),
  conditions_inscription TEXT[],
  consultation_sans_inscription oui_non_partiel,
  conditions_eleves_etudiants TEXT,
  acces_personnes_exterieures oui_non_partiel,
  modes_paiement TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prêt et consultation (section F)

CREATE TABLE pret_consultation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bibliotheque_id UUID NOT NULL UNIQUE REFERENCES bibliotheque(id) ON DELETE CASCADE,
  lecture_sur_place BOOLEAN,
  emprunt_domicile oui_non_partiel,
  nb_max_livres_empruntables INTEGER,
  duree_max_pret TEXT,
  penalites_retard TEXT,
  systeme_suivi_prets TEXT,
  livres_exclus_pret TEXT,
  action_si_non_retour TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Public et fréquentation (section G)

CREATE TABLE public_frequentation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bibliotheque_id UUID NOT NULL UNIQUE REFERENCES bibliotheque(id) ON DELETE CASCADE,
  public_cible TEXT[],
  frequentation_moyenne_jour INTEGER,
  frequentation_moyenne_semaine INTEGER,
  moments_forte_frequentation TEXT[],
  outil_suivi_frequentation TEXT,
  motifs_frequentation TEXT[],
  freins_frequentation_jeunes TEXT[],
  accessible_handicap oui_non_partiel,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Collection et catalogue (sections H et I)

CREATE TABLE collection_catalogue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bibliotheque_id UUID NOT NULL UNIQUE REFERENCES bibliotheque(id) ON DELETE CASCADE,
  nb_livres_estime INTEGER,
  source_du_nombre TEXT,
  mode_classement TEXT[],
  domaines_couverts TEXT[],
  domaine_principal TEXT,
  types_ouvrages TEXT[],
  langues_disponibles TEXT[],
  etat_des_livres TEXT,
  accepte_dons oui_non_partiel,
  besoins_prioritaires_livres TEXT,
  dispose_catalogue BOOLEAN,
  format_catalogue TEXT,
  mise_a_jour_catalogue TEXT,
  logiciel_gestion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Services (section J)

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bibliotheque_id UUID NOT NULL UNIQUE REFERENCES bibliotheque(id) ON DELETE CASCADE,
  salle_lecture BOOLEAN,
  nb_places INTEGER,
  espaces_disponibles TEXT[],
  accompagnement_recherche oui_non_partiel,
  wifi_gratuit BOOLEAN,
  wifi_payant BOOLEAN,
  ordinateurs_libre_acces BOOLEAN,
  nb_ordinateurs INTEGER,
  imprimante BOOLEAN,
  photocopieur BOOLEAN,
  scanner BOOLEAN,
  autres_services TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activités (section K)

CREATE TABLE activite (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bibliotheque_id UUID NOT NULL REFERENCES bibliotheque(id) ON DELETE CASCADE,
  organise_activites BOOLEAN,
  types_activites TEXT[],
  frequence TEXT,
  public_participant TEXT[],
  gratuites oui_non_partiel,
  besoins_organisation TEXT[],
  date_activite DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activite_bibliotheque ON activite(bibliotheque_id);

-- Infrastructure (section M)

CREATE TABLE infrastructure (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bibliotheque_id UUID NOT NULL UNIQUE REFERENCES bibliotheque(id) ON DELETE CASCADE,
  problemes_materiels TEXT[],
  besoin_rehabilitation oui_non_partiel,
  types_travaux TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Communication (section N)

CREATE TABLE communication (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bibliotheque_id UUID NOT NULL UNIQUE REFERENCES bibliotheque(id) ON DELETE CASCADE,
  canaux_decouverte TEXT[],
  site_web TEXT,
  reseaux_sociaux TEXT[],
  whatsapp_public TEXT,
  email_public TEXT,
  interesse_fiche_numerique oui_non_partiel,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Besoins et partenariats (section O)

CREATE TABLE besoins_partenariats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bibliotheque_id UUID NOT NULL UNIQUE REFERENCES bibliotheque(id) ON DELETE CASCADE,
  defis_principaux TEXT,
  types_appui_necessaire TEXT[],
  appui_prioritaire TEXT,
  a_deja_recu_appui BOOLEAN,
  partenaire_precedent TEXT,
  recherche_partenaires BOOLEAN,
  type_partenariat_souhaite TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tables transverses

CREATE TABLE image (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bibliotheque_id UUID NOT NULL REFERENCES bibliotheque(id) ON DELETE CASCADE,
  type type_image NOT NULL DEFAULT 'photo',
  url TEXT NOT NULL,
  ajoutee_par_id UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_image_bibliotheque ON image(bibliotheque_id);

CREATE TABLE avis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bibliotheque_id UUID NOT NULL REFERENCES bibliotheque(id) ON DELETE CASCADE,
  utilisateur_id UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
  note INTEGER CHECK (note >= 1 AND note <= 5),
  commentaire TEXT,
  statut_moderation statut_moderation NOT NULL DEFAULT 'en_attente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bibliotheque_id, utilisateur_id)
);

CREATE INDEX idx_avis_bibliotheque ON avis(bibliotheque_id);
CREATE INDEX idx_avis_statut ON avis(statut_moderation);

CREATE TABLE historique_modification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bibliotheque_id UUID NOT NULL REFERENCES bibliotheque(id) ON DELETE CASCADE,
  champ_modifie TEXT NOT NULL,
  ancienne_valeur TEXT,
  nouvelle_valeur TEXT,
  modifie_par_id UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
  statut statut_modification NOT NULL DEFAULT 'en_attente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_historique_bibliotheque ON historique_modification(bibliotheque_id);
CREATE INDEX idx_historique_statut ON historique_modification(statut);

CREATE TABLE enquete (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bibliotheque_id UUID NOT NULL REFERENCES bibliotheque(id) ON DELETE CASCADE,
  nom_enqueteur TEXT,
  date_collecte DATE,
  mode_collecte mode_collecte,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enquete_bibliotheque ON enquete(bibliotheque_id);

-- Trigger pour mettre à jour updated_at automatiquement

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ville_updated_at BEFORE UPDATE ON ville FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subdivision_updated_at BEFORE UPDATE ON subdivision_administrative FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_utilisateur_updated_at BEFORE UPDATE ON utilisateur FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bibliotheque_updated_at BEFORE UPDATE ON bibliotheque FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_localisation_updated_at BEFORE UPDATE ON localisation FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_horaires_updated_at BEFORE UPDATE ON horaires FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_conditions_acces_updated_at BEFORE UPDATE ON conditions_acces FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pret_consultation_updated_at BEFORE UPDATE ON pret_consultation FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_public_frequentation_updated_at BEFORE UPDATE ON public_frequentation FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_collection_catalogue_updated_at BEFORE UPDATE ON collection_catalogue FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_activite_updated_at BEFORE UPDATE ON activite FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_infrastructure_updated_at BEFORE UPDATE ON infrastructure FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_communication_updated_at BEFORE UPDATE ON communication FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_besoins_partenariats_updated_at BEFORE UPDATE ON besoins_partenariats FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_avis_updated_at BEFORE UPDATE ON avis FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger pour synchroniser la colonne geom PostGIS depuis lat/long

CREATE OR REPLACE FUNCTION sync_localisation_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  ELSE
    NEW.geom = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_localisation_geom BEFORE INSERT OR UPDATE ON localisation FOR EACH ROW EXECUTE FUNCTION sync_localisation_geom();

-- Down Migration

DROP TRIGGER IF EXISTS trg_localisation_geom ON localisation;
DROP FUNCTION IF EXISTS sync_localisation_geom();

DROP TRIGGER IF EXISTS trg_avis_updated_at ON avis;
DROP TRIGGER IF EXISTS trg_besoins_partenariats_updated_at ON besoins_partenariats;
DROP TRIGGER IF EXISTS trg_communication_updated_at ON communication;
DROP TRIGGER IF EXISTS trg_infrastructure_updated_at ON infrastructure;
DROP TRIGGER IF EXISTS trg_activite_updated_at ON activite;
DROP TRIGGER IF EXISTS trg_services_updated_at ON services;
DROP TRIGGER IF EXISTS trg_collection_catalogue_updated_at ON collection_catalogue;
DROP TRIGGER IF EXISTS trg_public_frequentation_updated_at ON public_frequentation;
DROP TRIGGER IF EXISTS trg_pret_consultation_updated_at ON pret_consultation;
DROP TRIGGER IF EXISTS trg_conditions_acces_updated_at ON conditions_acces;
DROP TRIGGER IF EXISTS trg_horaires_updated_at ON horaires;
DROP TRIGGER IF EXISTS trg_localisation_updated_at ON localisation;
DROP TRIGGER IF EXISTS trg_bibliotheque_updated_at ON bibliotheque;
DROP TRIGGER IF EXISTS trg_utilisateur_updated_at ON utilisateur;
DROP TRIGGER IF EXISTS trg_subdivision_updated_at ON subdivision_administrative;
DROP TRIGGER IF EXISTS trg_ville_updated_at ON ville;
DROP FUNCTION IF EXISTS update_updated_at();

DROP TABLE IF EXISTS enquete;
DROP TABLE IF EXISTS historique_modification;
DROP TABLE IF EXISTS avis;
DROP TABLE IF EXISTS image;
DROP TABLE IF EXISTS besoins_partenariats;
DROP TABLE IF EXISTS communication;
DROP TABLE IF EXISTS infrastructure;
DROP TABLE IF EXISTS activite;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS collection_catalogue;
DROP TABLE IF EXISTS public_frequentation;
DROP TABLE IF EXISTS pret_consultation;
DROP TABLE IF EXISTS conditions_acces;
DROP TABLE IF EXISTS horaires;
DROP TABLE IF EXISTS localisation;
DROP TABLE IF EXISTS bibliotheque;
DROP TABLE IF EXISTS utilisateur;
DROP TABLE IF EXISTS subdivision_administrative;
DROP TABLE IF EXISTS ville;

DROP TYPE IF EXISTS mode_collecte;
DROP TYPE IF EXISTS statut_modification;
DROP TYPE IF EXISTS statut_moderation;
DROP TYPE IF EXISTS type_image;
DROP TYPE IF EXISTS oui_non_parfois;
DROP TYPE IF EXISTS oui_non_partiel;
DROP TYPE IF EXISTS jour_semaine;
DROP TYPE IF EXISTS statut_validation;
DROP TYPE IF EXISTS statut_fonctionnement;
DROP TYPE IF EXISTS type_bibliotheque;
DROP TYPE IF EXISTS statut_utilisateur;
DROP TYPE IF EXISTS role_utilisateur;
DROP TYPE IF EXISTS type_subdivision;
DROP TYPE IF EXISTS statut_ville;
