import { google } from 'googleapis';
import { getValidGoogleToken } from './googleAuthService.js';

export const listProperties = async (userId, tokenId = null) => {
    const auth = await getValidGoogleToken(userId, tokenId);
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
export const runReport = async (userId, propertyId, reportType, startDate, endDate, dimensions, metrics, tokenId = null) => {
    if (!propertyId) throw new Error('GA4_PROPERTY_ID_MISSING');

    const auth = await getValidGoogleToken(userId, tokenId);
    const analyticsdata = google.analyticsdata({ version: 'v1beta', auth });

    let allRows = [];
    let offset = 0;
    const limit = 50000;

    while (true) {
        const res = await analyticsdata.properties.runReport({
            property: propertyId,
            requestBody: {
                dateRanges: [{ startDate, endDate }],
                dimensions: dimensions.map(d => ({ name: d })),
                metrics: metrics.map(m => ({ name: m })),
                limit: limit,
                offset: offset
            }
        });

        const rows = res.data.rows || [];
        allRows = allRows.concat(rows);

        if (rows.length < limit || allRows.length >= 500000) {
            break;
        }

        offset += limit;
    }

    return { rows: allRows };
};


