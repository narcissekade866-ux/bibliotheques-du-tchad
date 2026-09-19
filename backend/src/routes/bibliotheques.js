const express = require('express');
const bibliothequeController = require('../controllers/bibliothequeController');
const { validate } = require('../middlewares/validate');
const { validateQuery } = require('../middlewares/validateQuery');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const {
  createBibliothequeSchema,
  updateBibliothequeSchema,
  validationActionSchema,
  listQuerySchema,
} = require('../validators/bibliotheque');

const router = express.Router();

router.get(
  '/',
  validateQuery(listQuerySchema),
  bibliothequeController.list
);

router.get('/:id', bibliothequeController.getById);

router.post(
  '/',
  authenticateToken,
  requireRole('administrateur', 'enqueteur', 'responsable_bibliotheque'),
  validate(createBibliothequeSchema),
  bibliothequeController.create
);

router.put(
  '/:id',
  authenticateToken,
  requireRole('administrateur', 'enqueteur', 'responsable_bibliotheque'),
  validate(updateBibliothequeSchema),
  bibliothequeController.update
);

router.post(
  '/:id/validation',
  authenticateToken,
  requireRole('administrateur'),
  validate(validationActionSchema),
  bibliothequeController.validateBiblio
);

module.exports = router;
