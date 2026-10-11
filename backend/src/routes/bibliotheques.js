const express = require('express');
const bibliothequeController = require('../controllers/bibliothequeController');
const { validate } = require('../middlewares/validate');
const { validateQuery } = require('../middlewares/validateQuery');
const { authenticateToken, requireRole, optionalAuth } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { validateUUID } = require('../middlewares/validateUUID');
const {
  createBibliothequeSchema,
  updateBibliothequeSchema,
  validationActionSchema,
  listQuerySchema,
} = require('../validators/bibliotheque');

const router = express.Router();

router.get('/', optionalAuth, validateQuery(listQuerySchema), asyncHandler(bibliothequeController.list));
router.get('/:id', optionalAuth, validateUUID('id'), asyncHandler(bibliothequeController.getById));

router.post(
  '/',
  authenticateToken,
  requireRole('administrateur', 'enqueteur', 'responsable_bibliotheque'),
  validate(createBibliothequeSchema),
  asyncHandler(bibliothequeController.create)
);

router.put(
  '/:id',
  authenticateToken,
  requireRole('administrateur', 'enqueteur', 'responsable_bibliotheque'),
  validateUUID('id'),
  validate(updateBibliothequeSchema),
  asyncHandler(bibliothequeController.update)
);

router.post(
  '/:id/validation',
  authenticateToken,
  requireRole('administrateur'),
  validateUUID('id'),
  validate(validationActionSchema),
  asyncHandler(bibliothequeController.validateBiblio)
);

module.exports = router;
