function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: result.error.issues.map((i) => ({
          champ: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    req.validated = result.data;
    next();
  };
}

module.exports = { validate };
