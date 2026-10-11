#!/usr/bin/env node

require('dotenv').config();
const readline = require('node:readline');
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

const BCRYPT_ROUNDS = 12;

function promptVisible(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptHidden(question) {
  return new Promise((resolve, reject) => {
    process.stdout.write(question);

    if (!process.stdin.isTTY) {
      reject(new Error('Ce script doit être exécuté dans un terminal interactif.'));
      return;
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    let input = '';

    const onData = (key) => {
      if (key === '\r' || key === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(input);
      } else if (key === '\u0003') {
        process.stdin.setRawMode(false);
        process.stdout.write('\n');
        process.exit(1);
      } else if (key === '\u007F' || key === '\b') {
        input = input.slice(0, -1);
      } else if (key.charCodeAt(0) >= 32) {
        input += key;
      }
    };

    process.stdin.on('data', onData);
  });
}

async function main() {
  console.log('=== Création du premier administrateur Bibliofinder ===\n');

  const nom = await promptVisible('Nom complet : ');
  if (!nom) { console.error('Le nom est obligatoire.'); process.exit(1); }

  const email = await promptVisible('Email : ');
  if (!email || !email.includes('@')) { console.error('Email invalide.'); process.exit(1); }

  const existing = await pool.query('SELECT id FROM utilisateur WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    console.error('Un utilisateur avec cet email existe déjà.');
    await pool.end();
    process.exit(1);
  }

  const pwd1 = await promptHidden('Mot de passe (min. 8 caractères) : ');
  if (!pwd1 || pwd1.length < 8) {
    console.error('Le mot de passe doit faire au moins 8 caractères.');
    await pool.end();
    process.exit(1);
  }

  const pwd2 = await promptHidden('Confirmer le mot de passe : ');
  if (pwd1 !== pwd2) {
    console.error('Les mots de passe ne correspondent pas.');
    await pool.end();
    process.exit(1);
  }

  const hash = await bcrypt.hash(pwd1, BCRYPT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO utilisateur (nom, email, mot_de_passe_hash, role, statut)
     VALUES ($1, $2, $3, 'administrateur', 'actif')
     RETURNING id, nom, email, role, statut, created_at`,
    [nom, email, hash]
  );

  const user = result.rows[0];
  console.log('\nAdministrateur créé :');
  console.log(`  ID    : ${user.id}`);
  console.log(`  Nom   : ${user.nom}`);
  console.log(`  Email : ${user.email}`);
  console.log(`  Rôle  : ${user.role}`);
  console.log(`  Statut: ${user.statut}`);
  console.log('\nConnectez-vous sur l\'interface web pour valider les fiches en attente.');

  await pool.end();
}

main().catch(async (err) => {
  console.error('Erreur:', err.message);
  try { await pool.end(); } catch {}
  process.exit(1);
});
