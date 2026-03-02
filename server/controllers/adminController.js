import PlatformConfig from '../models/PlatformConfig.js';
import { encrypt, decrypt } from '../utils/encrypt.js';
import { maskValue } from '../utils/maskValue.js';
import { refreshCache, get } from '../services/configService.js';
import axios from 'axios';

export const getConfig = async (req, res) => {
    const configs = await PlatformConfig.find({});
    const maskedConfigs = configs.map(c => ({
        key: c.key,
        label: c.label,
        group: c.group,
        maskedValue: c.isSecret ? maskValue(decrypt(c.value), c.key) : c.value,
        updatedAt: c.updatedAt
    }));
    res.status(200).json(maskedConfigs);
};

export const getSingleConfig = async (req, res) => {
    const config = await PlatformConfig.findOne({ key: req.params.key });
    if (!config) return res.status(404).json({ success: false, message: 'Config not found' });

    res.status(200).json({
        key: config.key,
        label: config.label,
        group: config.group,
        maskedValue: config.isSecret ? maskValue(decrypt(config.value), config.key) : config.value,
        updatedAt: config.updatedAt,
        updatedBy: config.updatedBy
    });
};

export const saveConfig = async (req, res) => {
    const { key, value } = req.body;
    let config = await PlatformConfig.findOne({ key });
    if (!config) return res.status(404).json({ success: false, message: 'Config not found' });

    config.value = config.isSecret ? encrypt(value) : value;
    config.updatedBy = req.user.email;
    await config.save();
    await refreshCache();

    res.status(200).json({ message: 'Config saved', key, updatedAt: config.updatedAt });
};

export const bulkSaveConfig = async (req, res) => {
    const { configs } = req.body;
    const results = [];

    for (const item of configs) {
        let config = await PlatformConfig.findOne({ key: item.key });
        if (config) {
            config.value = config.isSecret ? encrypt(item.value) : item.value;
            config.updatedBy = req.user.email;
            await config.save();
            results.push({ key: item.key, success: true });
        } else {
            results.push({ key: item.key, success: false });
        }
    }

    await refreshCache();
    res.status(200).json({ message: `${results.filter(r => r.success).length} configs saved`, results });
};

export const testConfig = async (req, res) => {
    const key = req.params.key;
    const val = await get(key);

    if (!val) {
        return res.status(400).json({ success: false, message: 'Key not found in DB.' });
    }

    try {
        if (key === 'GOOGLE_CLIENT_ID' || key === 'GOOGLE_CLIENT_SECRET') {
            const GOOGLE_CLIENT_ID = await get('GOOGLE_CLIENT_ID');
            const GOOGLE_CLIENT_SECRET = await get('GOOGLE_CLIENT_SECRET');

            try {
                await axios.post('https://oauth2.googleapis.com/token', {
                    client_id: GOOGLE_CLIENT_ID,
                    client_secret: GOOGLE_CLIENT_SECRET,
                    code: 'dummy_code',
                    grant_type: 'authorization_code',
                    redirect_uri: process.env.GOOGLE_CALLBACK_URL,
                });
            } catch (err) {
                if (err.response && (err.response.status === 400 || err.response.data.error === 'invalid_grant' || err.response.data.error === 'invalid_request')) {
                    return res.status(200).json({ success: true, message: 'Valid format' });
                }
                throw err;
            }
            return res.status(200).json({ success: true, message: 'Tested successfully' });
        } else if (key === 'ANTHROPIC_API_KEY') {
            await axios.post('https://api.anthropic.com/v1/messages', {
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 5,
                messages: [{ role: 'user', content: 'Say OK' }]
            }, {
                headers: { 'x-api-key': val, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }
            });
            return res.status(200).json({ success: true, message: 'Connection successful' });
        } else if (key === 'OPENAI_API_KEY') {
            await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4o',
                max_tokens: 5,
                messages: [{ role: 'user', content: 'Say OK' }]
            }, {
                headers: { 'Authorization': `Bearer ${val}`, 'content-type': 'application/json' }
            });
            return res.status(200).json({ success: true, message: 'Connection successful' });
        } else if (key === 'RESEND_API_KEY') {
            await axios.get('https://api.resend.com/domains', {
                headers: { 'Authorization': `Bearer ${val}` }
            });
            return res.status(200).json({ success: true, message: 'Connection successful' });
        } else {
            return res.status(200).json({ success: true, message: 'Tested locally.' });
        }
    } catch (err) {
        return res.status(400).json({ success: false, message: `Test failed: ${err.message}` });
    }
};
