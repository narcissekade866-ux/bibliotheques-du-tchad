const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { validateUUID } = require('../middlewares/validateUUID');
const { upload, ALLOWED_MIMES } = require('../middlewares/upload');
const { pool } = require('../config/db');

const router = express.Router();

router.post(
  '/:bibliothequeId',
  authenticateToken,
  requireRole('administrateur'),
  validateUUID('bibliothequeId'),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier envoyé' });
    }

    const { fileTypeFromFile } = await import('file-type');
    const detected = await fileTypeFromFile(req.file.path);
    if (!detected || !ALLOWED_MIMES.has(detected.mime)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Le contenu réel du fichier ne correspond pas à un format image autorisé' });
    }

    const biblio = await pool.query(
      'SELECT id FROM bibliotheque WHERE id = $1',
      [req.params.bibliothequeId]
    );
    if (biblio.rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Bibliothèque introuvable' });
    }

    const type = req.body.type || 'photo';
    const url = `/uploads/${req.file.filename}`;

    const result = await pool.query(
      `INSERT INTO image (bibliotheque_id, type, url, ajoutee_par_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.bibliothequeId, type, url, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  })
);

router.delete(
  '/:imageId',
  authenticateToken,
  requireRole('administrateur'),
  validateUUID('imageId'),
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      'DELETE FROM image WHERE id = $1 RETURNING url',
      [req.params.imageId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Image introuvable' });
    }

    const filePath = path.join(__dirname, '../../uploads', path.basename(result.rows[0].url));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: 'Image supprimée' });
  })
);

module.exports = router;
