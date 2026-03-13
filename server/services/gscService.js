import { google } from 'googleapis';
import { getValidGoogleToken } from './googleAuthService.js';
import UserAccounts from '../models/UserAccounts.js';

export const listSites = async (userId) => {
    const auth = await getValidGoogleToken(userId);
    const searchconsole = google.webmasters({ version: 'v3', auth });

    const res = await searchconsole.sites.list();
    return res.data.siteEntry || [];
};

export const runQuery = async (userId, reportType, startDate, endDate, dimensions) => {
    const account = await UserAccounts.findOne({ userId });
    if (!account || !account.gscSiteUrl) throw new Error('SOURCE_NOT_CONNECTED');

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

    return res.data;
};
