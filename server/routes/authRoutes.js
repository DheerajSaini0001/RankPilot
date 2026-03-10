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

const router = express.Router();

router.post('/register', catchAsync(register));
router.get('/verify-email/:token', catchAsync(verifyEmail));
router.post('/login', catchAsync(login));
router.post('/logout', protect, catchAsync(logout));
router.post('/forgot-password', catchAsync(forgotPassword));
router.post('/reset-password', catchAsync(resetPassword));
router.post('/resend-verification', catchAsync(resendVerification));

// Google Auth
router.get('/google', (req, res, next) => {
    passport.authenticate('google', { 
        scope: ['profile', 'email', 'https://www.googleapis.com/auth/analytics.readonly', 'https://www.googleapis.com/auth/webmasters.readonly', 'https://www.googleapis.com/auth/adwords'], 
        accessType: 'offline', 
        prompt: 'consent',
        state: req.query.token
    })(req, res, next);
});
router.get('/google/callback', attachUserFromState, passport.authenticate('google', { session: false, failureRedirect: '/login' }), catchAsync(authCallback));

// Facebook Auth
router.get('/facebook', (req, res, next) => {
    passport.authenticate('facebook', { 
        scope: ['email', 'public_profile', 'ads_read', 'ads_management', 'business_management'],
        state: req.query.token
    })(req, res, next);
});
router.get('/facebook/callback', attachUserFromState, passport.authenticate('facebook', { session: false, failureRedirect: '/login' }), catchAsync(authCallback));

router.get('/me', protect, catchAsync(getMe));
router.delete('/me', protect, catchAsync(deleteMe));

export default router;
