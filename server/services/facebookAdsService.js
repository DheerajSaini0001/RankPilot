import bizSdk from 'facebook-nodejs-business-sdk';
import { getValidFacebookToken } from './facebookAuthService.js';
import UserAccounts from '../models/UserAccounts.js';

export const listAdAccounts = async (userId) => {
    const accessToken = await getValidFacebookToken(userId);
    const api = bizSdk.FacebookAdsApi.init(accessToken);
    const User = bizSdk.User;

    // fetch user ad accounts
    const me = new User('me');
    const adAccounts = await me.getAdAccounts(['name', 'currency', 'account_status']);
    return adAccounts;
};

export const getInsights = async (userId, reportType, startDate, endDate, level, extraParams) => {
    const account = await UserAccounts.findOne({ userId });
    if (!account || !account.facebookAdAccountId) throw new Error('SOURCE_NOT_CONNECTED');

    const accessToken = await getValidFacebookToken(userId);
    bizSdk.FacebookAdsApi.init(accessToken);
    const AdAccount = bizSdk.AdAccount;
    const adAccount = new AdAccount(account.facebookAdAccountId);

    const res = await adAccount.getInsights(['spend', 'impressions', 'clicks', 'reach', 'cpc', 'cpm', 'ctr', 'actions', 'action_values'], {
        time_range: { since: startDate, until: endDate },
        level: level,
        ...extraParams
    });

    return res;
};
