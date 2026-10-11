-- Up Migration

-- Add kobo_uuid column for idempotent imports (unique per Kobo submission)
ALTER TABLE bibliotheque ADD COLUMN kobo_uuid TEXT UNIQUE;
CREATE INDEX idx_bibliotheque_kobo_uuid ON bibliotheque(kobo_uuid) WHERE kobo_uuid IS NOT NULL;

-- Add 'partiellement_fonctionnel' to statut_fonctionnement enum
ALTER TYPE statut_fonctionnement ADD VALUE IF NOT EXISTS 'partiellement_fonctionnel' AFTER 'fonctionnel';

-- Down Migration
-- Note: PostgreSQL does not support removing values from enums.
-- The kobo_uuid column can be dropped if needed:
-- ALTER TABLE bibliotheque DROP COLUMN IF EXISTS kobo_uuid;
