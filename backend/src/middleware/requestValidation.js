export const validateBody = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }
    req.body = result.data;
    next();
  } catch (err) {
    next(err);
  }
};
