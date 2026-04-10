import DailyMetric from '../models/DailyMetric.js';
import UserAccounts from '../models/UserAccounts.js';
import mongoose from 'mongoose';
import { syncGsc, syncGa4, syncGoogleAds, syncFacebookAds } from '../services/syncService.js';
import NodeCache from 'node-cache';
import { callGemini } from '../services/geminiService.js';

// Initialize cache with 10-minute TTL
const analyticsCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// Helper to generate a unique cache key based on user, site, and filters
const getAnalyticsCacheKey = (userId, prefix, query) => {
    const { startDate, endDate, siteId, device } = query;
    return `${prefix}_${userId}_${siteId || 'any'}_${startDate}_${endDate}_${device || 'all'}`;
};

// Helper to clear all cache for a specific user (used after sync)
const clearUserCache = (userId) => {
    const keys = analyticsCache.keys();
    const userKeys = keys.filter(k => k.includes(`_${userId}_`));
    if (userKeys.length > 0) analyticsCache.del(userKeys);
};

export const buildMatchFilter = async (userId, source, query) => {
    const { startDate, endDate, device, siteId } = query;

    const filter = {
        'metadata.userId': userId,
        date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    if (siteId) {
        filter['metadata.siteId'] = typeof siteId === 'string' ? new mongoose.Types.ObjectId(siteId) : siteId;
    }

    if (source) {
        if (Array.isArray(source)) {
            filter['metadata.source'] = { $in: source };
        } else {
            filter['metadata.source'] = source;
        }
    }

    if (device) filter["metadata.dimensions.device"] = device;

    return filter;
};

export const getDashboardSummary = async (req, res) => {
    const { startDate, endDate, siteId } = req.query;
    const userId = req.user._id;

    const cacheKey = getAnalyticsCacheKey(userId, 'dash', req.query);
    const cachedData = analyticsCache.get(cacheKey);
    if (cachedData) return res.status(200).json(cachedData);

    try {
        const calculateGrowth = (current, previous) => {
            if (!previous || previous === 0) return current > 0 ? 100 : 0;
            const growth = ((current - previous) / previous) * 100;
            return Math.round(growth);
        };

        const acc = await UserAccounts.findOne({ _id: siteId, userId })
            .select('siteName lastDailySyncAt syncStatus isHistoricalSyncComplete ga4PropertyId gscSiteUrl googleAdsCustomerId facebookAdAccountId');

        const start = new Date(startDate);
        const end = new Date(endDate);
        const duration = end - start;
        const prevEnd = new Date(start.getTime() - (24 * 60 * 60 * 1000));
        const prevStart = new Date(prevEnd.getTime() - duration);

        const filters = await Promise.all([
            buildMatchFilter(userId, 'ga4', req.query),
            buildMatchFilter(userId, 'gsc', req.query),
            buildMatchFilter(userId, 'google-ads', req.query),
            buildMatchFilter(userId, 'facebook-ads', req.query),
            buildMatchFilter(userId, 'ga4', { ...req.query, startDate: prevStart.toISOString().split('T')[0], endDate: prevEnd.toISOString().split('T')[0] }),
            buildMatchFilter(userId, 'gsc', { ...req.query, startDate: prevStart.toISOString().split('T')[0], endDate: prevEnd.toISOString().split('T')[0] }),
            buildMatchFilter(userId, 'google-ads', { ...req.query, startDate: prevStart.toISOString().split('T')[0], endDate: prevEnd.toISOString().split('T')[0] }),
            buildMatchFilter(userId, 'facebook-ads', { ...req.query, startDate: prevStart.toISOString().split('T')[0], endDate: prevEnd.toISOString().split('T')[0] })
        ]);

        const [ga4Data, gscData, gAdsData, fAdsData, ga4Ts, gscTs, adsTs, pGa4Data, pGscData, pGAdsData, pFAdsData, topPages] = await Promise.all([
            // Current Period Aggregates (0-3)
            DailyMetric.aggregate([{ $match: filters[0] }, { $group: { _id: null, users: { $sum: "$metrics.users" }, sessions: { $sum: "$metrics.sessions" }, pageViews: { $sum: "$metrics.pageViews" }, bounceRate: { $avg: "$metrics.bounceRate" }, avgSessionDuration: { $avg: "$metrics.avgSessionDuration" } } }]),
            DailyMetric.aggregate([{ $match: filters[1] }, { $group: { _id: null, clicks: { $sum: "$metrics.clicks" }, impressions: { $sum: "$metrics.impressions" }, position: { $avg: "$metrics.position" } } }]),
            DailyMetric.aggregate([{ $match: filters[2] }, { $group: { _id: null, spend: { $sum: "$metrics.spend" }, conversions: { $sum: "$metrics.conversions" }, impressions: { $sum: "$metrics.impressions" }, clicks: { $sum: "$metrics.clicks" }, reach: { $sum: "$metrics.reach" }, purchaseValue: { $sum: "$metrics.purchase_value" } } }]),
            DailyMetric.aggregate([{ $match: filters[3] }, { $group: { _id: null, spend: { $sum: "$metrics.spend" }, conversions: { $sum: "$metrics.conversions" }, impressions: { $sum: "$metrics.impressions" }, clicks: { $sum: "$metrics.clicks" }, reach: { $sum: "$metrics.reach" }, purchaseValue: { $sum: "$metrics.purchase_value" } } }]),
            // Timeseries (Combined Ads Spend)
            DailyMetric.aggregate([{ $match: filters[0] }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, sessions: { $sum: "$metrics.sessions" } } }, { $sort: { _id: 1 } }]),
            DailyMetric.aggregate([{ $match: filters[1] }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, clicks: { $sum: "$metrics.clicks" }, impressions: { $sum: "$metrics.impressions" } } }, { $sort: { _id: 1 } }]),
            DailyMetric.aggregate([{ $match: { $or: [filters[2], filters[3]] } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, spend: { $sum: "$metrics.spend" }, conversions: { $sum: "$metrics.conversions" } } }, { $sort: { _id: 1 } }]),
            // Prior Period for Growth (4-7)
            DailyMetric.aggregate([{ $match: filters[4] }, { $group: { _id: null, sessions: { $sum: "$metrics.sessions" }, users: { $sum: "$metrics.users" } } }]),
            DailyMetric.aggregate([{ $match: filters[5] }, { $group: { _id: null, clicks: { $sum: "$metrics.clicks" }, impressions: { $sum: "$metrics.impressions" } } }]),
            DailyMetric.aggregate([{ $match: filters[6] }, { $group: { _id: null, spend: { $sum: "$metrics.spend" }, conversions: { $sum: "$metrics.conversions" } } }]),
            DailyMetric.aggregate([{ $match: filters[7] }, { $group: { _id: null, spend: { $sum: "$metrics.spend" }, reach: { $sum: "$metrics.reach" } } }]),
            // Content
            DailyMetric.aggregate([{ $match: filters[0] }, { $group: { _id: "$metadata.dimensions.pagePath", views: { $sum: "$metrics.pageViews" }, users: { $sum: "$metrics.users" }, bounceRate: { $avg: "$metrics.bounceRate" } } }, { $sort: { views: -1 } }, { $limit: 10 }])
        ]);

        // STEP 4: Advanced Mapping
        const ga = ga4Data[0] || { users: 0, sessions: 0, pageViews: 0, bounceRate: 0, avgSessionDuration: 0 };
        const gsRaw = gscData[0] || { clicks: 0, impressions: 0, position: 0 };
        const gs = { ...gsRaw, ctr: gsRaw.impressions > 0 ? (gsRaw.clicks / gsRaw.impressions) : 0 };

        const processAds = (data) => {
            const d = data || { spend: 0, conversions: 0, clicks: 0, impressions: 0, reach: 0, purchaseValue: 0 };
            return {
                ...d,
                cpc: d.clicks > 0 ? d.spend / d.clicks : 0,
                cpm: d.impressions > 0 ? (d.spend / d.impressions) * 1000 : 0,
                ctr: d.impressions > 0 ? (d.clicks / d.impressions) : 0,
                roas: d.spend > 0 ? (d.purchaseValue || 0) / d.spend : 0
            };
        };

        const ad = {
            google: processAds(gAdsData[0]),
            facebook: processAds(fAdsData[0])
        };

        const pAd = {
            google: pGAdsData[0] || { spend: 0, conversions: 0 },
            facebook: pFAdsData[0] || { spend: 0, reach: 0 }
        };

        const pGa = pGa4Data[0] || { users: 0, sessions: 0 };
        const pGs = pGscData[0] || { clicks: 0, impressions: 0 };

        const tsMap = {};
        const allDates = [...new Set([
            ...ga4Ts.map(d => d._id),
            ...gscTs.map(d => d._id),
            ...adsTs.map(d => d._id)
        ])].sort((a, b) => new Date(a) - new Date(b));

        allDates.forEach(date => {
            tsMap[date] = { date, Sessions: 0, Clicks: 0, Spend: 0, Conversions: 0, Impressions: 0 };
        });

        ga4Ts.forEach(d => { if (tsMap[d._id]) tsMap[d._id].Sessions = d.sessions; });
        gscTs.forEach(d => { if (tsMap[d._id]) tsMap[d._id].Clicks = d.clicks; });
        adsTs.forEach(d => { 
            if (tsMap[d._id]) { 
                tsMap[d._id].Spend = d.spend; 
                tsMap[d._id].Conversions = d.conversions; 
                tsMap[d._id].Impressions = d.impressions; 
            } 
        });

        // STEP 5: Strategic AI Intelligence
        const dataForAI = {
            siteName: acc?.siteName || 'Site',
            ga4: ga,
            gsc: { ...gs, avgPosition: gsRaw.position },
            googleAds: ad.google,
            facebookAds: ad.facebook,
            topPages: topPages
        };

        const generateIntelligence = async (data) => {
            try {
                const prompt = `
                  Analyze this marketing data and provide EXACTLY 16 professional, punchy, one-liner summaries (Max 10 words each).

                  RAW DATA:
                  - GA4: ${data.ga4.sessions} sessions, ${data.ga4.bounceRate}% bounce.
                  - GSC: ${data.gsc.clicks} clicks, #${data.gsc.avgPosition} pos.
                  - Google Ads: $${data.googleAds.spend} spend, ${data.googleAds.conversions} conv.
                  - FB Ads: $${data.facebookAds.spend} spend, ${data.facebookAds.roas}x ROAS.
                  - Top page: ${data.topPages[0]?.url || 'Home'}.

                  EXPECTED JSON FORMAT (Strictly 16 single-string fields):
                  {
                    "websiteSummary": "Overall site performance summary.",
                    "overviewGA4": "GA4 card insight.",
                    "overviewGSC": "GSC card insight.",
                    "overviewGAds": "Google Ads card insight.",
                    "overviewFAds": "FB Ads card insight.",
                    "overviewHealth": "Audit score card insight.",
                    "metricTraffic": "Total traffic card insight.",
                    "metricClicks": "Organic clicks card insight.",
                    "metricSpend": "Total ad spend card insight.",
                    "metricConversions": "Total conversions card insight.",
                    "metricImpressions": "Total ad impressions card insight.",
                    "metricEfficiency": "Efficiency score card insight.",
                    "adWinnerInsight": "Ads comparison table insight.",
                    "growthMatrixInsight": "Growth matrix chart insight.",
                    "topPagesInsight": "Top pages table insight.",
                    "comparisonInsight": "Prior period comparison table insight."
                  }

                  STRICT RULES:
                  1. Each field must be a SINGLE punchy string (Max 10 words).
                  2. NO arrays. NO markdown. ONLY valid JSON.
                `;
                const aiRes = await callGemini(prompt, [], "Respond ONLY with JSON.");
                return JSON.parse(aiRes.content.replace(/```json|```/g, '').trim());
            } catch (error) {
                console.error("Gemini AI failed, using Data-Driven Fallback Engine:", error);
                const hScore = data.ga4.sessions > 0 ? (data.ga4.bounceRate < 50 ? 85 : 65) : 50;
                return {
                    websiteSummary: `Monitoring ${data.siteName} performance across core metrics.`,
                    overviewGA4: `Analyzing high-volume traffic across user engagement.`,
                    overviewGSC: data.gsc.clicks > 0 ? "SEO visibility is showing stable organic growth." : "Connect GSC to monitor search performance.",
                    overviewGAds: data.googleAds.spend > 0 ? "Google Ads campaigns are actively spending." : "Activate Google Ads to monitor paid performance.",
                    overviewFAds: data.facebookAds.spend > 0 ? "Facebook ad reach is expanding profitably." : "Link Facebook Ads for social performance.",
                    overviewHealth: "Exceptional health score optimized for delivery.",
                    metricTraffic: `Traffic is currently stable at ${data.ga4.sessions} sessions.`,
                    metricClicks: `Organic search is driving ${data.gsc.clicks} targeted clicks.`,
                    metricSpend: `Combined ad investment is $${data.googleAds.spend + data.facebookAds.spend}.`,
                    metricConversions: `Conversion tracking has captured ${data.googleAds.conversions} events.`,
                    metricImpressions: `Paid media reach is generating steady impressions.`,
                    metricEfficiency: `Calculated efficiency reflects optimal ROAS levels.`,
                    adWinnerInsight: "Platform performance comparison shows clear efficiency leaders.",
                    growthMatrixInsight: "Real-time performance distribution across timeframe.",
                    topPagesInsight: "Analyzing most engaging landing pages for optimization.",
                    comparisonInsight: "Historical growth mapping vs previous period data.",
                    healthScore: hScore
                };
            }
        };

        const intelligence = await generateIntelligence(dataForAI);
        const totalSessions = ga.sessions || 0;
        const result = {
            userName: req.user?.name || 'User',
            siteName: acc?.siteName || 'Select Website',
            lastDailySyncAt: acc?.lastDailySyncAt,
            syncStatus: acc?.syncStatus || 'idle',
            isHistoricalSyncComplete: acc?.isHistoricalSyncComplete || false,

            ga4: { 
                ...ga, 
                priorSessions: pGa.sessions, 
                priorUsers: pGa.users,
                growthSessions: calculateGrowth(ga.sessions, pGa.sessions), 
                growthUsers: calculateGrowth(ga.users, pGa.users), 
                growthStatus: ga.sessions >= pGa.sessions ? 'positive' : 'negative' 
            },
            gsc: { 
                ...gs, 
                priorClicks: pGs.clicks, 
                priorImpressions: pGs.impressions,
                growthClicks: calculateGrowth(gs.clicks, pGs.clicks),
                growthImpressions: calculateGrowth(gs.impressions, pGs.impressions), 
                growthStatus: gs.clicks >= pGs.clicks ? 'positive' : 'negative' 
            },
            googleAds: { 
                ...ad.google, 
                priorConversions: pAd.google.conversions, 
                priorSpend: pAd.google.spend,
                growthConversions: calculateGrowth(ad.google.conversions, pAd.google.conversions), 
                growthSpend: calculateGrowth(ad.google.spend, pAd.google.spend), 
                growthStatus: ad.google.conversions >= pAd.google.conversions ? 'positive' : 'negative' 
            },
            facebookAds: { 
                ...ad.facebook, 
                priorSpend: pAd.facebook.spend, 
                priorReach: pAd.facebook.reach,
                growthSpend: calculateGrowth(ad.facebook.spend, pAd.facebook.spend), 
                growthReach: calculateGrowth(ad.facebook.reach, pAd.facebook.reach), 
                growthStatus: ad.facebook.spend <= pAd.facebook.spend ? 'positive' : 'negative' 
            },

            adWinners: {
                spend: ad.google.spend < ad.facebook.spend ? 'Google Ads' : 'Facebook Ads',
                clicks: ad.google.clicks > ad.facebook.clicks ? 'Google Ads' : 'Facebook Ads',
                conversions: ad.google.conversions > ad.facebook.conversions ? 'Google Ads' : 'Facebook Ads',
                cpc: (ad.google.cpc > 0 && ad.google.cpc < ad.facebook.cpc) ? 'Google Ads' : 'Facebook Ads',
                ctr: ad.google.ctr > ad.facebook.ctr ? 'Google Ads' : 'Facebook Ads'
            },
            connectionStatus: { ga4: !!acc?.ga4PropertyId, gsc: !!acc?.gscSiteUrl, googleAds: !!acc?.googleAdsCustomerId, facebookAds: !!acc?.facebookAdAccountId },

            // Analytics Assets
            timeseries: Object.values(tsMap).sort((a, b) => a.date.localeCompare(b.date)),
            topPages: topPages.map(p => ({ 
                url: p._id || '/', 
                visitors: p.users, 
                views: p.views, 
                bounce: (p.bounceRate || 0).toFixed(0) + '%', 
                share: totalSessions > 0 ? ((p.users / totalSessions) * 100).toFixed(1) : 0 
            })),

            // AI Intelligence Package
            intelligence: {
                ...intelligence,
                auditLabel: intelligence.healthScore > 80 ? 'EXCELLENT' : intelligence.healthScore > 50 ? 'STABLE' : 'NEEDS REVIEW',
            },
        };

        analyticsCache.set(cacheKey, result);

        res.status(200).json(result);
    } catch (error) {
        console.error('Dashboard Summary Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary' });
    }
};

export const getGa4Summary = async (req, res) => {
    const { startDate, endDate, siteId } = req.query;
    const userId = req.user._id;

    const cacheKey = getAnalyticsCacheKey(userId, 'ga4', req.query);
    const cachedData = analyticsCache.get(cacheKey);
    if (cachedData) return res.status(200).json(cachedData);

    try {
        // Fetch account metadata if siteId is provided
        let syncMetadata = null;
        if (siteId) {
            const acc = await UserAccounts.findOne({ _id: siteId, userId }).select('lastDailySyncAt syncStatus isHistoricalSyncComplete');
            if (acc) {
                syncMetadata = {
                    lastDailySyncAt: acc.lastDailySyncAt,
                    syncStatus: acc.syncStatus,
                    isHistoricalSyncComplete: acc.isHistoricalSyncComplete
                };
            }
        }
        const filter = await buildMatchFilter(userId, 'ga4', req.query);

        // Calculate previous period
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diff = end - start;
        const prevEnd = new Date(start.getTime() - (24 * 60 * 60 * 1000));
        const prevStart = new Date(prevEnd.getTime() - diff);
        const prevStartDate = prevStart.toISOString().split('T')[0];
        const prevEndDate = prevEnd.toISOString().split('T')[0];

        const prevFilter = await buildMatchFilter(userId, 'ga4', { ...req.query, startDate: prevStartDate, endDate: prevEndDate });

        const [overview, priorOverview, timeseries, traffic, pages, ga4BreakdownsDevices, ga4BreakdownsLocations] = await Promise.all([
            DailyMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        users: { $sum: "$metrics.users" },
                        sessions: { $sum: "$metrics.sessions" },
                        bounceRate: { $avg: "$metrics.bounceRate" },
                        avgSessionDuration: { $avg: "$metrics.avgSessionDuration" },
                        pageViews: { $sum: "$metrics.pageViews" }
                    }
                }
            ]),
            DailyMetric.aggregate([
                { $match: prevFilter },
                {
                    $group: {
                        _id: null,
                        users: { $sum: "$metrics.users" },
                        sessions: { $sum: "$metrics.sessions" },
                        bounceRate: { $avg: "$metrics.bounceRate" },
                        avgSessionDuration: { $avg: "$metrics.avgSessionDuration" },
                        pageViews: { $sum: "$metrics.pageViews" }
                    }
                }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        sessions: { $sum: "$metrics.sessions" },
                        pageViews: { $sum: "$metrics.pageViews" },
                        users: { $sum: "$metrics.users" },
                        bounceRate: { $avg: "$metrics.bounceRate" }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: { channel: "$metadata.dimensions.channel", source: "$metadata.dimensions.source" },
                        sessions: { $sum: "$metrics.sessions" },
                        users: { $sum: "$metrics.users" }
                    }
                },
                { $sort: { sessions: -1 } },
                { $limit: 10 }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: { path: "$metadata.dimensions.pagePath", title: "$metadata.dimensions.pageTitle" },
                        views: { $sum: "$metrics.pageViews" },
                        users: { $sum: "$metrics.users" },
                        bounceRate: { $avg: "$metrics.bounceRate" }
                    }
                },
                { $sort: { views: -1 } },
                { $limit: 10 }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: "$metadata.dimensions.device",
                        value: { $sum: "$metrics.sessions" }
                    }
                },
                { $sort: { value: -1 } }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: "$metadata.dimensions.country",
                        value: { $sum: "$metrics.sessions" }
                    }
                },
                { $sort: { value: -1 } },
                { $limit: 5 }
            ])
        ]);


        const result = {
            overview: overview[0] || { users: 0, sessions: 0, bounceRate: 0, avgSessionDuration: 0, pageViews: 0 },
            priorOverview: priorOverview[0] || { users: 0, sessions: 0, bounceRate: 0, avgSessionDuration: 0, pageViews: 0 },
            timeseries: timeseries.map(d => ({
                date: d._id,
                sessions: d.sessions,
                pageViews: d.pageViews || 0,
                users: d.users || 0,
                bounceRate: parseFloat((d.bounceRate || 0).toFixed(1)) // Already scaled in syncService
            })),
            traffic: traffic.map(d => ({ channel: d._id.channel, source: d._id.source, sessions: d.sessions, users: d.users })),
            pages: pages.map(d => ({ path: d._id.path, title: d._id.title, views: d.views, users: d.users, bounceRate: d.bounceRate })),
            breakdowns: {
                devices: (ga4BreakdownsDevices || []).map(d => ({ name: d._id || 'unknown', value: d.value })),
                locations: (ga4BreakdownsLocations || []).map(d => ({ name: d._id || 'unknown', value: d.value }))
            },
            syncMetadata
        };

        analyticsCache.set(cacheKey, result);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getGscSummary = async (req, res) => {
    const { startDate, endDate, siteId } = req.query;
    const userId = req.user._id;

    const cacheKey = getAnalyticsCacheKey(userId, 'gsc', req.query);
    const cachedData = analyticsCache.get(cacheKey);
    if (cachedData) return res.status(200).json(cachedData);

    try {
        // Fetch account metadata if siteId is provided
        let syncMetadata = null;
        if (siteId) {
            const acc = await UserAccounts.findOne({ _id: siteId, userId }).select('lastDailySyncAt syncStatus isHistoricalSyncComplete');
            if (acc) {
                syncMetadata = {
                    lastDailySyncAt: acc.lastDailySyncAt,
                    syncStatus: acc.syncStatus,
                    isHistoricalSyncComplete: acc.isHistoricalSyncComplete
                };
            }
        }
        const filter = await buildMatchFilter(userId, 'gsc', req.query);

        // Previous period
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diff = end - start;
        const prevEnd = new Date(start.getTime() - (24 * 60 * 60 * 1000));
        const prevStart = new Date(prevEnd.getTime() - diff);
        const prevFilter = await buildMatchFilter(userId, 'gsc', { ...req.query, startDate: prevStart.toISOString().split('T')[0], endDate: prevEnd.toISOString().split('T')[0] });

        const [overview, priorOverview, timeseries, queries, pages, deviceBreakdown, countryBreakdown] = await Promise.all([
            DailyMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        clicks: { $sum: "$metrics.clicks" },
                        impressions: { $sum: "$metrics.impressions" },
                        position: { $avg: "$metrics.position" }
                    }
                }
            ]),
            DailyMetric.aggregate([
                { $match: prevFilter },
                {
                    $group: {
                        _id: null,
                        clicks: { $sum: "$metrics.clicks" },
                        impressions: { $sum: "$metrics.impressions" },
                        position: { $avg: "$metrics.position" }
                    }
                }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        clicks: { $sum: "$metrics.clicks" },
                        impressions: { $sum: "$metrics.impressions" },
                        position: { $avg: "$metrics.position" }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: "$metadata.dimensions.query",
                        clicks: { $sum: "$metrics.clicks" },
                        impressions: { $sum: "$metrics.impressions" },
                        position: { $avg: "$metrics.position" }
                    }
                },
                { $sort: { clicks: -1 } },
                { $limit: 20 }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: "$metadata.dimensions.page",
                        clicks: { $sum: "$metrics.clicks" },
                        impressions: { $sum: "$metrics.impressions" },
                        position: { $avg: "$metrics.position" }
                    }
                },
                { $sort: { clicks: -1 } },
                { $limit: 10 }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: { _id: "$metadata.dimensions.device", value: { $sum: "$metrics.clicks" } } }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: { _id: "$metadata.dimensions.country", value: { $sum: "$metrics.clicks" } } },
                { $sort: { value: -1 } },
                { $limit: 10 }
            ])
        ]);


        const ov = overview[0] || { clicks: 0, impressions: 0, position: 0 };
        const pov = priorOverview[0] || { clicks: 0, impressions: 0, position: 0 };

        const result = {
            overview: { ...ov, ctr: ov.impressions > 0 ? ov.clicks / ov.impressions : 0 },
            priorOverview: { ...pov, ctr: pov.impressions > 0 ? pov.clicks / pov.impressions : 0 },
            timeseries: timeseries.map(d => ({
                date: d._id,
                clicks: d.clicks,
                impressions: d.impressions,
                position: d.position || 0,
                ctr: d.impressions > 0 ? d.clicks / d.impressions : 0
            })),
            queries: queries.map(d => ({ query: d._id, clicks: d.clicks, impressions: d.impressions, ctr: d.impressions > 0 ? d.clicks / d.impressions : 0, position: d.position })),
            pages: pages.map(d => ({ page: d._id, clicks: d.clicks, impressions: d.impressions, ctr: d.impressions > 0 ? d.clicks / d.impressions : 0, position: d.position })),
            devices: deviceBreakdown.map(d => ({ name: d._id || 'unknown', value: d.value })),
            countries: countryBreakdown.map(d => ({ name: d._id || 'unknown', value: d.value })),
            syncMetadata
        };

        analyticsCache.set(cacheKey, result);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getGoogleAdsSummary = async (req, res) => {
    const { startDate, endDate, siteId } = req.query;
    const userId = req.user._id;

    const cacheKey = getAnalyticsCacheKey(userId, 'gads', req.query);
    const cachedData = analyticsCache.get(cacheKey);
    if (cachedData) return res.status(200).json(cachedData);

    try {
        // Fetch account metadata if siteId is provided
        let syncMetadata = null;
        if (siteId) {
            const acc = await UserAccounts.findOne({ _id: siteId, userId }).select('lastDailySyncAt syncStatus isHistoricalSyncComplete');
            if (acc) {
                syncMetadata = {
                    lastDailySyncAt: acc.lastDailySyncAt,
                    syncStatus: acc.syncStatus,
                    isHistoricalSyncComplete: acc.isHistoricalSyncComplete
                };
            }
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diff = end - start;
        const prevEnd = new Date(start.getTime() - (24 * 60 * 60 * 1000));
        const prevStart = new Date(prevEnd.getTime() - diff);
        const prevStartDate = prevStart.toISOString().split('T')[0];
        const prevEndDate = prevEnd.toISOString().split('T')[0];

        const filter = await buildMatchFilter(userId, 'google-ads', req.query);
        const prevFilter = await buildMatchFilter(userId, 'google-ads', { ...req.query, startDate: prevStartDate, endDate: prevEndDate });

        const [overview, priorOverview, timeseries, campaigns, keywords, deviceBreakdown] = await Promise.all([
            DailyMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        cost: { $sum: "$metrics.spend" },
                        impressions: { $sum: "$metrics.impressions" },
                        clicks: { $sum: "$metrics.clicks" },
                        conversions: { $sum: "$metrics.conversions" }
                    }
                }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        cost: { $sum: "$metrics.spend" },
                        clicks: { $sum: "$metrics.clicks" },
                        impressions: { $sum: "$metrics.impressions" },
                        conversions: { $sum: "$metrics.conversions" }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            DailyMetric.aggregate([
                { $match: prevFilter },
                {
                    $group: {
                        _id: null,
                        cost: { $sum: "$metrics.spend" },
                        impressions: { $sum: "$metrics.impressions" },
                        clicks: { $sum: "$metrics.clicks" },
                        conversions: { $sum: "$metrics.conversions" }
                    }
                }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: { name: "$metadata.dimensions.campaign", status: "$metadata.dimensions.campaignStatus" },
                        cost: { $sum: "$metrics.spend" },
                        impressions: { $sum: "$metrics.impressions" },
                        clicks: { $sum: "$metrics.clicks" },
                        conversions: { $sum: "$metrics.conversions" }
                    }
                },
                { $sort: { cost: -1 } }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: "$metadata.dimensions.adGroup",
                        cost: { $sum: "$metrics.spend" },
                        impressions: { $sum: "$metrics.impressions" },
                        clicks: { $sum: "$metrics.clicks" }
                    }
                },
                { $sort: { cost: -1 } },
                { $limit: 10 }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: { _id: "$metadata.dimensions.device", value: { $sum: "$metrics.spend" } } }
            ])
        ]);


        const ov = overview[0] || { cost: 0, impressions: 0, clicks: 0, conversions: 0 };
        const pov = priorOverview[0] || { cost: 0, impressions: 0, clicks: 0, conversions: 0 };

        const result = {
            overview: {
                ...ov,
                spend: ov.cost,
                ctr: ov.impressions > 0 ? ov.clicks / ov.impressions : 0,
                cpc: ov.clicks > 0 ? ov.cost / ov.clicks : 0,
                conversionRate: ov.clicks > 0 ? ov.conversions / ov.clicks : 0
            },
            priorOverview: {
                ...pov,
                spend: pov.cost,
                ctr: pov.impressions > 0 ? pov.clicks / pov.impressions : 0,
                cpc: pov.clicks > 0 ? pov.cost / pov.clicks : 0,
                conversionRate: pov.clicks > 0 ? pov.conversions / pov.clicks : 0
            },
            timeseries: timeseries.map(d => ({
                date: d._id,
                cost: d.cost,
                clicks: d.clicks,
                impressions: d.impressions,
                conversions: d.conversions
            })),
            devices: deviceBreakdown.map(d => ({ name: d._id || 'unknown', value: d.value })),
            campaigns: campaigns.map(d => ({
                name: d._id.name,
                status: d._id.status,
                cost: d.cost,
                impressions: d.impressions,
                clicks: d.clicks,
                conversions: d.conversions,
                ctr: d.impressions > 0 ? d.clicks / d.impressions : 0,
                cpc: d.clicks > 0 ? d.cost / d.clicks : 0
            })),
            keywords: keywords.map(d => ({
                name: d._id,
                cost: d.cost,
                impressions: d.impressions,
                clicks: d.clicks,
                ctr: d.impressions > 0 ? d.clicks / d.impressions : 0,
                cpc: d.clicks > 0 ? d.cost / d.clicks : 0
            })),
            syncMetadata
        };

        analyticsCache.set(cacheKey, result);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getFacebookAdsSummary = async (req, res) => {
    const { startDate, endDate, siteId } = req.query;
    const userId = req.user._id;

    const cacheKey = getAnalyticsCacheKey(userId, 'fbads', req.query);
    const cachedData = analyticsCache.get(cacheKey);
    if (cachedData) return res.status(200).json(cachedData);

    try {
        // Fetch account metadata if siteId is provided
        let syncMetadata = null;
        if (siteId) {
            const acc = await UserAccounts.findOne({ _id: siteId, userId }).select('lastDailySyncAt syncStatus isHistoricalSyncComplete');
            if (acc) {
                syncMetadata = {
                    lastDailySyncAt: acc.lastDailySyncAt,
                    syncStatus: acc.syncStatus,
                    isHistoricalSyncComplete: acc.isHistoricalSyncComplete
                };
            }
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diff = end - start;
        const prevEnd = new Date(start.getTime() - (24 * 60 * 60 * 1000));
        const prevStart = new Date(prevEnd.getTime() - diff);
        const prevStartDate = prevStart.toISOString().split('T')[0];
        const prevEndDate = prevEnd.toISOString().split('T')[0];

        const filter = await buildMatchFilter(userId, 'facebook-ads', req.query);
        const prevFilter = await buildMatchFilter(userId, 'facebook-ads', { ...req.query, startDate: prevStartDate, endDate: prevEndDate });

        const [overview, priorOverview, timeseries, campaigns, adsets, deviceBreakdown] = await Promise.all([
            DailyMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        spend: { $sum: "$metrics.spend" },
                        impressions: { $sum: "$metrics.impressions" },
                        clicks: { $sum: "$metrics.clicks" },
                        conversions: { $sum: "$metrics.conversions" },
                        reach: { $sum: "$metrics.reach" },
                        purchase_value: { $sum: "$metrics.purchase_value" }
                    }
                }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        spend: { $sum: "$metrics.spend" },
                        clicks: { $sum: "$metrics.clicks" },
                        impressions: { $sum: "$metrics.impressions" },
                        reach: { $sum: "$metrics.reach" }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            DailyMetric.aggregate([
                { $match: prevFilter },
                {
                    $group: {
                        _id: null,
                        spend: { $sum: "$metrics.spend" },
                        impressions: { $sum: "$metrics.impressions" },
                        clicks: { $sum: "$metrics.clicks" },
                        conversions: { $sum: "$metrics.conversions" },
                        reach: { $sum: "$metrics.reach" },
                        purchase_value: { $sum: "$metrics.purchase_value" }
                    }
                }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: "$metadata.dimensions.campaign",
                        spend: { $sum: "$metrics.spend" },
                        impressions: { $sum: "$metrics.impressions" },
                        clicks: { $sum: "$metrics.clicks" },
                        conversions: { $sum: "$metrics.conversions" },
                        reach: { $sum: "$metrics.reach" }
                    }
                },
                { $sort: { spend: -1 } }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: "$metadata.dimensions.adset",
                        spend: { $sum: "$metrics.spend" },
                        impressions: { $sum: "$metrics.impressions" },
                        clicks: { $sum: "$metrics.clicks" },
                        conversions: { $sum: "$metrics.conversions" },
                        reach: { $sum: "$metrics.reach" }
                    }
                },
                { $sort: { spend: -1 } },
                { $limit: 10 }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: { _id: "$metadata.dimensions.device", value: { $sum: "$metrics.spend" } } }
            ])
        ]);


        const ov = overview[0] || { spend: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0, purchase_value: 0 };
        const pov = priorOverview[0] || { spend: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0, purchase_value: 0 };

        const result = {
            overview: {
                ...ov,
                ctr: ov.impressions > 0 ? (ov.clicks / ov.impressions) * 100 : 0,
                cpc: ov.clicks > 0 ? ov.spend / ov.clicks : 0,
                roas: ov.spend > 0 ? (ov.purchase_value || (ov.conversions * 50)) / ov.spend : 0
            },
            priorOverview: {
                ...pov,
                ctr: pov.impressions > 0 ? (pov.clicks / pov.impressions) * 100 : 0,
                cpc: pov.clicks > 0 ? pov.spend / pov.clicks : 0,
                roas: pov.spend > 0 ? (pov.purchase_value || (pov.conversions * 50)) / pov.spend : 0
            },
            timeseries: timeseries.map(d => ({
                date: d._id,
                spend: d.spend,
                clicks: d.clicks,
                impressions: d.impressions,
                reach: d.reach || 0
            })),
            devices: deviceBreakdown.map(d => ({ name: d._id || 'unknown', value: d.value })),
            campaigns: campaigns.map(d => ({
                name: d._id,
                spend: d.spend,
                impressions: d.impressions,
                clicks: d.clicks,
                conversions: d.conversions,
                reach: d.reach || 0,
                ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
                cpc: d.clicks > 0 ? d.spend / d.clicks : 0
            })),
            adsets: adsets.map(d => ({
                name: d._id,
                spend: d.spend,
                impressions: d.impressions,
                clicks: d.clicks,
                conversions: d.conversions,
                reach: d.reach || 0,
                ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
                cpc: d.clicks > 0 ? d.spend / d.clicks : 0
            })),
            syncMetadata
        };

        analyticsCache.set(cacheKey, result);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const syncAccountData = async (req, res) => {
    const { siteId } = req.body;
    const userId = req.user._id;

    if (!siteId) {
        return res.status(400).json({ success: false, message: 'Site ID is required' });
    }

    try {
        const acc = await UserAccounts.findOne({ _id: siteId, userId });
        if (!acc) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }

        // Check if sync was done very recently (e.g. within 30 minutes) to prevent abuse
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
        if (acc.lastDailySyncAt && acc.lastDailySyncAt > thirtyMinsAgo && acc.syncStatus !== 'error') {
            return res.status(200).json({
                success: true,
                message: 'Data is already up to date (synced within last 30 minutes)',
                alreadySynced: true
            });
        }

        // Update status to syncing
        await UserAccounts.findByIdAndUpdate(siteId, { syncStatus: 'syncing' });

        // Calculate a small window for daily refresh (last 7 days)
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const startDate = sevenDaysAgo.toISOString().split('T')[0];
        const endDate = todayStr;

        // Perform sync for all connected platforms on this account
        const syncTasks = [];
        if (acc.gscSiteUrl) syncTasks.push(syncGsc(acc, startDate, endDate));
        if (acc.ga4PropertyId) syncTasks.push(syncGa4(acc, startDate, endDate));
        if (acc.googleAdsCustomerId) syncTasks.push(syncGoogleAds(acc, startDate, endDate));
        if (acc.facebookAdAccountId) syncTasks.push(syncFacebookAds(acc, startDate, endDate));

        await Promise.all(syncTasks);

        // Update status back to idle
        await UserAccounts.findByIdAndUpdate(siteId, {
            syncStatus: 'idle',
            lastDailySyncAt: new Date()
        });

        // Clear cache for this user since data has changed
        clearUserCache(userId);

        res.status(200).json({
            success: true,
            message: 'Synchronization completed successfully'
        });
    } catch (error) {
        console.error('Manual Sync Error:', error);
        await UserAccounts.findByIdAndUpdate(siteId, { syncStatus: 'error' });
        res.status(500).json({
            success: false,
            message: 'Synchronization failed: ' + error.message
        });
    }
};
