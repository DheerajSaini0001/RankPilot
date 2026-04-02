export const maskValue = (str, key) => {
    if (!str) return 'Not Set';
    switch (key) {
        // Fully visible (Non-secrets)
        case 'PORT':
        case 'JWT_EXPIRES_IN':
        case 'GOOGLE_CALLBACK_URL':
        case 'FACEBOOK_APP_ID':
        case 'FACEBOOK_CALLBACK_URL':
        case 'EMAIL_FROM':
        case 'CLIENT_URL':
        case 'SUPER_ADMIN_EMAIL':
        case 'GCP_METADATA_TIMEOUT':
        case 'REDIS_HOST':
        case 'REDIS_PORT':
        case 'QUEUE_CONCURRENCY':
        case 'SYNC_LIMIT_GSC':
        case 'SYNC_LIMIT_GA4':
        case 'SYNC_LIMIT_GOOGLE_ADS':
        case 'SYNC_LIMIT_FACEBOOK_ADS':
            return str;

        // Special masks
        case 'MONGODB_URI':
        case 'REDIS_URL':
            // Masks the password part of the connection string
            return str.replace(/(:\/\/[^:]+:)([^@]+)(@)/, '$1****$3');
        
        case 'REDIS_PASSWORD':
            return '****';
        
        case 'ENCRYPTION_KEY':
            return str.replace(/^(.{4})(.*)(.{4})$/, '$1****$3');
        case 'GOOGLE_CLIENT_ID':
            return str.replace(/^(.{6})(.*)(.{4})(\.apps\.googleusercontent\.com)$/, '$1****$3$4');
        case 'GOOGLE_CLIENT_SECRET':
            return str.replace(/^(.{4})(.*)$/, '$1****');
        case 'GOOGLE_ADS_DEVELOPER_TOKEN':
            return str.replace(/^(.{4})(.*)(.{4})$/, '$1****$3');
        case 'FACEBOOK_APP_SECRET':
            return str.replace(/^(.{4})(.*)$/, '$1****');
        case 'RESEND_API_KEY':
            return str.replace(/^(re_)(.*)(.{4})$/, '$1****$3');
        case 'GEMINI_API_KEY':
            return str.replace(/^(.{4})(.*)(.{4})$/, '$1****$3');

        // Fully hidden
        case 'JWT_SECRET':
        case 'GMAIL_APP_PASSWORD':
            return '****';
        
        default:
            return '****';
    }
};
