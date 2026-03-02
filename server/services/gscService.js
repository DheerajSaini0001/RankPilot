import { google } from 'googleapis';
import { getValidGoogleToken } from './googleAuthService.js';
import UserAccounts from '../models/UserAccounts.js';
import AnalyticsCache from '../models/AnalyticsCache.js';

const getCache = async (userId, source, reportType, accountId, dateRangeStart, dateRangeEnd) => {
    return await AnalyticsCache.findOne({ userId, source, reportType, accountId, dateRangeStart, dateRangeEnd, expiresAt: { $gt: new Date() } });
};

const setCache = async (userId, source, reportType, accountId, dateRangeStart, dateRangeEnd, data) => {
    const fetchedAt = new Date();
    const expiresAt = new Date(fetchedAt.getTime() + 30 * 60 * 1000);
    await AnalyticsCache.findOneAndUpdate(
        { userId, source, reportType, accountId, dateRangeStart, dateRangeEnd },
        { data, fetchedAt, expiresAt },
        { upsert: true }
    );
};

export const listSites = async (userId) => {
    const auth = await getValidGoogleToken(userId);
    const searchconsole = google.webmasters({ version: 'v3', auth });

    const res = await searchconsole.sites.list();
    return res.data.siteEntry || [];
};

export const runQuery = async (userId, reportType, startDate, endDate, dimensions) => {
    const account = await UserAccounts.findOne({ userId });
    if (!account || !account.gscSiteUrl) throw new Error('SOURCE_NOT_CONNECTED');

    const cached = await getCache(userId, 'gsc', reportType, account.gscSiteUrl, startDate, endDate);
    if (cached) return cached.data;

    const auth = await getValidGoogleToken(userId);
    const searchconsole = google.webmasters({ version: 'v3', auth });

    const res = await searchconsole.searchanalytics.query({
        siteUrl: account.gscSiteUrl,
        requestBody: {
            startDate,
            endDate,
            dimensions
        }
    });

    await setCache(userId, 'gsc', reportType, account.gscSiteUrl, startDate, endDate, res.data);
    return res.data;
};
