import rateLimit from 'express-rate-limit';

export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 500,                    // 500 requests per window per IP (covers heavy dashboard usage)
    message: { success: false, message: 'Too many requests, please try again later.' }
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 20,                     // 20 login attempts per window (prevents brute-force)
    message: { success: false, message: 'Too many login attempts, please try again later.' }
});

export const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 hour
    max: 50,                     // 50 AI requests per hour per IP
    message: { success: false, message: 'AI request limit reached. Please try again later.' }
});
