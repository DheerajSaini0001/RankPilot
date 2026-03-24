import { GoogleAdsApi } from 'google-ads-api';
import { getValidGoogleToken } from './googleAuthService.js';
import configService from './configService.js';

const getClient = async () => {
    const GOOGLE_CLIENT_ID = await configService.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = await configService.get('GOOGLE_CLIENT_SECRET');
    const GOOGLE_ADS_DEVELOPER_TOKEN = await configService.get('GOOGLE_ADS_DEVELOPER_TOKEN');

    return new GoogleAdsApi({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        developer_token: GOOGLE_ADS_DEVELOPER_TOKEN
    });
};

export const listAccounts = async (userId, tokenId = null) => {
    const api = await getClient();
    const auth = await getValidGoogleToken(userId, tokenId);
    const credentials = auth.credentials;

    const res = await api.listAccessibleCustomers(credentials.refresh_token);
    if (!res || !res.resource_names) return [];
    return res.resource_names.map(name => name.split('/')[1]);
};


export const runQuery = async (userId, customerId, reportType, startDate, endDate, queryStr, tokenId = null) => {
    if (!customerId) throw new Error('GOOGLE_ADS_CUSTOMER_ID_MISSING');

    const api = await getClient();
    const auth = await getValidGoogleToken(userId, tokenId);
    const credentials = auth.credentials;

    const customer = api.Customer({
        customer_id: customerId,
        refresh_token: credentials.refresh_token
    });

    const res = await customer.query(queryStr);
    return res;
};


