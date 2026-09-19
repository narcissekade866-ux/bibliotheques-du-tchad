const bibliothequeService = require('../services/bibliothequeService');

async function create(req, res) {
  const result = await bibliothequeService.create(req.validated, req.user.id);
  res.status(201).json(result);
}

async function getById(req, res) {
  const userRole = req.user?.role || 'visiteur';
  const biblio = await bibliothequeService.getById(req.params.id, userRole);
  if (!biblio) {
    return res.status(404).json({ message: 'Bibliothèque introuvable' });
  }
  res.json(biblio);
}

async function list(req, res) {
  const result = await bibliothequeService.list(req.validatedQuery);
  res.json(result);
}

async function update(req, res) {
  const result = await bibliothequeService.update(
    req.params.id,
    req.validated,
    req.user.id
  );
  if (result.error) {
    return res.status(result.status).json({ message: result.error });
  }
  res.json(result);
}

async function validateBiblio(req, res) {
  const { action, motif_rejet } = req.validated;
  const result = await bibliothequeService.validateBibliotheque(
    req.params.id,
    action,
    motif_rejet,
    req.user.id
  );
  if (result.error) {
    return res.status(result.status).json({ message: result.error });
  }
  res.json(result);
}

module.exports = { create, getById, list, update, validateBiblio };
