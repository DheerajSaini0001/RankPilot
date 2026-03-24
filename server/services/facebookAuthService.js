import axios from 'axios';
import FacebookToken from '../models/FacebookToken.js';
import configService from './configService.js';
import { encrypt, decrypt } from '../utils/encrypt.js';

export const getValidFacebookToken = async (userId, tokenId = null) => {
    let tokenDoc;
    if (tokenId) {
        tokenDoc = await FacebookToken.findOne({ _id: tokenId, userId });
    } else {
        tokenDoc = await FacebookToken.findOne({ userId }).sort({ updatedAt: -1 });
    }
    if (!tokenDoc) throw new Error('FACEBOOK_AUTH_MISSING');

    if (tokenDoc.expiresAt && tokenDoc.expiresAt.getTime() < Date.now()) {
        throw new Error('FACEBOOK_AUTH_EXPIRED');
    }

    return decrypt(tokenDoc.accessToken);
};

export const exchangeLongLivedToken = async (shortLivedToken) => {
    const FACEBOOK_APP_ID = await configService.get('FACEBOOK_APP_ID');
    const FACEBOOK_APP_SECRET = await configService.get('FACEBOOK_APP_SECRET');

    const response = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
        params: {
            grant_type: 'fb_exchange_token',
            client_id: FACEBOOK_APP_ID,
            client_secret: FACEBOOK_APP_SECRET,
            fb_exchange_token: shortLivedToken
        }
    });

    return response.data;
};
