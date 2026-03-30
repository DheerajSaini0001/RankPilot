import rateLimit from 'express-rate-limit';

export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per window
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { 
        success: false, 
        message: 'Too many requests from this IP, please try again after 15 minutes.' 
    }
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // Max 15 attempts (login/register) per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: { 
        success: false, 
        message: 'Too many authentication attempts. Please try again later.' 
    }
});

export const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // Allow 100 AI queries per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: { 
        success: false, 
        message: 'AI request limit reached. Please try again after an hour.' 
    }
});

export const syncLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Max 10 syncs per hour (per user/IP)
    standardHeaders: true,
    legacyHeaders: false,
    message: { 
        success: false, 
        message: 'Sync limit exceeded. Manual sync is allowed only 10 times per hour.' 
    }
});

export const sensitiveActionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Max 5 requests per hour (prevent spamming emails)
    standardHeaders: true,
    legacyHeaders: false,
    message: { 
        success: false, 
        message: 'Too many sensitive requests (password reset/verification). Please try again in an hour.' 
    }
});
