import { GoogleAdsApi } from 'google-ads-api';
import { getValidGoogleToken, getGoogleClient } from './googleAuthService.js';
import UserAccounts from '../models/UserAccounts.js';
import AnalyticsCache from '../models/AnalyticsCache.js';
import configService from './configService.js';

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

const getClient = async (userId) => {
    const auth = await getValidGoogleToken(userId);
    const credentials = await auth.getCredentials();
    const GOOGLE_CLIENT_ID = await configService.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = await configService.get('GOOGLE_CLIENT_SECRET');
    const GOOGLE_ADS_DEVELOPER_TOKEN = await configService.get('GOOGLE_ADS_DEVELOPER_TOKEN');

    return new GoogleAdsApi({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        developer_token: GOOGLE_ADS_DEVELOPER_TOKEN
    }).Customer({
        customer_id: '1234567890', // placeholder for instantiating
        refresh_token: credentials.refresh_token
    });
};

export const listAccounts = async (userId) => {
    const client = await getClient(userId);
    const res = await client.customers.listAccessibleCustomers({});
    return res.resource_names.map(name => name.split('/')[1]);
};

export const runQuery = async (userId, reportType, startDate, endDate, queryStr) => {
    const account = await UserAccounts.findOne({ userId });
    if (!account || !account.googleAdsCustomerId) throw new Error('SOURCE_NOT_CONNECTED');

    const cached = await getCache(userId, 'google-ads', reportType, account.googleAdsCustomerId, startDate, endDate);
    if (cached) return cached.data;

    const client = await getClient(userId);
    const realClient = client.Customer({
        customer_id: account.googleAdsCustomerId,
        refresh_token: client.refresh_token
    });

    const res = await realClient.query(queryStr);

    await setCache(userId, 'google-ads', reportType, account.googleAdsCustomerId, startDate, endDate, res);
    return res;
};
