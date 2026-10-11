function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON invalide' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Requête trop volumineuse' });
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'Origine non autorisée' });
  }

  if (err.code === '22P02') {
    return res.status(400).json({ message: 'Format de données invalide' });
  }

  if (err.code === '23505') {
    return res.status(409).json({ message: 'Cette entrée existe déjà' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ message: 'Référence invalide' });
  }

  console.error('[ERROR]', err.message, err.stack);
  res.status(500).json({ message: 'Erreur interne du serveur' });
}

module.exports = { errorHandler };
