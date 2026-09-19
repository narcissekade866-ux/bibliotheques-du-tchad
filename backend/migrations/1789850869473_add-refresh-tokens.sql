-- Up Migration

CREATE TABLE refresh_token (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  utilisateur_id UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_token_utilisateur ON refresh_token(utilisateur_id);
CREATE INDEX idx_refresh_token_hash ON refresh_token(token_hash);
CREATE INDEX idx_refresh_token_expires ON refresh_token(expires_at);

-- Down Migration

DROP TABLE IF EXISTS refresh_token;
