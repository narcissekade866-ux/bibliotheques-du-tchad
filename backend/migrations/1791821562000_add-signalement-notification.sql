-- Up Migration

CREATE TYPE statut_signalement AS ENUM ('nouveau', 'en_cours', 'traite', 'rejete');

CREATE TABLE signalement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bibliotheque_id UUID NOT NULL REFERENCES bibliotheque(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  email_contact TEXT,
  statut statut_signalement NOT NULL DEFAULT 'nouveau',
  traite_par_id UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  traite_at TIMESTAMPTZ
);

CREATE INDEX idx_signalement_biblio ON signalement(bibliotheque_id);
CREATE INDEX idx_signalement_statut ON signalement(statut);

CREATE TABLE notification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destinataire_id UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  bibliotheque_id UUID REFERENCES bibliotheque(id) ON DELETE CASCADE,
  lue BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_dest ON notification(destinataire_id, lue, created_at DESC);

-- Down Migration

DROP TABLE IF EXISTS notification;
DROP TABLE IF EXISTS signalement;
DROP TYPE IF EXISTS statut_signalement;
