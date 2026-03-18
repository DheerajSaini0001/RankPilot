import { google } from 'googleapis';
import { getValidGoogleToken } from './googleAuthService.js';
import UserAccounts from '../models/UserAccounts.js';

export const listSites = async (userId) => {
    const auth = await getValidGoogleToken(userId);
    const searchconsole = google.webmasters({ version: 'v3', auth });

    const res = await searchconsole.sites.list();
    return res.data.siteEntry || [];
};

export const runQuery = async (userId, siteUrl, reportType, startDate, endDate, dimensions) => {
    // Caller provide siteUrl.
    if (!siteUrl) throw new Error('GSC_SITE_URL_MISSING');

    const auth = await getValidGoogleToken(userId);
    const searchconsole = google.webmasters({ version: 'v3', auth });

    const res = await searchconsole.searchanalytics.query({
        siteUrl: siteUrl,
        requestBody: {
            startDate,
            endDate,
            dimensions
        }
    });

    return res.data;
};

