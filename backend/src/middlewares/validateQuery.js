function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        message: 'Paramètres invalides',
        errors: result.error.issues.map((i) => ({
          champ: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    req.validatedQuery = result.data;
    next();
  };
}

module.exports = { validateQuery };
