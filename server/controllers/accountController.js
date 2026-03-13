import UserAccounts from '../models/UserAccounts.js';
import GoogleToken from '../models/GoogleToken.js';
import FacebookToken from '../models/FacebookToken.js';
import User from '../models/User.js';
import { listProperties } from '../services/ga4Service.js';
import { listSites } from '../services/gscService.js';
import { listAccounts } from '../services/googleAdsService.js';
import { listAdAccounts } from '../services/facebookAdsService.js';
import { syncHistoricalData } from '../services/syncService.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';
import crypto from 'crypto';

export const listGa4 = async (req, res) => {
    try {
        const properties = await listProperties(req.user._id);
        res.status(200).json(properties);
    } catch (error) {
        if (error.message.includes('No refresh token is set')) {
            return res.status(401).json({ success: false, message: 'GOOGLE_AUTH_MISSING' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

export const listGsc = async (req, res) => {
    try {
        const sites = await listSites(req.user._id);
        res.status(200).json(sites);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const listGoogleAds = async (req, res) => {
    try {
        const accounts = await listAccounts(req.user._id);
        res.status(200).json(accounts);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const listFacebookAds = async (req, res) => {
    try {
        const accounts = await listAdAccounts(req.user._id);
        res.status(200).json(accounts);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const selectAccounts = async (req, res) => {
    const updates = {};
    const fields = [
        'ga4PropertyId', 'ga4PropertyName', 'ga4AccountId',
        'gscSiteUrl', 'gscPermission',
        'googleAdsCustomerId', 'googleAdsAccountName', 'googleAdsCurrencyCode',
        'facebookAdAccountId', 'facebookAdAccountName', 'facebookAdCurrency'
    ];

    fields.forEach(field => {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
        }
    });

    const oldAccount = await UserAccounts.findOne({ userId: req.user._id });
    
    const account = await UserAccounts.findOneAndUpdate(
        { userId: req.user._id },
        { $set: updates },
        { upsert: true, returnDocument: 'after' }
    );

    // Only trigger sync if IDs changed and are not empty
    if (updates.ga4PropertyId && updates.ga4PropertyId !== oldAccount?.ga4PropertyId) {
        syncHistoricalData(req.user._id, 'ga4', 5).catch(e => console.error('BG Sync Fail GA4:', e));
    }
    if (updates.gscSiteUrl && updates.gscSiteUrl !== oldAccount?.gscSiteUrl) {
        syncHistoricalData(req.user._id, 'gsc', 5).catch(e => console.error('BG Sync Fail GSC:', e));
    }
    if (updates.googleAdsCustomerId && updates.googleAdsCustomerId !== oldAccount?.googleAdsCustomerId) {
        syncHistoricalData(req.user._id, 'google-ads', 5).catch(e => console.error('BG Sync Fail Google Ads:', e));
    }
    if (updates.facebookAdAccountId && updates.facebookAdAccountId !== oldAccount?.facebookAdAccountId) {
        syncHistoricalData(req.user._id, 'facebook-ads', 5).catch(e => console.error('BG Sync Fail Facebook Ads:', e));
    }

    res.status(200).json({ message: 'Accounts selected', accounts: account });
};

export const getActiveAccounts = async (req, res) => {
    const account = await UserAccounts.findOne({ userId: req.user._id });
    res.status(200).json(account || {});
};

export const disconnectGoogle = async (req, res) => {
    const user = await User.findById(req.user._id);

    await GoogleToken.deleteOne({ userId: req.user._id });
    await UserAccounts.findOneAndUpdate({ userId: req.user._id }, {
        $unset: { ga4PropertyId: "", ga4PropertyName: "", ga4AccountId: "", gscSiteUrl: "", gscPermission: "", googleAdsCustomerId: "", googleAdsAccountName: "", googleAdsCurrencyCode: "" }
    });

    let oauthOnly = false;
    if (!user.passwordHash) {
        oauthOnly = true;
        user.passwordResetToken = crypto.randomUUID();
        user.passwordResetExp = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        await user.save();
        try {
            await sendPasswordResetEmail(user.email, user.passwordResetToken);
        } catch (emailErr) {
            console.error('Password setup email failed after Google disconnect:', emailErr.message);
        }
    }

    res.status(200).json({ message: 'Google disconnected', oauthOnly });
};

export const disconnectFacebook = async (req, res) => {
    await FacebookToken.deleteOne({ userId: req.user._id });
    await UserAccounts.findOneAndUpdate({ userId: req.user._id }, {
        $unset: { facebookAdAccountId: "", facebookAdAccountName: "", facebookAdCurrency: "" }
    });
    res.status(200).json({ message: 'Facebook disconnected' });
};
