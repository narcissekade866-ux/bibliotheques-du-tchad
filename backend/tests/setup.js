process.env.NODE_ENV = 'test';
require('dotenv').config();
const { pool } = require('../src/config/db');

const TEST_EMAIL_PREFIX = 'test_jest_';

async function cleanupTestData() {
  await pool.query(`DELETE FROM refresh_token WHERE utilisateur_id IN (SELECT id FROM utilisateur WHERE email LIKE $1)`, [`${TEST_EMAIL_PREFIX}%`]);
  await pool.query(`DELETE FROM avis WHERE utilisateur_id IN (SELECT id FROM utilisateur WHERE email LIKE $1)`, [`${TEST_EMAIL_PREFIX}%`]);
  await pool.query(`DELETE FROM utilisateur WHERE email LIKE $1`, [`${TEST_EMAIL_PREFIX}%`]);
}

function testEmail(suffix) {
  return `${TEST_EMAIL_PREFIX}${suffix}_${Date.now()}@test.local`;
}

async function createTestUser(overrides = {}) {
  const bcrypt = require('bcrypt');
  const email = overrides.email || testEmail('user');
  const hash = await bcrypt.hash('TestPass123!', 4);
  const result = await pool.query(
    `INSERT INTO utilisateur (nom, email, mot_de_passe_hash, role, statut)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, nom, email, role, statut, created_at`,
    [
      overrides.nom || 'Test User',
      email,
      hash,
      overrides.role || 'visiteur',
      overrides.statut || 'actif',
    ]
  );
  return result.rows[0];
}

function generateAccessToken(user) {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

module.exports = {
  pool,
  cleanupTestData,
  testEmail,
  createTestUser,
  generateAccessToken,
  TEST_EMAIL_PREFIX,
};
