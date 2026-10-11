const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(...paramNames) {
  return (req, res, next) => {
    for (const name of paramNames) {
      if (req.params[name] && !UUID_RE.test(req.params[name])) {
        return res.status(400).json({ message: 'Identifiant invalide' });
      }
    }
    next();
  };
}

module.exports = { validateUUID };
