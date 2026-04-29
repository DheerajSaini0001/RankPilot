import { google } from 'googleapis';
import GoogleToken from '../models/GoogleToken.js';
import configService from './configService.js';
import { encrypt, decrypt } from '../utils/encrypt.js';
import { createNotification } from '../utils/notification.js';

export const getGoogleClient = async () => {
    const GOOGLE_CLIENT_ID = await configService.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = await configService.get('GOOGLE_CLIENT_SECRET');

    return new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CALLBACK_URL
    );
};

export const getValidGoogleToken = async (userId, tokenId = null) => {
    let tokenDoc;
    if (tokenId) {
        tokenDoc = await GoogleToken.findOne({ _id: tokenId, userId });
    } else {
        // Fallback to find the most recent/first token for the user if none specified
        tokenDoc = await GoogleToken.findOne({ userId }).sort({ updatedAt: -1 });
    }

    if (!tokenDoc) throw new Error('GOOGLE_AUTH_MISSING');

    const oauth2Client = await getGoogleClient();

    oauth2Client.setCredentials({
        access_token: decrypt(tokenDoc.accessToken),
        refresh_token: decrypt(tokenDoc.refreshToken),
        expiry_date: tokenDoc.expiresAt ? tokenDoc.expiresAt.getTime() : null,
    });

    if (tokenDoc.expiresAt && tokenDoc.expiresAt.getTime() < Date.now() + 60000) {
        try {
            const { credentials } = await oauth2Client.refreshAccessToken();

            tokenDoc.accessToken = encrypt(credentials.access_token);
            if (credentials.refresh_token) {
                tokenDoc.refreshToken = encrypt(credentials.refresh_token);
            }
            if (credentials.expiry_date) {
                tokenDoc.expiresAt = new Date(credentials.expiry_date);
            }
            await tokenDoc.save();
        } catch (err) {
            console.error('Error refreshing Google token', err);
            await createNotification(tokenDoc.userId, {
                type: 'error',
                title: 'Google Connection Expired',
                message: `Your Google connection for ${tokenDoc.email} has expired and couldn't be refreshed automatically. Please reconnect to continue syncing data.`,
                source: 'system',
                actionLabel: 'Reconnect',
                actionPath: '/connect-accounts'
            });
            throw new Error('GOOGLE_AUTH_EXPIRED');
        }
    }

    return oauth2Client;
};

// New helper to get account info
export const getGoogleAccountInfo = async (auth) => {
    const oauth2 = google.oauth2({ version: 'v2', auth });
    const res = await oauth2.userinfo.get();
    return res.data; // { id, email, name, picture, ... }
};
