const express = require('express');
const { z } = require('zod');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { validate } = require('../middlewares/validate');
const { validateUUID } = require('../middlewares/validateUUID');
const { pool } = require('../config/db');

const router = express.Router();

const createSchema = z.object({
  type: z.enum(['horaires_incorrects', 'adresse_incorrecte', 'fermeture', 'autre']),
  description: z.string().min(5).max(1000),
  email_contact: z.string().email().max(255).optional(),
});

router.post('/:biblioId',
  validateUUID('biblioId'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { biblioId } = req.params;

    const biblio = await pool.query(
      'SELECT id FROM bibliotheque WHERE id = $1',
      [biblioId]
    );
    if (biblio.rows.length === 0) {
      return res.status(404).json({ message: 'Bibliothèque introuvable' });
    }

    const result = await pool.query(
      `INSERT INTO signalement (bibliotheque_id, type, description, email_contact)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [biblioId, req.body.type, req.body.description, req.body.email_contact || null]
    );

    res.status(201).json({ message: 'Signalement envoyé', id: result.rows[0].id });
  })
);

router.get('/',
  authenticateToken,
  requireRole('administrateur'),
  asyncHandler(async (req, res) => {
    const statut = req.query.statut || 'nouveau';
    const result = await pool.query(
      `SELECT s.*, b.nom_officiel
       FROM signalement s
       JOIN bibliotheque b ON b.id = s.bibliotheque_id
       WHERE s.statut = $1
       ORDER BY s.created_at DESC
       LIMIT 50`,
      [statut]
    );
    res.json(result.rows);
  })
);

router.put('/:id/traiter',
  authenticateToken,
  requireRole('administrateur'),
  validateUUID('id'),
  asyncHandler(async (req, res) => {
    const { statut } = req.body;
    if (!['en_cours', 'traite', 'rejete'].includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const result = await pool.query(
      `UPDATE signalement
       SET statut = $1, traite_par_id = $2, traite_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [statut, req.user.id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Signalement introuvable' });
    }

    res.json(result.rows[0]);
  })
);

module.exports = router;
