import express from 'express';
import { protect } from '../middleware/auth.js';
import { superAdminOnly } from '../middleware/superAdminOnly.js';
import {
    getConfig,
    getSingleConfig,
    saveConfig,
    bulkSaveConfig,
    testConfig
} from '../controllers/adminController.js';
import { catchAsync } from '../utils/catchAsync.js';

const router = express.Router();

router.use(protect);
router.use(superAdminOnly);

router.get('/config', catchAsync(getConfig));
router.get('/config/:key', catchAsync(getSingleConfig));
router.post('/config', catchAsync(saveConfig));
router.post('/config/bulk', catchAsync(bulkSaveConfig));
router.post('/config/test/:key', catchAsync(testConfig));

export default router;
