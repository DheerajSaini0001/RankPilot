import UserAccounts from '../models/UserAccounts.js';
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
        const sites = await fetchGscSites(req.user._id);
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
        'facebookAdAccountId', 'facebookAdAccountName', 'facebookAdCurrency',
        'siteName'
    ];

    fields.forEach(field => {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
        }
    });

    const siteId = req.body.siteId;
    let account;

    if (siteId) {
        account = await UserAccounts.findOneAndUpdate(
            { _id: siteId, userId: req.user._id },
            { $set: updates },
            { returnDocument: 'after' }
        );
    } else {
        account = await UserAccounts.findOneAndUpdate(
            { userId: req.user._id, siteName: updates.siteName || 'My Website' },
            { $set: updates },
            { upsert: true, returnDocument: 'after' }
        );
    }

    if (!account) return res.status(404).json({ message: 'Account not found' });

    // Only trigger sync if IDs were provided in this update
    if (updates.ga4PropertyId) {
        syncHistoricalData(account._id, 'ga4', 5).catch(e => console.error('BG Sync Fail GA4:', e));
    }
    if (updates.gscSiteUrl) {
        syncHistoricalData(account._id, 'gsc', 5).catch(e => console.error('BG Sync Fail GSC:', e));
    }
    if (updates.googleAdsCustomerId) {
        syncHistoricalData(account._id, 'google-ads', 5).catch(e => console.error('BG Sync Fail Google Ads:', e));
    }
    if (updates.facebookAdAccountId) {
        syncHistoricalData(account._id, 'facebook-ads', 5).catch(e => console.error('BG Sync Fail Facebook Ads:', e));
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
        // We only delete metrics if no other site for this user is using the same platform account
        for (const pid of platformIds) {
            const otherSiteUsingThis = await UserAccounts.findOne({
                userId,
                _id: { $ne: siteId },
                $or: [
                    { ga4PropertyId: pid },
                    { gscSiteUrl: pid },
                    { googleAdsCustomerId: pid },
                    { facebookAdAccountId: pid }
                ]
            });

            if (!otherSiteUsingThis) {
                await DailyMetric.deleteMany({ userId, platformAccountId: pid });
            }
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
    const user = await User.findById(req.user._id);

    await GoogleToken.deleteOne({ userId: req.user._id });
    // When disconnecting Google, we should probably unset from ALL sites or just the current one?
    // Disconnecting the token affects ALL sites because they share the Google token.
    await UserAccounts.updateMany({ userId: req.user._id }, {
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
    await UserAccounts.updateMany({ userId: req.user._id }, {
        $unset: { facebookAdAccountId: "", facebookAdAccountName: "", facebookAdCurrency: "" }
    });
    res.status(200).json({ message: 'Facebook disconnected' });
};

