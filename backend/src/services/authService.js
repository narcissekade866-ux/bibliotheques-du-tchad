const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const { pool } = require('../config/db');

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

async function register({ nom, email, telephone, mot_de_passe }) {
  const existing = await pool.query(
    'SELECT id FROM utilisateur WHERE email = $1',
    [email]
  );
  if (existing.rows.length > 0) {
    return { error: 'Identifiants incorrects', status: 409 };
  }

  const hash = await bcrypt.hash(mot_de_passe, BCRYPT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO utilisateur (nom, email, telephone, mot_de_passe_hash, role, statut)
     VALUES ($1, $2, $3, $4, 'visiteur', 'actif')
     RETURNING id, nom, email, role, statut, created_at`,
    [nom, email, telephone || null, hash]
  );

  return { user: result.rows[0] };
}

async function login({ email, mot_de_passe }) {
  const result = await pool.query(
    `SELECT id, nom, email, mot_de_passe_hash, role, statut,
            tentatives_connexion_echouees, verrouille_jusqu_a
     FROM utilisateur WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    await fakeHashDelay();
    return { error: 'Identifiants incorrects', status: 401 };
  }

  const user = result.rows[0];

  if (user.verrouille_jusqu_a && new Date(user.verrouille_jusqu_a) > new Date()) {
    return { error: 'Identifiants incorrects', status: 401 };
  }

  if (user.statut === 'suspendu') {
    return { error: 'Identifiants incorrects', status: 401 };
  }

  const valid = await bcrypt.compare(mot_de_passe, user.mot_de_passe_hash);
  if (!valid) {
    const attempts = user.tentatives_connexion_echouees + 1;
    const lockUntil =
      attempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;

    await pool.query(
      `UPDATE utilisateur
       SET tentatives_connexion_echouees = $1, verrouille_jusqu_a = $2
       WHERE id = $3`,
      [attempts, lockUntil, user.id]
    );

    return { error: 'Identifiants incorrects', status: 401 };
  }

  await pool.query(
    `UPDATE utilisateur
     SET tentatives_connexion_echouees = 0, verrouille_jusqu_a = NULL
     WHERE id = $1`,
    [user.id]
  );

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();

  const refreshHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  await pool.query(
    `INSERT INTO refresh_token (utilisateur_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, refreshHash, expiresAt]
  );

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, nom: user.nom, email: user.email, role: user.role },
  };
}

async function refresh(rawToken) {
  const tokenHash = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');

  const result = await pool.query(
    `SELECT rt.id AS token_id, rt.utilisateur_id, rt.expires_at,
            u.id, u.nom, u.email, u.role, u.statut
     FROM refresh_token rt
     JOIN utilisateur u ON u.id = rt.utilisateur_id
     WHERE rt.token_hash = $1`,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    return { error: 'Jeton invalide', status: 401 };
  }

  const row = result.rows[0];

  await pool.query('DELETE FROM refresh_token WHERE id = $1', [row.token_id]);

  if (new Date(row.expires_at) < new Date()) {
    return { error: 'Jeton expiré', status: 401 };
  }

  if (row.statut === 'suspendu') {
    return { error: 'Identifiants incorrects', status: 401 };
  }

  const accessToken = generateAccessToken(row);
  const newRefreshToken = generateRefreshToken();

  const newHash = crypto
    .createHash('sha256')
    .update(newRefreshToken)
    .digest('hex');
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  await pool.query(
    `INSERT INTO refresh_token (utilisateur_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [row.utilisateur_id, newHash, expiresAt]
  );

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: { id: row.id, nom: row.nom, email: row.email, role: row.role },
  };
}

async function logout(rawToken) {
  const tokenHash = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');
  await pool.query('DELETE FROM refresh_token WHERE token_hash = $1', [
    tokenHash,
  ]);
}

async function fakeHashDelay() {
  await bcrypt.hash('fake', BCRYPT_ROUNDS);
}

module.exports = { register, login, refresh, logout };
