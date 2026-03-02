export const maskValue = (str, key) => {
    if (!str) return 'Not Set';
    switch (key) {
        case 'ANTHROPIC_API_KEY':
            return str.replace(/^(sk-ant-)(.*)(.{4})$/, '$1****$3');
        case 'OPENAI_API_KEY':
            return str.replace(/^(sk-)(.*)(.{4})$/, '$1****$3');
        case 'GOOGLE_CLIENT_ID':
            return str.replace(/^(.{6})(.*)(.{4})(\.apps\.googleusercontent\.com)$/, '$1****$3$4');
        case 'GOOGLE_CLIENT_SECRET':
            return str.replace(/^(.{4})(.*)$/, '$1****');
        case 'GOOGLE_ADS_DEVELOPER_TOKEN':
            return str.replace(/^(.{4})(.*)(.{4})$/, '$1****$3');
        case 'FACEBOOK_APP_ID':
            return str;
        case 'FACEBOOK_APP_SECRET':
            return str.replace(/^(.{4})(.*)$/, '$1****');
        case 'RESEND_API_KEY':
            return str.replace(/^(re_)(.*)(.{4})$/, '$1****$3');
        default:
            return '****';
    }
};
