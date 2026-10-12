const express = require('express');
const { authenticateToken } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { validateUUID } = require('../middlewares/validateUUID');
const { pool } = require('../config/db');

const router = express.Router();

router.use(authenticateToken);

router.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT id, type, titre, message, bibliotheque_id, lue, created_at
     FROM notification
     WHERE destinataire_id = $1
     ORDER BY created_at DESC
     LIMIT 30`,
    [req.user.id]
  );
  res.json(result.rows);
}));

router.get('/non-lues', asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT COUNT(*) FROM notification WHERE destinataire_id = $1 AND lue = FALSE',
    [req.user.id]
  );
  res.json({ count: parseInt(result.rows[0].count, 10) });
}));

router.put('/:id/lue',
  validateUUID('id'),
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      `UPDATE notification SET lue = TRUE
       WHERE id = $1 AND destinataire_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification introuvable' });
    }
    res.json({ ok: true });
  })
);

router.put('/tout-lire', asyncHandler(async (req, res) => {
  await pool.query(
    'UPDATE notification SET lue = TRUE WHERE destinataire_id = $1 AND lue = FALSE',
    [req.user.id]
  );
  res.json({ ok: true });
}));

module.exports = router;
