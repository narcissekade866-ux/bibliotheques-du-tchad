const express = require('express');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { pool } = require('../config/db');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const [total, byType, byVille, recentAvis] = await Promise.all([
    pool.query(
      "SELECT COUNT(*) FROM bibliotheque WHERE statut_validation = 'valide'"
    ),
    pool.query(
      `SELECT type, COUNT(*) FROM bibliotheque
       WHERE statut_validation = 'valide'
       GROUP BY type ORDER BY count DESC`
    ),
    pool.query(
      `SELECT v.nom, COUNT(b.id) AS total
       FROM bibliotheque b
       JOIN localisation l ON l.bibliotheque_id = b.id
       JOIN ville v ON v.id = l.ville_id
       WHERE b.statut_validation = 'valide'
       GROUP BY v.nom ORDER BY total DESC`
    ),
    pool.query(
      `SELECT ROUND(AVG(note), 1) AS moyenne, COUNT(*) AS total
       FROM avis WHERE statut_moderation = 'approuve'`
    ),
  ]);

  res.json({
    bibliotheques_total: parseInt(total.rows[0].count, 10),
    par_type: byType.rows.map((r) => ({ type: r.type, total: parseInt(r.count, 10) })),
    par_ville: byVille.rows.map((r) => ({ ville: r.nom, total: parseInt(r.total, 10) })),
    avis: {
      total: parseInt(recentAvis.rows[0].total, 10),
      moyenne: recentAvis.rows[0].moyenne ? parseFloat(recentAvis.rows[0].moyenne) : null,
    },
  });
}));

module.exports = router;
