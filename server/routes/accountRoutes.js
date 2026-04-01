import express from 'express';
import { protect } from '../middleware/auth.js';
import { catchAsync } from '../utils/catchAsync.js';
import {
    listGa4,
    listGsc,
    listGoogleAds,
    listGoogleAccounts,
    listFacebookAds,
    listFacebookAccounts,
    selectAccounts,
    getActiveAccounts,
    listSites,
    deleteSite,
    disconnectGoogle,
    disconnectFacebook,
    resumeHistoricalSync
} from '../controllers/accountController.js';

import { validate } from '../middleware/validate.js';
import { selectAccountsSchema, siteIdParamSchema, resumeSyncSchema } from '../schemas/accountSchema.js';

const router = express.Router();
router.use(protect);

router.get('/ga4/list', catchAsync(listGa4));
router.get('/gsc/list', catchAsync(listGsc));
router.get('/google-ads/list', catchAsync(listGoogleAds));
router.get('/google/accounts', catchAsync(listGoogleAccounts));
router.get('/facebook-ads/list', catchAsync(listFacebookAds));
router.get('/facebook/accounts', catchAsync(listFacebookAccounts));
router.post('/select', validate(selectAccountsSchema), catchAsync(selectAccounts));
router.get('/active', catchAsync(getActiveAccounts));
router.get('/sites', catchAsync(listSites));
router.delete('/sites/:siteId', validate(siteIdParamSchema), catchAsync(deleteSite));
router.delete('/disconnect/google', catchAsync(disconnectGoogle));
router.delete('/disconnect/facebook', catchAsync(disconnectFacebook));
router.post('/resume-sync', validate(resumeSyncSchema), catchAsync(resumeHistoricalSync));

export default router;
