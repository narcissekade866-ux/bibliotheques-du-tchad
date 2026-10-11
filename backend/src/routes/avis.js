const express = require('express');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { validateUUID } = require('../middlewares/validateUUID');
const { createAvisSchema, moderateAvisSchema } = require('../validators/avis');
const { pool } = require('../config/db');

const router = express.Router();

router.get('/bibliotheque/:bibliothequeId', validateUUID('bibliothequeId'), asyncHandler(async (req, res) => {
  const [result, stats] = await Promise.all([
    pool.query(
      `SELECT a.id, a.note, a.commentaire, a.created_at, u.nom AS auteur_nom
       FROM avis a
       JOIN utilisateur u ON u.id = a.utilisateur_id
       WHERE a.bibliotheque_id = $1 AND a.statut_moderation = 'approuve'
       ORDER BY a.created_at DESC`,
      [req.params.bibliothequeId]
    ),
    pool.query(
      `SELECT COUNT(*) AS total, ROUND(AVG(note), 1) AS moyenne
       FROM avis
       WHERE bibliotheque_id = $1 AND statut_moderation = 'approuve'`,
      [req.params.bibliothequeId]
    ),
  ]);

  res.json({
    avis: result.rows,
    total: parseInt(stats.rows[0].total, 10),
    moyenne: stats.rows[0].moyenne ? parseFloat(stats.rows[0].moyenne) : null,
  });
}));

router.post(
  '/bibliotheque/:bibliothequeId',
  authenticateToken,
  validateUUID('bibliothequeId'),
  validate(createAvisSchema),
  asyncHandler(async (req, res) => {
    const { note, commentaire } = req.validated;

    const biblio = await pool.query(
      "SELECT id FROM bibliotheque WHERE id = $1 AND statut_validation = 'valide'",
      [req.params.bibliothequeId]
    );
    if (biblio.rows.length === 0) {
      return res.status(404).json({ message: 'Bibliothèque introuvable ou non validée' });
    }

    const existing = await pool.query(
      'SELECT id FROM avis WHERE bibliotheque_id = $1 AND utilisateur_id = $2',
      [req.params.bibliothequeId, req.user.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Vous avez déjà donné votre avis pour cette bibliothèque' });
    }

    const result = await pool.query(
      `INSERT INTO avis (bibliotheque_id, utilisateur_id, note, commentaire)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.bibliothequeId, req.user.id, note, commentaire || null]
    );

    res.status(201).json(result.rows[0]);
  })
);

router.put(
  '/:id/moderation',
  authenticateToken,
  requireRole('administrateur'),
  validateUUID('id'),
  validate(moderateAvisSchema),
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      'UPDATE avis SET statut_moderation = $1 WHERE id = $2 RETURNING *',
      [req.validated.statut, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Avis introuvable' });
    }
    res.json(result.rows[0]);
  })
);

router.get(
  '/en-attente',
  authenticateToken,
  requireRole('administrateur'),
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      `SELECT a.*, u.nom AS auteur_nom, b.nom_officiel AS bibliotheque_nom
       FROM avis a
       JOIN utilisateur u ON u.id = a.utilisateur_id
       JOIN bibliotheque b ON b.id = a.bibliotheque_id
       WHERE a.statut_moderation = 'en_attente'
       ORDER BY a.created_at ASC`
    );
    res.json(result.rows);
  })
);

module.exports = router;
