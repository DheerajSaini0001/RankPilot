import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const ALGORITHM = 'aes-256-gcm';
const getSecretKey = () => {
    if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 64) {
        throw new Error("ENCRYPTION_KEY must be exactly 64 hex characters.");
    }
    return Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
};

export const encrypt = (text) => {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(ALGORITHM, getSecretKey(), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (err) {
        console.error("Encryption error:", err);
        throw err;
    }
};

export const decrypt = (text) => {
    if (!text) return text;
    try {
        const [ivHex, authTagHex, encryptedHex] = text.split(':');
        if (!ivHex || !authTagHex || !encryptedHex) return text;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, getSecretKey(), iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error("Decryption error:", err);
        return null;
    }
};
