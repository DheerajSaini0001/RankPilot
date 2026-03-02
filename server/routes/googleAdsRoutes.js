import express from 'express';
import { protect } from '../middleware/auth.js';
import { catchAsync } from '../utils/catchAsync.js';
import { getOverview, getCampaigns, getAdgroups, getKeywords, getTimeseries, getCompare } from '../controllers/googleAdsController.js';

const router = express.Router();
router.use(protect);

router.get('/overview', catchAsync(getOverview));
router.get('/campaigns', catchAsync(getCampaigns));
router.get('/adgroups', catchAsync(getAdgroups));
router.get('/keywords', catchAsync(getKeywords));
router.get('/timeseries', catchAsync(getTimeseries));
router.get('/compare', catchAsync(getCompare));

export default router;
