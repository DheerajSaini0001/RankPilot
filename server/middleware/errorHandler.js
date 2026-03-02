export const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json({
        success: false,
        message: statusCode === 500 ? 'An unexpected error occurred.' : message,
        code: err.code || 'SERVER_ERROR'
    });
};
