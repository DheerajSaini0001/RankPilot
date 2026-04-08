import { google } from 'googleapis';
import { getValidGoogleToken } from './googleAuthService.js';
import UserAccounts from '../models/UserAccounts.js';

export const listSites = async (userId, tokenId = null) => {
    const auth = await getValidGoogleToken(userId, tokenId);
    const searchconsole = google.webmasters({ version: 'v3', auth });

    const res = await searchconsole.sites.list();
    return res.data.siteEntry || [];
};

export const runQuery = async (userId, siteUrl, reportType, startDate, endDate, dimensions, tokenId = null) => {
    // Caller provide siteUrl.
    if (!siteUrl) throw new Error('GSC_SITE_URL_MISSING');

    const auth = await getValidGoogleToken(userId, tokenId);
    const searchconsole = google.webmasters({ version: 'v3', auth });

    let allRows = [];
    let startRow = 0;
    const rowLimit = 25000;

    while (true) {
        const res = await searchconsole.searchanalytics.query({
            siteUrl: siteUrl,
            requestBody: {
                startDate,
                endDate,
                dimensions,
                rowLimit: rowLimit,
                startRow: startRow,
                dataState: 'all'
            }
        });

        const rows = res.data.rows || [];
        allRows = allRows.concat(rows);

        if (rows.length < rowLimit) {
            break;
        }

        startRow += rowLimit;

        if (startRow >= 100000) {
            break;
        }
    }

    return { rows: allRows };
};


