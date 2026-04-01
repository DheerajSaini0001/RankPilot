import express from 'express';
import passport from 'passport';
import {
    register,
    verifyEmail,
    login,
    logout,
    forgotPassword,
    resetPassword,
    resendVerification,
    getMe,
    deleteMe,
    authCallback
} from '../controllers/authController.js';
import { protect, attachUserFromState } from '../middleware/auth.js';
import { catchAsync } from '../utils/catchAsync.js';
import { authLimiter, sensitiveActionLimiter } from '../middleware/rateLimiter.js';

import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/authSchema.js';

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), catchAsync(register));
router.get('/verify-email/:token', catchAsync(verifyEmail));
router.post('/login', authLimiter, validate(loginSchema), catchAsync(login));
router.post('/logout', protect, catchAsync(logout));
router.post('/forgot-password', sensitiveActionLimiter, validate(forgotPasswordSchema), catchAsync(forgotPassword));
router.post('/reset-password', sensitiveActionLimiter, validate(resetPasswordSchema), catchAsync(resetPassword));
router.post('/resend-verification', sensitiveActionLimiter, catchAsync(resendVerification));

// Google Auth
router.get('/google', (req, res, next) => {
    passport.authenticate('google', { 
        scope: ['profile', 'email', 'https://www.googleapis.com/auth/analytics.readonly', 'https://www.googleapis.com/auth/webmasters.readonly', 'https://www.googleapis.com/auth/adwords'], 
        accessType: 'offline', 
        prompt: 'consent',
        state: req.query.token
    })(req, res, next);
});
router.get('/google/callback', attachUserFromState, passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login` }), catchAsync(authCallback));

// Facebook Auth
router.get('/facebook', (req, res, next) => {
    passport.authenticate('facebook', { 
        scope: ['email', 'public_profile', 'ads_read', 'ads_management', 'business_management'],
        state: req.query.token
    })(req, res, next);
});
router.get('/facebook/callback', attachUserFromState, passport.authenticate('facebook', { session: false, failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login` }), catchAsync(authCallback));

router.get('/me', protect, catchAsync(getMe));
router.delete('/me', protect, catchAsync(deleteMe));

export default router;
