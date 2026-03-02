export const superAdminOnly = (req, res, next) => {
    if (!req.user || req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
};
