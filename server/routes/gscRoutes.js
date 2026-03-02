import express from 'express';
import { protect } from '../middleware/auth.js';
import { catchAsync } from '../utils/catchAsync.js';
import { getOverview, getQueries, getPages, getDevices, getCountries, getTimeseries } from '../controllers/gscController.js';

const router = express.Router();
router.use(protect);

router.get('/overview', catchAsync(getOverview));
router.get('/queries', catchAsync(getQueries));
router.get('/pages', catchAsync(getPages));
router.get('/devices', catchAsync(getDevices));
router.get('/countries', catchAsync(getCountries));
router.get('/timeseries', catchAsync(getTimeseries));

export default router;
