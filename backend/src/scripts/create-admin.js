#!/usr/bin/env node

require('dotenv').config();
const readline = require('node:readline');
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

const BCRYPT_ROUNDS = 12;

function prompt(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (hidden) {
      process.stdout.write(question);
      const stdin = process.stdin;
      const wasRaw = stdin.isRaw;
      if (stdin.setRawMode) stdin.setRawMode(true);
      let input = '';
      const onData = (char) => {
        const c = char.toString();
        if (c === '\n' || c === '\r') {
          if (stdin.setRawMode) stdin.setRawMode(wasRaw);
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(input);
        } else if (c === '\u0003') {
          process.exit(1);
        } else if (c === '\u007F' || c === '\b') {
          input = input.slice(0, -1);
        } else {
          input += c;
        }
      };
      stdin.on('data', onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

async function main() {
  console.log('=== Création du premier administrateur Bibliofinder ===\n');

  const nom = await prompt('Nom complet : ');
  if (!nom) { console.error('Le nom est obligatoire.'); process.exit(1); }

  const email = await prompt('Email : ');
  if (!email || !email.includes('@')) { console.error('Email invalide.'); process.exit(1); }

  const existing = await pool.query('SELECT id FROM utilisateur WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    console.error('Un utilisateur avec cet email existe déjà.');
    process.exit(1);
  }

  const pwd1 = await prompt('Mot de passe (min. 8 caractères) : ', true);
  if (!pwd1 || pwd1.length < 8) { console.error('Le mot de passe doit faire au moins 8 caractères.'); process.exit(1); }

  const pwd2 = await prompt('Confirmer le mot de passe : ', true);
  if (pwd1 !== pwd2) { console.error('Les mots de passe ne correspondent pas.'); process.exit(1); }

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

main().catch((err) => {
  console.error('Erreur:', err.message);
  process.exit(1);
});
