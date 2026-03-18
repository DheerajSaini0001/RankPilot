import { GoogleAdsApi } from 'google-ads-api';
import { getValidGoogleToken } from './googleAuthService.js';
import UserAccounts from '../models/UserAccounts.js';
import configService from './configService.js';

const getClient = async (userId) => {
    const auth = await getValidGoogleToken(userId);
    const credentials = auth.credentials;
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

export const runQuery = async (userId, customerId, reportType, startDate, endDate, queryStr) => {
    // Caller provide customerId.
    if (!customerId) throw new Error('GOOGLE_ADS_CUSTOMER_ID_MISSING');

    const client = await getClient(userId);
    const realClient = client.Customer({
        customer_id: customerId,
        refresh_token: client.refresh_token
    });

    const res = await realClient.query(queryStr);
    return res;
};

