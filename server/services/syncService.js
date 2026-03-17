import DailyMetric from '../models/DailyMetric.js';
import UserAccounts from '../models/UserAccounts.js';
import { runReport as runGa4Report } from './ga4Service.js';
import { runQuery as runGscQuery } from './gscService.js';
import { runQuery as runGAdsQuery } from './googleAdsService.js';
import { getInsights as getFbInsights } from './facebookAdsService.js';

let isGscCronRunning = false;
let isGa4CronRunning = false;
let isGAdsCronRunning = false;
let isFbCronRunning = false;

export const syncHistoricalData = async (accountId, source) => {
    const acc = await UserAccounts.findById(accountId);
    if (!acc) return;

    if (acc.syncStatus === 'syncing') {
        console.log(`[Historical Sync] Skip: Account ${acc.siteName} is already syncing.`);
        return;
    }

    const limits = {
        'gsc': 1.5,
        'ga4': 2,
        'google-ads': 3,
        'facebook-ads': 3
    };

    const years = limits[source] || 3;
    console.log(`[Historical Sync] Started for ${acc.siteName} (${source}), Length: ${years}y`);

    try {
        await UserAccounts.findByIdAndUpdate(accountId, { syncStatus: 'syncing' });

        const now = new Date();
        const currentYear = now.getFullYear();

        for (let i = 0; i < years; i++) {
            const startYear = currentYear - i - 1;
            const endYear = currentYear - i;

            const startDate = `${startYear}-01-01`;
            const endDate = i === 0 ? now.toISOString().split('T')[0] : `${startYear}-12-31`;

            console.log(`[Historical Sync] Processing Chunk: ${startDate} to ${endDate}`);

            switch (source) {
                case 'ga4': await syncGa4(acc, startDate, endDate); break;
                case 'gsc': await syncGsc(acc, startDate, endDate); break;
                case 'google-ads': await syncGoogleAds(acc, startDate, endDate); break;
                case 'facebook-ads': await syncFacebookAds(acc, startDate, endDate); break;
            }
        }

        const updateFields = {
            syncStatus: 'idle',
            lastDailySyncAt: new Date(),
            isHistoricalSyncComplete: true // Legacy support
        };

        if (source === 'ga4') updateFields.ga4HistoricalComplete = true;
        if (source === 'gsc') updateFields.gscHistoricalComplete = true;
        if (source === 'google-ads') updateFields.googleAdsHistoricalComplete = true;
        if (source === 'facebook-ads') updateFields.facebookAdsHistoricalComplete = true;

        await UserAccounts.findByIdAndUpdate(accountId, { $set: updateFields });

        console.log(`[Historical Sync] Success for ${acc.siteName} (${source})`);
    } catch (err) {
        console.error(`[Historical Sync] ERROR for ${source}:`, err.message);
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
            const formattedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
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

const getSyncRange = () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 2);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];
    return { startDate: threeDaysAgoStr, endDate: todayStr };
};

// GSC Sync (Every 12 Hours)
export const syncAllGsc = async () => {
    if (isGscCronRunning) return;
    isGscCronRunning = true;
    console.log('[Cron] Starting GSC Sync...');
    try {
        // Only sync if historical data for GSC is already fetched
        const users = await UserAccounts.find({
            gscSiteUrl: { $exists: true, $ne: null },
            gscHistoricalComplete: true
        });
        const { startDate, endDate } = getSyncRange();
        for (const acc of users) {
            try {
                // If account is already syncing (e.g. historical), skip it in this cron cycle
                if (acc.syncStatus === 'syncing') continue;

                await UserAccounts.findByIdAndUpdate(acc._id, { syncStatus: 'syncing' });
                await syncGsc(acc, startDate, endDate);
                await UserAccounts.findByIdAndUpdate(acc._id, { syncStatus: 'idle', lastDailySyncAt: new Date() });
            } catch (e) { console.error(`GSC Sync Fail: ${acc._id}`, e.message); }
        }
    } finally { isGscCronRunning = false; console.log('[Cron] GSC Sync Completed.'); }
};

// GA4 Sync (Every 4 Hours)
export const syncAllGa4 = async () => {
    if (isGa4CronRunning) return;
    isGa4CronRunning = true;
    console.log('[Cron] Starting GA4 Sync...');
    try {
        // Only sync if historical data for GA4 is already fetched
        const users = await UserAccounts.find({
            ga4PropertyId: { $exists: true, $ne: null },
            ga4HistoricalComplete: true
        });
        const { startDate, endDate } = getSyncRange();
        for (const acc of users) {
            try {
                if (acc.syncStatus === 'syncing') continue;

                await UserAccounts.findByIdAndUpdate(acc._id, { syncStatus: 'syncing' });
                await syncGa4(acc, startDate, endDate);
                await UserAccounts.findByIdAndUpdate(acc._id, { syncStatus: 'idle', lastDailySyncAt: new Date() });
            } catch (e) { console.error(`GA4 Sync Fail: ${acc._id}`, e.message); }
        }
    } finally { isGa4CronRunning = false; console.log('[Cron] GA4 Sync Completed.'); }
};

// Google Ads Sync (Every 1 Hour)
export const syncAllGoogleAds = async () => {
    if (isGAdsCronRunning) return;
    isGAdsCronRunning = true;
    console.log('[Cron] Starting Google Ads Sync...');
    try {
        // Only sync if historical data for Google Ads is already fetched
        const users = await UserAccounts.find({
            googleAdsCustomerId: { $exists: true, $ne: null },
            googleAdsHistoricalComplete: true
        });
        const { startDate, endDate } = getSyncRange();
        for (const acc of users) {
            try {
                if (acc.syncStatus === 'syncing') continue;

                await UserAccounts.findByIdAndUpdate(acc._id, { syncStatus: 'syncing' });
                await syncGoogleAds(acc, startDate, endDate);
                await UserAccounts.findByIdAndUpdate(acc._id, { syncStatus: 'idle', lastDailySyncAt: new Date() });
            } catch (e) { console.error(`Google Ads Sync Fail: ${acc._id}`, e.message); }
        }
    } finally { isGAdsCronRunning = false; console.log('[Cron] Google Ads Sync Completed.'); }
};

// Facebook Ads Sync (Every 30 Minutes)
export const syncAllFacebookAds = async () => {
    if (isFbCronRunning) return;
    isFbCronRunning = true;
    console.log('[Cron] Starting Facebook Ads Sync...');
    try {
        // Only sync if historical data for Facebook Ads is already fetched
        const users = await UserAccounts.find({
            facebookAdAccountId: { $exists: true, $ne: null },
            facebookAdsHistoricalComplete: true
        });
        const { startDate, endDate } = getSyncRange();
        for (const acc of users) {
            try {
                if (acc.syncStatus === 'syncing') continue;

                await UserAccounts.findByIdAndUpdate(acc._id, { syncStatus: 'syncing' });
                await syncFacebookAds(acc, startDate, endDate);
                await UserAccounts.findByIdAndUpdate(acc._id, { syncStatus: 'idle', lastDailySyncAt: new Date() });
            } catch (e) { console.error(`Facebook Ads Sync Fail: ${acc._id}`, e.message); }
        }
    } finally { isFbCronRunning = false; console.log('[Cron] Facebook Ads Sync Completed.'); }
};

// Keep original as a manual fallback
export const syncDailyForAllUsers = async () => {
    await syncAllFacebookAds();
    await syncAllGoogleAds();
    await syncAllGa4();
    await syncAllGsc();
};

