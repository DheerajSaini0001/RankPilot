import express from 'express';
import { protect } from '../middleware/auth.js';
import { catchAsync } from '../utils/catchAsync.js';
import {
    listGa4,
    listGsc,
    listGoogleAds,
    listFacebookAds,
    selectAccounts,
    getActiveAccounts,
    listSites,
    deleteSite,
    disconnectGoogle,
    disconnectFacebook
} from '../controllers/accountController.js';

const router = express.Router();
router.use(protect);

router.get('/ga4/list', catchAsync(listGa4));
router.get('/gsc/list', catchAsync(listGsc));
router.get('/google-ads/list', catchAsync(listGoogleAds));
router.get('/facebook-ads/list', catchAsync(listFacebookAds));
router.post('/select', catchAsync(selectAccounts));
router.get('/active', catchAsync(getActiveAccounts));
router.get('/sites', catchAsync(listSites));
router.delete('/sites/:siteId', catchAsync(deleteSite));
router.delete('/disconnect/google', catchAsync(disconnectGoogle));
router.delete('/disconnect/facebook', catchAsync(disconnectFacebook));

export default router;
