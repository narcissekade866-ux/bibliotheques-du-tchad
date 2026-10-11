const express = require('express');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { validateUUID } = require('../middlewares/validateUUID');
const { pool } = require('../config/db');
const { adminBiblioSelect } = require('../services/bibliothequeService');

const router = express.Router();

router.use(authenticateToken, requireRole('administrateur'));

router.get('/stats', asyncHandler(async (req, res) => {
  const [biblios, users, pending, avisCount] = await Promise.all([
    pool.query('SELECT statut_validation, COUNT(*) FROM bibliotheque GROUP BY statut_validation'),
    pool.query('SELECT role, COUNT(*) FROM utilisateur GROUP BY role'),
    pool.query("SELECT COUNT(*) FROM bibliotheque WHERE statut_validation = 'en_attente'"),
    pool.query('SELECT COUNT(*) FROM avis'),
  ]);

  const biblioStats = {};
  biblios.rows.forEach((r) => { biblioStats[r.statut_validation] = parseInt(r.count, 10); });

  const userStats = {};
  users.rows.forEach((r) => { userStats[r.role] = parseInt(r.count, 10); });

  res.json({
    bibliotheques: biblioStats,
    utilisateurs: userStats,
    fiches_en_attente: parseInt(pending.rows[0].count, 10),
    avis_total: parseInt(avisCount.rows[0].count, 10),
  });
}));

router.get('/fiches-en-attente', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT ${adminBiblioSelect('b')}, v.nom AS ville_nom, l.quartier, u.nom AS cree_par_nom
     FROM bibliotheque b
     LEFT JOIN localisation l ON l.bibliotheque_id = b.id
     LEFT JOIN ville v ON v.id = l.ville_id
     LEFT JOIN utilisateur u ON u.id = b.cree_par_id
     WHERE b.statut_validation = 'en_attente'
     ORDER BY b.created_at ASC`
  );
  res.json(result.rows);
}));

router.get('/utilisateurs', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT id, nom, email, telephone, role, statut, created_at
     FROM utilisateur ORDER BY created_at DESC`
  );
  res.json(result.rows);
}));

router.put('/utilisateurs/:id/role', validateUUID('id'), asyncHandler(async (req, res) => {
  const { role } = req.body;
  const validRoles = ['visiteur', 'responsable_bibliotheque', 'enqueteur', 'administrateur'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: 'Rôle invalide' });
  }

  const result = await pool.query(
    'UPDATE utilisateur SET role = $1 WHERE id = $2 RETURNING id, nom, email, role',
    [role, req.params.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ message: 'Utilisateur introuvable' });
  }

  res.json(result.rows[0]);
}));

router.put('/utilisateurs/:id/statut', validateUUID('id'), asyncHandler(async (req, res) => {
  const { statut } = req.body;
  const validStatuts = ['actif', 'suspendu', 'en_attente_verification'];
  if (!validStatuts.includes(statut)) {
    return res.status(400).json({ message: 'Statut invalide' });
  }

  const result = await pool.query(
    'UPDATE utilisateur SET statut = $1 WHERE id = $2 RETURNING id, nom, email, statut',
    [statut, req.params.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ message: 'Utilisateur introuvable' });
  }

  res.json(result.rows[0]);
}));

module.exports = router;
