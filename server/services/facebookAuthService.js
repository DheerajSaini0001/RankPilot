import axios from 'axios';
import FacebookToken from '../models/FacebookToken.js';
import configService from './configService.js';
import { encrypt, decrypt } from '../utils/encrypt.js';
import { createNotification } from '../utils/notification.js';

export const getValidFacebookToken = async (userId, tokenId = null) => {
    let tokenDoc;
    if (tokenId) {
        tokenDoc = await FacebookToken.findOne({ _id: tokenId, userId });
    } else {
        tokenDoc = await FacebookToken.findOne({ userId }).sort({ updatedAt: -1 });
    }
    if (!tokenDoc) throw new Error('FACEBOOK_AUTH_MISSING');

    // Check if token is nearing expiry (within 3 days) and needs refresh
    if (tokenDoc.expiresAt && tokenDoc.expiresAt.getTime() < Date.now() + (3 * 24 * 60 * 60 * 1000)) {
        try {
            const data = await exchangeLongLivedToken(decrypt(tokenDoc.accessToken));
            
            if (data.access_token) {
                tokenDoc.accessToken = encrypt(data.access_token);
                if (data.expires_in) {
                    tokenDoc.expiresAt = new Date(Date.now() + data.expires_in * 1000);
                }
                await tokenDoc.save();
            }
        } catch (err) {
            console.error('Error refreshing Facebook token', err.message);
            // If it's already expired or refresh fails, notify the user
            if (tokenDoc.expiresAt && tokenDoc.expiresAt.getTime() < Date.now()) {
                await createNotification(userId, {
                    type: 'error',
                    title: 'Facebook Connection Expired',
                    message: `Your Meta Business connection for ${tokenDoc.name || 'Account'} has expired and couldn't be refreshed. Please reconnect.`,
                    source: 'facebook-ads',
                    actionLabel: 'Reconnect',
                    actionPath: '/connect-accounts'
                });
                throw new Error('FACEBOOK_AUTH_EXPIRED');
            }
        }
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
