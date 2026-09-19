const express = require('express');
const { pool } = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  const result = await pool.query(
    `SELECT id, nom, statut, centre_lat, centre_long, zoom_defaut
     FROM ville WHERE statut != 'desactivee' ORDER BY nom`
  );
  res.json(result.rows);
});

router.get('/:id/subdivisions', async (req, res) => {
  const result = await pool.query(
    `SELECT id, nom, type
     FROM subdivision_administrative
     WHERE ville_id = $1 ORDER BY nom`,
    [req.params.id]
  );
  res.json(result.rows);
});

module.exports = router;
