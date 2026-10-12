const express = require('express');
const { z } = require('zod');
const { authenticateToken, requireRole, optionalAuth } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { validateUUID } = require('../middlewares/validateUUID');
const { validate } = require('../middlewares/validate');
const { pool } = require('../config/db');

const router = express.Router();

const createActiviteSchema = z.object({
  bibliotheque_id: z.string().uuid(),
  types_activites: z.array(z.string().max(200)).optional(),
  frequence: z.string().max(200).optional(),
  public_participant: z.array(z.string().max(200)).optional(),
  gratuites: z.enum(['oui', 'non', 'partiel']).optional(),
  date_activite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().min(3).max(2000),
});

const updateActiviteSchema = createActiviteSchema.partial().omit({ bibliotheque_id: true });

router.get(
  '/bibliotheque/:biblioId',
  optionalAuth,
  validateUUID('biblioId'),
  asyncHandler(async (req, res) => {
    const upcoming = req.query.upcoming === 'true';
    const dateFilter = upcoming
      ? 'AND a.date_activite >= CURRENT_DATE'
      : '';
    const result = await pool.query(
      `SELECT a.*, b.nom_officiel
       FROM activite a
       JOIN bibliotheque b ON b.id = a.bibliotheque_id
       WHERE a.bibliotheque_id = $1 ${dateFilter}
       ORDER BY a.date_activite DESC NULLS LAST
       LIMIT 20`,
      [req.params.biblioId]
    );
    res.json(result.rows);
  })
);

router.get(
  '/recentes',
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      `SELECT a.*, b.nom_officiel
       FROM activite a
       JOIN bibliotheque b ON b.id = a.bibliotheque_id
       WHERE b.statut_validation = 'valide'
         AND a.date_activite >= CURRENT_DATE
       ORDER BY a.date_activite ASC
       LIMIT 10`
    );
    res.json(result.rows);
  })
);

router.post(
  '/',
  authenticateToken,
  requireRole('administrateur', 'responsable_bibliotheque'),
  validate(createActiviteSchema),
  asyncHandler(async (req, res) => {
    const d = req.validated;
    const biblio = await pool.query('SELECT id FROM bibliotheque WHERE id = $1', [d.bibliotheque_id]);
    if (biblio.rows.length === 0) {
      return res.status(404).json({ message: 'Bibliothèque introuvable' });
    }
    const result = await pool.query(
      `INSERT INTO activite
        (bibliotheque_id, types_activites, frequence, public_participant,
         gratuites, date_activite, description, organise_activites)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true)
       RETURNING *`,
      [
        d.bibliotheque_id,
        d.types_activites || null,
        d.frequence || null,
        d.public_participant || null,
        d.gratuites || null,
        d.date_activite || null,
        d.description,
      ]
    );
    res.status(201).json(result.rows[0]);
  })
);

router.put(
  '/:id',
  authenticateToken,
  requireRole('administrateur', 'responsable_bibliotheque'),
  validateUUID('id'),
  validate(updateActiviteSchema),
  asyncHandler(async (req, res) => {
    const d = req.validated;
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, val] of Object.entries(d)) {
      fields.push(`${key} = $${idx++}`);
      values.push(val);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'Aucun champ à mettre à jour' });
    }

    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE activite SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Activité introuvable' });
    }
    res.json(result.rows[0]);
  })
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole('administrateur'),
  validateUUID('id'),
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      'DELETE FROM activite WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Activité introuvable' });
    }
    res.json({ deleted: true });
  })
);

module.exports = router;
