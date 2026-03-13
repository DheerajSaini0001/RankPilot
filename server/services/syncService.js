import DailyMetric from '../models/DailyMetric.js';
import UserAccounts from '../models/UserAccounts.js';
import { runReport as runGa4Report } from './ga4Service.js';
import { runQuery as runGscQuery } from './gscService.js';
import { runQuery as runGAdsQuery } from './googleAdsService.js';
import { getInsights as getFbInsights } from './facebookAdsService.js';

export const syncHistoricalData = async (accountId, source, years = 5) => {
    const acc = await UserAccounts.findById(accountId);
    if (!acc) return;
    const userId = acc.userId;

    console.log(`Starting historical sync for Account ${accountId} (User ${userId}), Source: ${source}, Years: ${years}`);
    
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    const pastDate = new Date();
    pastDate.setFullYear(now.getFullYear() - years);
    const startDate = pastDate.toISOString().split('T')[0];

    try {
        await UserAccounts.findByIdAndUpdate(accountId, { syncStatus: 'syncing' });
        
        switch (source) {
            case 'ga4': await syncGa4(acc, startDate, endDate); break;
            case 'gsc': await syncGsc(acc, startDate, endDate); break;
            case 'google-ads': await syncGoogleAds(acc, startDate, endDate); break;
            case 'facebook-ads': await syncFacebookAds(acc, startDate, endDate); break;
        }

        await UserAccounts.findByIdAndUpdate(accountId, { 
            isHistoricalSyncComplete: true, 
            syncStatus: 'idle',
            lastDailySyncAt: new Date()
        });
    } catch (err) {
        console.error(`Historical Sync Failed for ${source} (Account: ${accountId}):`, err.message);
        await UserAccounts.findByIdAndUpdate(accountId, { syncStatus: 'error' });
    }
};

const syncGa4 = async (acc, startDate, endDate) => {
    if (!acc || !acc.ga4PropertyId) return;
    const userId = acc.userId;

    // Fetch granular data: Date + Channel + Source/Medium + Device + Location + Page + Browser/OS
    // Note: GA4 runReport has a 9 dimension limit per request
    const report = await runGa4Report(userId, 'ultra_detail_sync', startDate, endDate, 
        ['date', 'sessionDefaultChannelGroup', 'sessionSourceMedium', 'deviceCategory', 'country', 'browser', 'operatingSystem', 'pagePath', 'pageTitle'], 
        ['activeUsers', 'sessions', 'bounceRate', 'screenPageViews', 'averageSessionDuration', 'conversions', 'totalRevenue', 'engagementRate']
    );
    
    if (report.rows) {
        const operations = report.rows.map(row => {
            const dateStr = row.dimensionValues[0].value; 
            const formattedDate = `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
            return {
                updateOne: {
                    filter: { 
                        userId, 
                        platformAccountId: acc.ga4PropertyId,
                        source: 'ga4', 
                        date: formattedDate,
                        'dimensions.channel': row.dimensionValues[1].value,
                        'dimensions.source': row.dimensionValues[2].value,
                        'dimensions.device': row.dimensionValues[3].value,
                        'dimensions.country': row.dimensionValues[4].value,
                        'dimensions.browser': row.dimensionValues[5].value,
                        'dimensions.os': row.dimensionValues[6].value,
                        'dimensions.pagePath': row.dimensionValues[7].value,
                        'dimensions.pageTitle': row.dimensionValues[8].value
                    },
                    update: {
                        dimensions: {
                            channel: row.dimensionValues[1].value,
                            source: row.dimensionValues[2].value,
                            device: row.dimensionValues[3].value,
                            country: row.dimensionValues[4].value,
                            browser: row.dimensionValues[5].value,
                            os: row.dimensionValues[6].value,
                            pagePath: row.dimensionValues[7].value,
                            pageTitle: row.dimensionValues[8].value
                        },
                        metrics: {
                            users: parseFloat(row.metricValues[0].value || 0),
                            sessions: parseFloat(row.metricValues[1].value || 0),
                            bounceRate: parseFloat(row.metricValues[2].value || 0),
                            pageViews: parseFloat(row.metricValues[3].value || 0),
                            avgSessionDuration: parseFloat(row.metricValues[4].value || 0),
                            conversions: parseFloat(row.metricValues[5].value || 0),
                            revenue: parseFloat(row.metricValues[6].value || 0),
                            engagementRate: parseFloat(row.metricValues[7].value || 0)
                        }
                    },
                    upsert: true
                }
            };
        });
        
        // Split into chunks of 1000 for safety
        for (let i = 0; i < operations.length; i += 1000) {
            const chunk = operations.slice(i, i + 1000);
            await DailyMetric.bulkWrite(chunk);
        }
    }
};


const syncGsc = async (acc, startDate, endDate) => {
    if (!acc || !acc.gscSiteUrl) return;
    const userId = acc.userId;

    // Fetch granular data: Date + Page + Query + Device + Country
    const res = await runGscQuery(userId, 'ultra_detail_sync', startDate, endDate, ['date', 'page', 'query', 'device', 'country']);
    
    if (res.rows) {
        // Increase limit to 25000 rows for maximum detail
        const operations = res.rows.slice(0, 25000).map(row => {
            return {
                updateOne: {
                    filter: { 
                        userId, 
                        platformAccountId: acc.gscSiteUrl,
                        source: 'gsc', 
                        date: row.keys[0],
                        'dimensions.page': row.keys[1],
                        'dimensions.query': row.keys[2],
                        'dimensions.device': row.keys[3],
                        'dimensions.country': row.keys[4]
                    },
                    update: {
                        dimensions: {
                            page: row.keys[1],
                            query: row.keys[2],
                            device: row.keys[3],
                            country: row.keys[4]
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
        
        // Split into chunks of 1000 for safety
        for (let i = 0; i < operations.length; i += 1000) {
            const chunk = operations.slice(i, i + 1000);
            await DailyMetric.bulkWrite(chunk);
        }
    }
};


const syncGoogleAds = async (acc, startDate, endDate) => {
    if (!acc || !acc.googleAdsCustomerId) return;
    const userId = acc.userId;

    // Fetch by Date + Campaign + Ad Group + Device + Network
    const query = `
        SELECT 
            segments.date, 
            campaign.name, 
            campaign.status,
            ad_group.name,
            ad_group.status,
            segments.device,
            segments.ad_network_type,
            metrics.cost_micros, 
            metrics.impressions, 
            metrics.clicks, 
            metrics.conversions,
            metrics.conversions_value,
            metrics.interactions,
            metrics.video_views
        FROM customer 
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    `;
    const res = await runGAdsQuery(userId, 'ultra_detail_sync', startDate, endDate, query);

    if (res && res.length > 0) {
        const operations = res.map(row => ({
            updateOne: {
                filter: { 
                    userId, 
                    platformAccountId: acc.googleAdsCustomerId,
                    source: 'google-ads', 
                    date: row.segments.date,
                    'dimensions.campaign': row.campaign.name,
                    'dimensions.campaignStatus': row.campaign.status,
                    'dimensions.adGroup': row.adGroup?.name,
                    'dimensions.adGroupStatus': row.adGroup?.status,
                    'dimensions.device': row.segments.device,
                    'dimensions.network': row.segments.adNetworkType
                },
                update: {
                    dimensions: {
                        campaign: row.campaign.name,
                        campaignStatus: row.campaign.status,
                        adGroup: row.adGroup?.name,
                        adGroupStatus: row.adGroup?.status,
                        device: row.segments.device,
                        network: row.segments.adNetworkType
                    },
                    metrics: {
                        spend: parseFloat(row.metrics.costMicros || 0) / 1000000,
                        impressions: parseFloat(row.metrics.impressions || 0),
                        clicks: parseFloat(row.metrics.clicks || 0),
                        conversions: parseFloat(row.metrics.conversions || 0),
                        conversionValue: parseFloat(row.metrics.conversionsValue || 0),
                        interactions: parseFloat(row.metrics.interactions || 0),
                        videoViews: parseFloat(row.metrics.videoViews || 0)
                    }
                },
                upsert: true
            }
        }));
        
        // Split into chunks of 1000 for safety
        for (let i = 0; i < operations.length; i += 1000) {
            const chunk = operations.slice(i, i + 1000);
            await DailyMetric.bulkWrite(chunk);
        }
    }
};


const syncFacebookAds = async (acc, startDate, endDate) => {
    if (!acc || !acc.facebookAdAccountId) return;
    const userId = acc.userId;

    // Fetch by Date + Campaign + Ad Set + Ad + Device + Placement
    const res = await getFbInsights(userId, 'ultra_detail_sync', startDate, endDate, 'ad', { 
        time_increment: 1,
        breakdowns: ['device_platform', 'publisher_platform']
    });

    if (res && res.length > 0) {
        const operations = res.map(row => ({
            updateOne: {
                filter: { 
                    userId, 
                    platformAccountId: acc.facebookAdAccountId,
                    source: 'facebook-ads', 
                    date: row.date_start,
                    'dimensions.campaign': row.campaign_name,
                    'dimensions.adset': row.adset_name,
                    'dimensions.ad': row.ad_name,
                    'dimensions.device': row.device_platform,
                    'dimensions.publisher': row.publisher_platform
                },
                update: {
                    dimensions: {
                        campaign: row.campaign_name,
                        adset: row.adset_name,
                        ad: row.ad_name,
                        device: row.device_platform,
                        publisher: row.publisher_platform
                    },
                    metrics: {
                        spend: parseFloat(row.spend || 0),
                        impressions: parseFloat(row.impressions || 0),
                        clicks: parseFloat(row.clicks || 0),
                        reach: parseFloat(row.reach || 0),
                        conversions: parseFloat(row.conversions?.[0]?.value || 0),
                        frequency: parseFloat(row.frequency || 0),
                        cpc: parseFloat(row.cpc || 0),
                        ctr: parseFloat(row.ctr || 0)
                    }
                },
                upsert: true
            }
        }));
        
        // Split into chunks of 1000 for safety
        for (let i = 0; i < operations.length; i += 1000) {
            const chunk = operations.slice(i, i + 1000);
            await DailyMetric.bulkWrite(chunk);
        }
    }
};



// Runs a daily sync for all connected platforms for all users
export const syncDailyForAllUsers = async () => {
    const users = await UserAccounts.find({});
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    for (const acc of users) {
        try {
            if (acc.ga4PropertyId) await syncGa4(acc, dateStr, dateStr);
            if (acc.gscSiteUrl) await syncGsc(acc, dateStr, dateStr);
            if (acc.googleAdsCustomerId) await syncGoogleAds(acc, dateStr, dateStr);
            if (acc.facebookAdAccountId) await syncFacebookAds(acc, dateStr, dateStr);
            
            await UserAccounts.findByIdAndUpdate(acc._id, { lastDailySyncAt: new Date() });
        } catch (e) {
            console.error(`Daily Sync Partial Fail for account ${acc._id}:`, e.message);
        }
    }

};

