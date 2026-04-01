import express from 'express';
import { getDashboardSummary, getGa4Summary, getGscSummary, getGoogleAdsSummary, getFacebookAdsSummary, syncAccountData } from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';
import { syncLimiter } from '../middleware/rateLimiter.js';

import { validate } from '../middleware/validate.js';
import { analyticsQuerySchema, syncDataSchema } from '../schemas/analyticsSchema.js';

const router = express.Router();

router.get('/dashboard-summary', protect, validate(analyticsQuerySchema), getDashboardSummary);
router.get('/ga4-summary', protect, validate(analyticsQuerySchema), getGa4Summary);
router.get('/gsc-summary', protect, validate(analyticsQuerySchema), getGscSummary);
router.get('/google-ads-summary', protect, validate(analyticsQuerySchema), getGoogleAdsSummary);
router.get('/facebook-ads-summary', protect, validate(analyticsQuerySchema), getFacebookAdsSummary);
router.post('/sync', protect, syncLimiter, validate(syncDataSchema), syncAccountData);

export default router;
