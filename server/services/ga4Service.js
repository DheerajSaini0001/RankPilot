import { google } from 'googleapis';
import { getValidGoogleToken } from './googleAuthService.js';
import UserAccounts from '../models/UserAccounts.js';

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

    return res.data;
};
