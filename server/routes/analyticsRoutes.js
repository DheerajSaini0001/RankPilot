import express from 'express';
import { getDashboardSummary, getGa4Summary, getGscSummary, getGoogleAdsSummary, getFacebookAdsSummary, syncAccountData } from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard-summary', protect, getDashboardSummary);
router.get('/ga4-summary', protect, getGa4Summary);
router.get('/gsc-summary', protect, getGscSummary);
router.get('/google-ads-summary', protect, getGoogleAdsSummary);
router.get('/facebook-ads-summary', protect, getFacebookAdsSummary);
router.post('/sync', protect, syncAccountData);

export default router;
