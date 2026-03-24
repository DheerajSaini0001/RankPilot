import PlatformConfig from '../models/PlatformConfig.js';
import { encrypt, decrypt } from '../utils/encrypt.js';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';
dotenv.config();

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const defaultConfigs = [
    { key: 'PORT', label: 'Server Port', group: 'server', isSecret: false },
    { key: 'CLIENT_URL', label: 'Frontend Client URL', group: 'server', isSecret: false },
    { key: 'SUPER_ADMIN_EMAIL', label: 'Super Admin Email', group: 'server', isSecret: false },

    { key: 'MONGODB_URI', label: 'MongoDB Connection URI', group: 'database', isSecret: true },

    { key: 'JWT_SECRET', label: 'JWT Secret Key', group: 'security', isSecret: true },
    { key: 'JWT_EXPIRES_IN', label: 'JWT Expiry Duration', group: 'security', isSecret: false },

    { key: 'GOOGLE_CLIENT_ID', label: 'Google OAuth Client ID', group: 'google', isSecret: true },
    { key: 'GOOGLE_CLIENT_SECRET', label: 'Google OAuth Client Secret', group: 'google', isSecret: true },
    { key: 'GOOGLE_CALLBACK_URL', label: 'Google OAuth Callback URL', group: 'google', isSecret: false },
    { key: 'GOOGLE_ADS_DEVELOPER_TOKEN', label: 'Google Ads Developer Token', group: 'google', isSecret: true },

    { key: 'FACEBOOK_APP_ID', label: 'Facebook App ID', group: 'facebook', isSecret: false },
    { key: 'FACEBOOK_APP_SECRET', label: 'Facebook App Secret', group: 'facebook', isSecret: true },
    { key: 'FACEBOOK_CALLBACK_URL', label: 'Facebook OAuth Callback URL', group: 'facebook', isSecret: false },

    { key: 'GEMINI_API_KEY', label: 'Google Gemini Pro API Key', group: 'gemini', isSecret: true },

    { key: 'EMAIL_FROM', label: 'System Origin Email', group: 'other', isSecret: false },
    { key: 'GMAIL_APP_PASSWORD', label: 'Gmail SMTP App Password', group: 'other', isSecret: true },
    { key: 'RESEND_API_KEY', label: 'Resend Email API Key', group: 'other', isSecret: true }
];

export const initConfig = async () => {
    try {
        const count = await PlatformConfig.countDocuments();
        if (count === 0) {
            console.log("Seeding initial PlatformConfig from environment variables...");
            for (const item of defaultConfigs) {
                const envVal = process.env[item.key];
                if (envVal) {
                    await PlatformConfig.create({
                        key: item.key,
                        value: item.isSecret ? encrypt(envVal) : envVal,
                        label: item.label,
                        group: item.group,
                        isSecret: item.isSecret,
                        updatedBy: 'system_startup'
                    });
                }
            }
            console.log("Seeding complete.");
        }
        await refreshCache();
    } catch (err) {
        console.error("Error initializing config:", err);
    }
};

export const refreshCache = async () => {
    try {
        const configs = await PlatformConfig.find({});
        for (const config of configs) {
            const rawVal = config.isSecret ? decrypt(config.value) : config.value;
            cache.set(config.key, rawVal);
        }
    } catch (err) {
        console.error("Error refreshing cache:", err);
    }
};

export const get = async (key) => {
    let val = cache.get(key);
    if (!val) {
        // Cache miss (maybe TTL expired), re-fetch
        await refreshCache();
        val = cache.get(key);
    }
    return val;
};

export default { get, initConfig, refreshCache };
