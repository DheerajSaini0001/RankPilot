import bizSdk from 'facebook-nodejs-business-sdk';
import { getValidFacebookToken } from './facebookAuthService.js';

export const listAdAccounts = async (userId, tokenId = null) => {
    const accessToken = await getValidFacebookToken(userId, tokenId);
    const api = bizSdk.FacebookAdsApi.init(accessToken);
    const User = bizSdk.User;

    // fetch user ad accounts
    const me = new User('me');
    const adAccounts = await me.getAdAccounts(['name', 'currency', 'account_status']);
    return adAccounts;
};

export const getInsights = async (userId, adAccountId, reportType, startDate, endDate, level, extraParams, tokenId = null) => {
    // Caller provide adAccountId.
    if (!adAccountId) throw new Error('FACEBOOK_AD_ACCOUNT_ID_MISSING');

    const accessToken = await getValidFacebookToken(userId, tokenId);
    bizSdk.FacebookAdsApi.init(accessToken);
    const AdAccount = bizSdk.AdAccount;
    const adAccount = new AdAccount(adAccountId);

    const res = await adAccount.getInsights(['spend', 'impressions', 'clicks', 'reach', 'cpc', 'cpm', 'ctr', 'actions', 'action_values'], {
        time_range: { since: startDate, until: endDate },
        level: level,
        ...extraParams
    });

    return res;
};

