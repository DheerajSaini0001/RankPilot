import express from 'express';
import { protect } from '../middleware/auth.js';
import { catchAsync } from '../utils/catchAsync.js';
import { getOverview, getTimeseries, getTraffic, getPages, getDevices, getGeo, getCompare } from '../controllers/ga4Controller.js';

const router = express.Router();
router.use(protect);

router.get('/overview', catchAsync(getOverview));
router.get('/timeseries', catchAsync(getTimeseries));
router.get('/traffic', catchAsync(getTraffic));
router.get('/pages', catchAsync(getPages));
router.get('/devices', catchAsync(getDevices));
router.get('/geo', catchAsync(getGeo));
router.get('/compare', catchAsync(getCompare));

export default router;
