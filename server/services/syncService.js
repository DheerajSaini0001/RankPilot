import DailyMetric from '../models/DailyMetric.js';
import UserAccounts from '../models/UserAccounts.js';
import { runReport as runGa4Report } from './ga4Service.js';
import { runQuery as runGscQuery } from './gscService.js';
import { runQuery as runGAdsQuery } from './googleAdsService.js';
import { getInsights as getFbInsights } from './facebookAdsService.js';

export const syncHistoricalData = async (userId, source, years = 5) => {
    console.log(`Starting historical sync for User ${userId}, Source: ${source}, Years: ${years}`);
    
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    const pastDate = new Date();
    pastDate.setFullYear(now.getFullYear() - years);
    const startDate = pastDate.toISOString().split('T')[0];

    try {
        await UserAccounts.findOneAndUpdate({ userId }, { syncStatus: 'syncing' }, { returnDocument: 'after' });
        
        switch (source) {
            case 'ga4': await syncGa4(userId, startDate, endDate); break;
            case 'gsc': await syncGsc(userId, startDate, endDate); break;
            case 'google-ads': await syncGoogleAds(userId, startDate, endDate); break;
            case 'facebook-ads': await syncFacebookAds(userId, startDate, endDate); break;
        }

        await UserAccounts.findOneAndUpdate({ userId }, { 
            isHistoricalSyncComplete: true, 
            syncStatus: 'idle',
            lastDailySyncAt: new Date()
        }, { returnDocument: 'after' });
    } catch (err) {
        console.error(`Historical Sync Failed for ${source}:`, err.message);
        await UserAccounts.findOneAndUpdate({ userId }, { syncStatus: 'error' }, { returnDocument: 'after' });
    }
};

const syncGa4 = async (userId, startDate, endDate) => {
    const acc = await UserAccounts.findOne({ userId });
    if (!acc || !acc.ga4PropertyId) return;

    // Fetch granular data: Date + Source/Medium + Device
    const report = await runGa4Report(userId, 'high_detail_sync', startDate, endDate, 
        ['date', 'sessionSourceMedium', 'deviceCategory'], 
        ['activeUsers', 'sessions', 'bounceRate', 'screenPageViews']
    );
    
    if (report.rows) {
        const operations = report.rows.map(row => {
            const dateStr = row.dimensionValues[0].value; 
            const formattedDate = `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
            return {
                updateOne: {
                    filter: { 
                        userId, 
                        source: 'ga4', 
                        date: formattedDate,
                        'dimensions.source': row.dimensionValues[1].value,
                        'dimensions.device': row.dimensionValues[2].value
                    },
                    update: {
                        platformAccountId: acc.ga4PropertyId,
                        dimensions: {
                            source: row.dimensionValues[1].value,
                            device: row.dimensionValues[2].value
                        },
                        metrics: {
                            users: parseFloat(row.metricValues[0].value),
                            sessions: parseFloat(row.metricValues[1].value),
                            bounceRate: parseFloat(row.metricValues[2].value),
                            screenPageViews: parseFloat(row.metricValues[3].value)
                        }
                    },
                    upsert: true
                }
            };
        });
        await DailyMetric.bulkWrite(operations);
    }
};

const syncGsc = async (userId, startDate, endDate) => {
    const acc = await UserAccounts.findOne({ userId });
    if (!acc || !acc.gscSiteUrl) return;

    // Fetch granular data: Date + Page + Query
    const res = await runGscQuery(userId, 'high_detail_sync', startDate, endDate, ['date', 'page', 'query']);
    
    if (res.rows) {
        // Limit to top 500 rows per batch to keep DB performance sane but detailed
        const operations = res.rows.slice(0, 1000).map(row => {
            return {
                updateOne: {
                    filter: { 
                        userId, 
                        source: 'gsc', 
                        date: row.keys[0],
                        'dimensions.page': row.keys[1],
                        'dimensions.query': row.keys[2]
                    },
                    update: {
                        platformAccountId: acc.gscSiteUrl,
                        dimensions: {
                            page: row.keys[1],
                            query: row.keys[2]
                        },
                        metrics: {
                            clicks: row.clicks,
                            impressions: row.impressions,
                            ctr: row.ctr,
                            position: row.position
                        }
                    },
                    upsert: true
                }
            };
        });
        if (operations.length > 0) await DailyMetric.bulkWrite(operations);
    }
};

const syncGoogleAds = async (userId, startDate, endDate) => {
    const acc = await UserAccounts.findOne({ userId });
    if (!acc || !acc.googleAdsCustomerId) return;

    // Fetch by Date + Campaign
    const query = `SELECT segments.date, campaign.name, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM customer WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'`;
    const res = await runGAdsQuery(userId, 'high_detail_sync', startDate, endDate, query);

    if (res && res.length > 0) {
        const operations = res.map(row => ({
            updateOne: {
                filter: { 
                    userId, 
                    source: 'google-ads', 
                    date: row.segments.date,
                    'dimensions.campaign': row.campaign.name
                },
                update: {
                    platformAccountId: acc.googleAdsCustomerId,
                    dimensions: {
                        campaign: row.campaign.name
                    },
                    metrics: {
                        spend: parseFloat(row.metrics.costMicros || 0) / 1000000,
                        impressions: parseFloat(row.metrics.impressions || 0),
                        clicks: parseFloat(row.metrics.clicks || 0),
                        conversions: parseFloat(row.metrics.conversions || 0)
                    }
                },
                upsert: true
            }
        }));
        await DailyMetric.bulkWrite(operations);
    }
};

const syncFacebookAds = async (userId, startDate, endDate) => {
    const acc = await UserAccounts.findOne({ userId });
    if (!acc || !acc.facebookAdAccountId) return;

    // Fetch by Date + Campaign
    const res = await getFbInsights(userId, 'high_detail_sync', startDate, endDate, 'campaign', { time_increment: 1 });

    if (res && res.length > 0) {
        const operations = res.map(row => ({
            updateOne: {
                filter: { 
                    userId, 
                    source: 'facebook-ads', 
                    date: row.date_start,
                    'dimensions.campaign': row.campaign_name
                },
                update: {
                    platformAccountId: acc.facebookAdAccountId,
                    dimensions: {
                        campaign: row.campaign_name
                    },
                    metrics: {
                        spend: parseFloat(row.spend || 0),
                        impressions: parseFloat(row.impressions || 0),
                        clicks: parseFloat(row.clicks || 0),
                        reach: parseFloat(row.reach || 0)
                    }
                },
                upsert: true
            }
        }));
        await DailyMetric.bulkWrite(operations);
    }
};

/**
 * Runs a daily sync for all connected platforms for all users
 */
export const syncDailyForAllUsers = async () => {
    const users = await UserAccounts.find({});
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    for (const acc of users) {
        try {
            if (acc.ga4PropertyId) await syncGa4(acc.userId, dateStr, dateStr);
            if (acc.gscSiteUrl) await syncGsc(acc.userId, dateStr, dateStr);
            if (acc.googleAdsCustomerId) await syncGoogleAds(acc.userId, dateStr, dateStr);
            if (acc.facebookAdAccountId) await syncFacebookAds(acc.userId, dateStr, dateStr);
            
            await UserAccounts.findByIdAndUpdate(acc._id, { lastDailySyncAt: new Date() }, { returnDocument: 'after' });
        } catch (e) {
            console.error(`Daily Sync Partial Fail for User ${acc.userId}:`, e.message);
        }
    }
};

