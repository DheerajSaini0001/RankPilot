export const validate = (schema) => (req, res, next) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                success: false,
                message: 'Validation Failed',
                errors: (error.errors || []).map((err) => ({
                    path: err.path.slice(1).join('.'), // Remove 'body', 'query', etc. from path
                    message: err.message,
                })),
                code: 'VALIDATION_ERROR'
            });
        }
        next(error);
    }
};
