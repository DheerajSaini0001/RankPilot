import { google } from 'googleapis';
import { getValidGoogleToken } from './googleAuthService.js';
import UserAccounts from '../models/UserAccounts.js';
import AnalyticsCache from '../models/AnalyticsCache.js';

const getCache = async (userId, source, reportType, accountId, dateRangeStart, dateRangeEnd) => {
    return await AnalyticsCache.findOne({ userId, source, reportType, accountId, dateRangeStart, dateRangeEnd, expiresAt: { $gt: new Date() } });
};

const setCache = async (userId, source, reportType, accountId, dateRangeStart, dateRangeEnd, data) => {
    const fetchedAt = new Date();
    const expiresAt = new Date(fetchedAt.getTime() + 30 * 60 * 1000); // 30 min TTL
    await AnalyticsCache.findOneAndUpdate(
        { userId, source, reportType, accountId, dateRangeStart, dateRangeEnd },
        { data, fetchedAt, expiresAt },
        { upsert: true }
    );
};

export const listProperties = async (userId) => {
    const auth = await getValidGoogleToken(userId);
    const analyticsadmin = google.analyticsadmin({ version: 'v1beta', auth });

    const res = await analyticsadmin.accountSummaries.list();
    const properties = [];
    if (res.data.accountSummaries) {
        for (const account of res.data.accountSummaries) {
            if (account.propertySummaries) {
                for (const prop of account.propertySummaries) {
                    properties.push({ id: prop.property, name: prop.displayName, accountId: account.account });
                }
            }
        }
    }
    return properties;
};

// Implements other ga4 queries...
export const runReport = async (userId, reportType, startDate, endDate, dimensions, metrics) => {
    const account = await UserAccounts.findOne({ userId });
    if (!account || !account.ga4PropertyId) throw new Error('SOURCE_NOT_CONNECTED');

    const cached = await getCache(userId, 'ga4', reportType, account.ga4PropertyId, startDate, endDate);
    if (cached) return cached.data;

    const auth = await getValidGoogleToken(userId);
    const analyticsdata = google.analyticsdata({ version: 'v1beta', auth });

    const res = await analyticsdata.properties.runReport({
        property: account.ga4PropertyId,
        requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: dimensions.map(d => ({ name: d })),
            metrics: metrics.map(m => ({ name: m }))
        }
    });

    await setCache(userId, 'ga4', reportType, account.ga4PropertyId, startDate, endDate, res.data);
    return res.data;
};
