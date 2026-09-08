export const validateBody = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstError = result.error.errors[0]?.message || 'Validation failed';
      const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return res.status(400).json({
        success: false,
        error: firstError,
        details: errors
      });
    }
    req.body = result.data;
    next();
  } catch (err) {
    next(err);
  }
};
