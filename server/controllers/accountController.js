import UserAccounts from '../models/UserAccounts.js';
import mongoose from 'mongoose';
import GoogleToken from '../models/GoogleToken.js';
import FacebookToken from '../models/FacebookToken.js';
import DailyMetric from '../models/DailyMetric.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import WeeklyInsight from '../models/WeeklyInsight.js';
import User from '../models/User.js';
import { listProperties } from '../services/ga4Service.js';
import { listSites as fetchGscSites } from '../services/gscService.js';
import { listAccounts } from '../services/googleAdsService.js';
import { listAdAccounts } from '../services/facebookAdsService.js';
import { syncHistoricalData } from '../services/syncService.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';
import crypto from 'crypto';

// Helper to cleanup metrics if they are no longer used by any other site of the user
async function cleanupMetrics(userId, platformAccountId) {
    if (!platformAccountId) return;
    const otherSiteUsingThis = await UserAccounts.findOne({
        userId,
        $or: [
            { ga4PropertyId: platformAccountId },
            { gscSiteUrl: platformAccountId },
            { googleAdsCustomerId: platformAccountId },
            { facebookAdAccountId: platformAccountId }
        ]
    });

    if (!otherSiteUsingThis) {
        console.log(`[Cleanup] Deleting metrics for unused platform account: ${platformAccountId}`);
        await DailyMetric.deleteMany({ 'metadata.userId': userId, 'metadata.platformAccountId': platformAccountId });
    }
}

export const listGa4 = async (req, res) => {
    try {
        const { tokenId } = req.query;
        const properties = await listProperties(req.user._id, tokenId);
        res.status(200).json(properties);
    } catch (error) {
        if (error.message.includes('GOOGLE_AUTH_MISSING')) {
            return res.status(401).json({ success: false, message: 'GOOGLE_AUTH_MISSING' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

export const listGsc = async (req, res) => {
    try {
        const { tokenId } = req.query;
        const sites = await fetchGscSites(req.user._id, tokenId);
        res.status(200).json(sites);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const listGoogleAds = async (req, res) => {
    try {
        const { tokenId } = req.query;
        const accounts = await listAccounts(req.user._id, tokenId);
        res.status(200).json(accounts);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const listGoogleAccounts = async (req, res) => {
    try {
        const accounts = await GoogleToken.find({ userId: req.user._id }).select('email googleId updatedAt');
        res.status(200).json(accounts);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const listFacebookAds = async (req, res) => {
    try {
        const { tokenId } = req.query;
        const accounts = await listAdAccounts(req.user._id, tokenId);
        res.status(200).json(accounts);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const listFacebookAccounts = async (req, res) => {
    try {
        const accounts = await FacebookToken.find({ userId: req.user._id }).select('name facebookUserId updatedAt');
        res.status(200).json(accounts);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const selectAccounts = async (req, res) => {
    const updates = {};
    const fields = [
        'ga4PropertyId', 'ga4PropertyName', 'ga4AccountId', 'ga4TokenId',
        'gscSiteUrl', 'gscPermission', 'gscTokenId',
        'googleAdsCustomerId', 'googleAdsAccountName', 'googleAdsCurrencyCode', 'googleAdsTokenId',
        'facebookAdAccountId', 'facebookAdAccountName', 'facebookAdCurrencyCode', 'facebookTokenId',
        'siteName'
    ];

    fields.forEach(field => {
        if (req.body[field] !== undefined) {
            let value = req.body[field];
            // Fix: Mongoose fails to cast empty string to ObjectId. Convert to null instead.
            if (['ga4TokenId', 'gscTokenId', 'googleAdsTokenId', 'facebookTokenId'].includes(field) && value === "") {
                value = null;
            }
            updates[field] = value;
        }
    });

    const siteId = req.body.siteId;
    let existingAccount;

    if (siteId && siteId.match(/^[0-9a-fA-F]{24}$/)) {
        existingAccount = await UserAccounts.findOne({ _id: siteId, userId: req.user._id });
    } else {
        existingAccount = await UserAccounts.findOne({ 
            userId: req.user._id, 
            siteName: updates.siteName || 'My Website' 
        });
    }

    const account = await UserAccounts.findOneAndUpdate(
        { userId: req.user._id, _id: existingAccount?._id || new mongoose.Types.ObjectId() },
        { $set: updates },
        { upsert: true, returnDocument: 'after' }
    );

    if (!account) return res.status(500).json({ message: 'Failed to create or update account' });
    
    // Condition for sync: ID must be present in updates AND must be different from what was previously saved
    const shouldSync = (field, currentVal) => {
        return updates[field] && updates[field] !== currentVal;
    };

    if (shouldSync('ga4PropertyId', existingAccount?.ga4PropertyId)) {
        if (existingAccount?.ga4PropertyId) cleanupMetrics(req.user._id, existingAccount.ga4PropertyId);
        syncHistoricalData(account._id, 'ga4').catch(e => console.error('Initial GA4 Sync Fail:', e));
    }
    if (shouldSync('gscSiteUrl', existingAccount?.gscSiteUrl)) {
        if (existingAccount?.gscSiteUrl) cleanupMetrics(req.user._id, existingAccount.gscSiteUrl);
        syncHistoricalData(account._id, 'gsc').catch(e => console.error('Initial GSC Sync Fail:', e));
    }
    if (shouldSync('googleAdsCustomerId', existingAccount?.googleAdsCustomerId)) {
        if (existingAccount?.googleAdsCustomerId) cleanupMetrics(req.user._id, existingAccount.googleAdsCustomerId);
        syncHistoricalData(account._id, 'google-ads').catch(e => console.error('Initial Google Ads Sync Fail:', e));
    }
    if (shouldSync('facebookAdAccountId', existingAccount?.facebookAdAccountId)) {
        if (existingAccount?.facebookAdAccountId) cleanupMetrics(req.user._id, existingAccount.facebookAdAccountId);
        syncHistoricalData(account._id, 'facebook-ads').catch(e => console.error('Initial Facebook Ads Sync Fail:', e));
    }

    res.status(200).json({ message: 'Accounts selected', accounts: account });
};

export const getActiveAccounts = async (req, res) => {
    const { siteId } = req.query;
    let account;
    if (siteId && siteId !== 'undefined') {
        account = await UserAccounts.findOne({ _id: siteId, userId: req.user._id });
    } else {
        account = await UserAccounts.findOne({ userId: req.user._id }).sort({ updatedAt: -1 });
    }
    res.status(200).json(account || {});
};

export const listSites = async (req, res) => {
    try {
        const sites = await UserAccounts.find({ userId: req.user._id }).sort({ updatedAt: -1 });
        res.status(200).json(sites);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteSite = async (req, res) => {
    try {
        const { siteId } = req.params;
        const userId = req.user._id;

        // 1. Find the account to get platform specific IDs before deletion
        const account = await UserAccounts.findOne({ _id: siteId, userId });
        if (!account) return res.status(404).json({ message: 'Site not found' });

        const platformIds = [
            account.ga4PropertyId,
            account.gscSiteUrl,
            account.googleAdsCustomerId,
            account.facebookAdAccountId
        ].filter(Boolean);

        // 2. Delete conversations and their messages
        const conversations = await Conversation.find({ siteId, userId });
        const convIds = conversations.map(c => c._id);
        
        if (convIds.length > 0) {
            await Message.deleteMany({ conversationId: { $in: convIds } });
            await Conversation.deleteMany({ _id: { $in: convIds } });
        }

        // 3. Delete weekly insights
        await WeeklyInsight.deleteMany({ siteId, userId });

        // 4. Delete daily metrics
        for (const pid of platformIds) {
            await cleanupMetrics(userId, pid);
        }

        // 5. Finally delete the site record
        await UserAccounts.deleteOne({ _id: siteId, userId });

        res.status(200).json({ message: 'Site and all associated data deleted successfully' });
    } catch (error) {
        console.error('Delete Site Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const disconnectGoogle = async (req, res) => {
    const { tokenId } = req.body; // Allow disconnecting a specific Google account
    const user = await User.findById(req.user._id);

    if (tokenId) {
        const affectedAccounts = await UserAccounts.find({
            userId: req.user._id,
            $or: [{ ga4TokenId: tokenId }, { gscTokenId: tokenId }, { googleAdsTokenId: tokenId }]
        });

        await GoogleToken.deleteOne({ _id: tokenId, userId: req.user._id });

        // Unset services using this specific token
        await UserAccounts.updateMany({ userId: req.user._id, ga4TokenId: tokenId }, {
            $unset: { 
                ga4PropertyId: "", ga4PropertyName: "", ga4AccountId: "", ga4TokenId: "",
                ga4SyncStatus: "", ga4SyncProgress: "", ga4HistoricalComplete: "", ga4HistoricalMonthIndex: ""
            }
        });
        await UserAccounts.updateMany({ userId: req.user._id, gscTokenId: tokenId }, {
            $unset: { 
                gscSiteUrl: "", gscPermission: "", gscTokenId: "",
                gscSyncStatus: "", gscSyncProgress: "", gscHistoricalComplete: "", gscHistoricalMonthIndex: ""
            }
        });
        await UserAccounts.updateMany({ userId: req.user._id, googleAdsTokenId: tokenId }, {
            $unset: { 
                googleAdsCustomerId: "", googleAdsAccountName: "", googleAdsCurrencyCode: "", googleAdsTokenId: "",
                googleAdsSyncStatus: "", googleAdsSyncProgress: "", googleAdsHistoricalComplete: "", googleAdsHistoricalMonthIndex: ""
            }
        });

        // Cleanup metrics for ALL affected platforms
        for (const acc of affectedAccounts) {
            if (acc.ga4TokenId?.toString() === tokenId) await cleanupMetrics(req.user._id, acc.ga4PropertyId);
            if (acc.gscTokenId?.toString() === tokenId) await cleanupMetrics(req.user._id, acc.gscSiteUrl);
            if (acc.googleAdsTokenId?.toString() === tokenId) await cleanupMetrics(req.user._id, acc.googleAdsCustomerId);
        }
    } else {
        // Broad disconnect (legacy behavior or full disconnect)
        await GoogleToken.deleteMany({ userId: req.user._id });
        await UserAccounts.updateMany({ userId: req.user._id }, {
            $unset: {
                ga4PropertyId: "", ga4PropertyName: "", ga4AccountId: "", ga4TokenId: "",
                gscSiteUrl: "", gscPermission: "", gscTokenId: "",
                googleAdsCustomerId: "", googleAdsAccountName: "", googleAdsCurrencyCode: "", googleAdsTokenId: ""
            }
        });
    }

    const remainingTokens = await GoogleToken.countDocuments({ userId: req.user._id });
    let oauthOnly = false;

    // If no Google accounts left and no password, send reset email
    if (remainingTokens === 0 && !user.passwordHash) {
        oauthOnly = true;
        user.passwordResetToken = crypto.randomUUID();
        user.passwordResetExp = Date.now() + 24 * 60 * 60 * 1000;
        await user.save();
        try {
            await sendPasswordResetEmail(user.email, user.passwordResetToken);
        } catch (emailErr) {
            console.error('Password setup email failed:', emailErr.message);
        }
    }

    res.status(200).json({ message: tokenId ? 'Google account disconnected' : 'All Google accounts disconnected', oauthOnly });
};

export const disconnectFacebook = async (req, res) => {
    const { tokenId } = req.body;
    if (tokenId) {
        const affectedAccounts = await UserAccounts.find({ userId: req.user._id, facebookTokenId: tokenId });
        await FacebookToken.deleteOne({ _id: tokenId, userId: req.user._id });
        await UserAccounts.updateMany({ userId: req.user._id, facebookTokenId: tokenId }, {
            $unset: { 
                facebookAdAccountId: "", facebookAdAccountName: "", facebookAdCurrencyCode: "", facebookTokenId: "",
                facebookAdsSyncStatus: "", facebookAdsSyncProgress: "", facebookAdsHistoricalComplete: "", facebookAdsHistoricalMonthIndex: ""
            }
        });
        for (const acc of affectedAccounts) {
            await cleanupMetrics(req.user._id, acc.facebookAdAccountId);
        }
    } else {
        const affectedAccounts = await UserAccounts.find({ userId: req.user._id });
        await FacebookToken.deleteMany({ userId: req.user._id });
        await UserAccounts.updateMany({ userId: req.user._id }, {
            $unset: { 
                facebookAdAccountId: "", facebookAdAccountName: "", facebookAdCurrencyCode: "", facebookTokenId: "",
                facebookAdsSyncStatus: "", facebookAdsSyncProgress: "", facebookAdsHistoricalComplete: "", facebookAdsHistoricalMonthIndex: ""
            }
        });
        for (const acc of affectedAccounts) {
            await cleanupMetrics(req.user._id, acc.facebookAdAccountId);
        }
    }
    res.status(200).json({ message: tokenId ? 'Facebook account disconnected' : 'All Facebook accounts disconnected' });
};

