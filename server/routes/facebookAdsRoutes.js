import express from 'express';
import { protect } from '../middleware/auth.js';
import { catchAsync } from '../utils/catchAsync.js';
import { getOverview, getCampaigns, getAdsets, getAds, getTimeseries, getCompare } from '../controllers/facebookAdsController.js';

const router = express.Router();
router.use(protect);

router.get('/overview', catchAsync(getOverview));
router.get('/campaigns', catchAsync(getCampaigns));
router.get('/adsets', catchAsync(getAdsets));
router.get('/ads', catchAsync(getAds));
router.get('/timeseries', catchAsync(getTimeseries));
router.get('/compare', catchAsync(getCompare));

export default router;
