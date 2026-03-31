import GoogleToken from '../models/GoogleToken.js';
import FacebookToken from '../models/FacebookToken.js';
import DailyMetric from '../models/DailyMetric.js';
import UserAccounts from '../models/UserAccounts.js';
import { createNotification } from '../utils/notification.js';
import { generateWeeklyInsightInternal, generateSuggestedQuestionsInternal } from '../controllers/aiController.js';

// Checks for Google and Facebook tokens that will expire within the next 3 days.
export const checkExpiringTokens = async () => {
    console.log('🔔 [Monitoring] Checking for expiring tokens...');
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    try {
        const expiringGoogle = await GoogleToken.find({
            expiresAt: { $lt: threeDaysFromNow, $gt: new Date() }
        });

        for (const token of expiringGoogle) {
            await createNotification(token.userId, {
                type: 'warning',
                title: 'Google Token Expiring Soon',
                message: `Your Google connection for ${token.email} will expire within 3 days. Please reconnect to prevent data gaps.`,
                source: 'system',
                actionLabel: 'Reconnect',
                actionPath: '/connect-accounts'
            });
        }

        const expiringFacebook = await FacebookToken.find({
            expiresAt: { $lt: threeDaysFromNow, $gt: new Date() }
        });

        for (const token of expiringFacebook) {
            await createNotification(token.userId, {
                type: 'warning',
                title: 'Facebook Token Expiring Soon',
                message: `Your Meta Business connection will expire within 3 days. Please reconnect to continue syncing Ads data.`,
                source: 'facebook-ads',
                actionLabel: 'Reconnect',
                actionPath: '/connect-accounts'
            });
        }
    } catch (err) {
        console.error('[Monitoring] Error checking tokens:', err.message);
    }
};

// Weekly check for significant performance drops (comparing last 7 days with previous 7 days)
export const checkPerformanceDrops = async () => {
    console.log('📉 [Monitoring] Analyzing performance for significant drops...');
    const now = new Date();
    const splitDate = new Date();
    splitDate.setDate(now.getDate() - 7);
    const startDate = new Date();
    startDate.setDate(now.getDate() - 14);

    try {
        const accounts = await UserAccounts.find();
        for (const acc of accounts) {
            const platformId = acc.ga4PropertyId || acc.gscSiteUrl; 
            if (!platformId) continue;

            const metrics = await DailyMetric.aggregate([
                { $match: { 'metadata.platformAccountId': platformId, date: { $gte: startDate, $lte: now } } },
                { $group: { _id: { period: { $cond: [{ $gte: ['$date', splitDate] }, 'current', 'previous'] } }, totalSessions: { $sum: '$metrics.sessions' }, totalClicks: { $sum: '$metrics.clicks' } } }
            ]);

            const current = metrics.find(m => m._id.period === 'current');
            const previous = metrics.find(m => m._id.period === 'previous');

            if (current && previous) {
                const isGsc = platformId === acc.gscSiteUrl;
                const prevVal = isGsc ? (previous.totalClicks || 0) : (previous.totalSessions || 0);
                const curVal = isGsc ? (current.totalClicks || 0) : (current.totalSessions || 0);

                if (prevVal > 100 && curVal < prevVal * 0.7) {
                    const dropPercent = Math.round(((prevVal - curVal) / prevVal) * 100);
                    await createNotification(acc.userId, {
                        type: 'warning',
                        title: `Traffic Alert: ${dropPercent}% Drop`,
                        message: `Your traffic for "${acc.siteName}" has dropped by ${dropPercent}% compared to last week. Explore AI insights to see why.`,
                        source: 'ai',
                        actionLabel: 'Analyze Now',
                        actionPath: '/dashboard/ai-chat'
                    });
                }
            }
        }
    } catch (err) {
        console.error('[Monitoring] Performance check failed:', err.message);
    }
};

// Checks for sources with zero data for the last 3 days.
export const checkInactiveSources = async () => {
    console.log('[Monitoring] Checking for inactive sources (Zero Data)...');
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    try {
        const accounts = await UserAccounts.find();
        for (const acc of accounts) {
            const sources = [
                { id: acc.ga4PropertyId, name: 'GA4', key: 'sessions' },
                { id: acc.gscSiteUrl, name: 'Search Console', key: 'clicks' },
                { id: acc.googleAdsCustomerId, name: 'Google Ads', key: 'spend' },
                { id: acc.facebookAdAccountId, name: 'Facebook Ads', key: 'spend' }
            ].filter(s => s.id);

            for (const source of sources) {
                const recentData = await DailyMetric.findOne({
                    'metadata.platformAccountId': source.id,
                    date: { $gte: threeDaysAgo },
                    [`metrics.${source.key}`]: { $gt: 0 }
                });

                if (!recentData) {
                    await createNotification(acc.userId, {
                        type: 'error',
                        title: `Tracking Alert: No ${source.name} Data`,
                        message: `No data received from ${source.name} for "${acc.siteName}" in 3 days. Check your tracking setup.`,
                        source: source.name.toLowerCase().replace(' ', '-'),
                        actionLabel: 'Check Settings',
                        actionPath: '/connect-accounts'
                    });
                }
            }
        }
    } catch (err) {
        console.error('[Monitoring] Inactive source check failed:', err.message);
    }
};

// Monthly growth check (comparing last month vs previous month).
export const checkMonthlyGrowth = async () => {
    console.log('[Monitoring] Calculating monthly growth summary...');
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    try {
        const accounts = await UserAccounts.find();
        for (const acc of accounts) {
            const platformId = acc.ga4PropertyId || acc.gscSiteUrl; 
            if (!platformId) continue;

            const metrics = await DailyMetric.aggregate([
                { $match: { 'metadata.platformAccountId': platformId, date: { $gte: firstDayPrevMonth, $lt: firstDayThisMonth } } },
                { $group: { _id: { period: { $cond: [{ $gte: ['$date', firstDayLastMonth] }, 'lastMonth', 'prevMonth'] } }, totalSessions: { $sum: '$metrics.sessions' }, totalClicks: { $sum: '$metrics.clicks' } } }
            ]);

            const lastMonth = metrics.find(m => m._id.period === 'lastMonth');
            const prevMonth = metrics.find(m => m._id.period === 'prevMonth');

            if (lastMonth && prevMonth) {
                const isGsc = platformId === acc.gscSiteUrl;
                const lastVal = isGsc ? (lastMonth.totalClicks || 0) : (lastMonth.totalSessions || 0);
                const prevVal = isGsc ? (prevMonth.totalClicks || 0) : (prevMonth.totalSessions || 0);

                if (prevVal > 100) {
                    const growthPercent = Math.round(((lastVal - prevVal) / prevVal) * 100);
                    if (growthPercent > 5) {
                        await createNotification(acc.userId, {
                            type: 'success',
                            title: 'Monthly Growth Report',
                            message: `Your ${acc.siteName} grew by ${growthPercent}% last month! Keep it up! 🚀`,
                            source: 'ai',
                            actionLabel: 'View Monthly Full Report',
                            actionPath: '/dashboard'
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error('[Monitoring] Monthly growth check failed:', err.message);
    }
};

// Ad Spend Alert for sudden spikes.
export const checkAdSpendSpikes = async () => {
    console.log('[Monitoring] Checking for Ad spend spikes...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0,0,0,0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 8);

    try {
        const accounts = await UserAccounts.find({ $or: [{ googleAdsCustomerId: { $ne: null } }, { facebookAdAccountId: { $ne: null } }] });
        for (const acc of accounts) {
            const platformIds = [acc.googleAdsCustomerId, acc.facebookAdAccountId].filter(Boolean);
            
            for (const pId of platformIds) {
                const yesterdayData = await DailyMetric.findOne({ 'metadata.platformAccountId': pId, date: yesterday });
                if (!yesterdayData || !yesterdayData.metrics.spend) continue;

                const avgData = await DailyMetric.aggregate([
                    { $match: { 'metadata.platformAccountId': pId, date: { $gte: sevenDaysAgo, $lt: yesterday } } },
                    { $group: { _id: null, avgSpend: { $avg: '$metrics.spend' } } }
                ]);

                if (avgData.length > 0 && avgData[0].avgSpend > 5) {
                    const avg = avgData[0].avgSpend;
                    const spent = yesterdayData.metrics.spend;
                    if (spent > avg * 1.5) {
                        const spikePercent = Math.round(((spent - avg) / avg) * 100);
                        await createNotification(acc.userId, {
                            type: 'warning',
                            title: 'Ad Budget Spike Alert',
                            message: `Yesterday's spend for "${acc.siteName}" was ${spikePercent}% higher than average. Review your campaigns.`,
                            source: pId === acc.googleAdsCustomerId ? 'google-ads' : 'facebook-ads',
                            actionLabel: 'Check Ads',
                            actionPath: pId === acc.googleAdsCustomerId ? '/dashboard/google-ads' : '/dashboard/facebook-ads'
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error('[Monitoring] Ad spend spike check failed:', err.message);
    }
};

// Generate weekly reports for ALL users.
export const generateWeeklyInsightsForAllUsers = async () => {
    console.log('🤖 [AI] Generating weekly insights for all active sites...');
    try {
        const accounts = await UserAccounts.find();
        for (const acc of accounts) {
            try {
                console.log(`[AI] Processing Weekly Insight for site: ${acc.siteName} (User: ${acc.userId})`);
                await generateWeeklyInsightInternal(acc.userId, acc._id);
            } catch (err) {
                console.error(`[AI] Failed to generate insight for ${acc.siteName}:`, err.message);
            }
        }
    } catch (err) {
        console.error('[AI] Weekly Insight Bulk Generation Error:', err.message);
    }
};

// Generate suggested questions for ALL users.
export const generateSuggestedQuestionsForAllUsers = async () => {
    console.log('🤖 [AI] Generating suggested questions for all active sites...');
    try {
        const accounts = await UserAccounts.find();
        for (const acc of accounts) {
            try {
                console.log(`[AI] Processing Suggested Questions for site: ${acc.siteName} (User: ${acc.userId})`);
                await generateSuggestedQuestionsInternal(acc.userId, acc._id);
            } catch (err) {
                console.error(`[AI] Failed to generate questions for ${acc.siteName}:`, err.message);
            }
        }
    } catch (err) {
        console.error('[AI] Suggested Questions Bulk Generation Error:', err.message);
    }
};
