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
            ga4: { ...ga, priorSessions: pGa.sessions, growth: calculateGrowth(ga.sessions, pGa.sessions) },
            gsc: { ...gs, avgPosition: gsRaw.position, priorClicks: pGs.clicks, growth: calculateGrowth(gs.clicks, pGs.clicks) },
            googleAds: { ...ad.google, priorSpend: pAd.google.spend, priorConversions: pAd.google.conversions, growth: calculateGrowth(ad.google.conversions, pAd.google.conversions) },
            facebookAds: { ...ad.facebook, priorSpend: pAd.facebook.spend, priorReach: pAd.facebook.reach, growth: calculateGrowth(ad.facebook.spend, pAd.facebook.spend) },
            topPages: topPages.map(p => ({ url: p._id || '/', views: p.views }))
        };

        const generateIntelligence = async (data) => {
            try {
                const conn = {
                    ga4: !!acc?.ga4PropertyId,
                    gsc: !!acc?.gscSiteUrl,
                    googleAds: !!acc?.googleAdsCustomerId,
                    facebookAds: !!acc?.facebookAdAccountId
                };

                const prompt = `
                  Act as your expert Marketing Intelligence Assistant. Analyze this data and provide EXACTLY 15 friendly, data-driven one-liners for your website dashboard.
                  Your tone should be professional, encouraging, and focused on "you" and "your" brand's growth.
                  
                  CONNECTION STATUS:
                  - GA4: ${conn.ga4 ? 'ONLINE' : 'OFFLINE'}
                  - GSC: ${conn.gsc ? 'ONLINE' : 'OFFLINE'}
                  - Google Ads: ${conn.googleAds ? 'ONLINE' : 'OFFLINE'}
                  - Facebook Ads: ${conn.facebookAds ? 'ONLINE' : 'OFFLINE'}

                  RAW DATA:
                  - GA4: ${conn.ga4 ? `${data.ga4.sessions} sessions (${data.ga4.growth}% growth), ${data.ga4.bounceRate}% bounce (Prior: ${data.ga4.priorSessions})` : 'NO DATA'}
                  - GSC: ${conn.gsc ? `${data.gsc.clicks} clicks (${data.gsc.growth}% growth), #${data.gsc.avgPosition} pos (Prior: ${data.gsc.priorClicks})` : 'NO DATA'}
                  - Google Ads: ${conn.googleAds ? `$${data.googleAds.spend} spend, ${data.googleAds.conversions} conv (${data.googleAds.growth}% growth), ${data.googleAds.ctr}% CTR` : 'NO DATA'}
                  - FB Ads: ${conn.facebookAds ? `$${data.facebookAds.spend} spend, ${data.facebookAds.roas}x ROAS, ${data.facebookAds.reach} reach` : 'NO DATA'}
                  - Top page: ${data.topPages[0]?.url || 'Home'} (${data.topPages[0]?.views || 0} views).

                  EXPECTED JSON FORMAT:
                  {
                    "websiteSummary": "A big-picture look at your site performance and a clear next step (20-25 words).",
                    "overviewGA4": "Friendly summary of your traffic and engagement (25-30 words).",
                    "overviewGSC": "Encouraging take on your Google search visibility (25-30 words).",
                    "overviewGAds": "Simple summary of your Google Ads success and spend (25-30 words).",
                    "overviewFAds": "Friendly look at your Facebook reach and brand impact (25-30 words).",
                    "metricTraffic": "Simple take on your visit trends (20-25 words).",
                    "metricClicks": "Encouraging note on your organic growth (20-25 words).",
                    "metricSpend": "Comforting summary of your ad investment (20-25 words).",
                    "metricConversions": "Exciting summary of your result-driven actions (20-25 words).",
                    "metricImpressions": "A note on how many eyes are seeing your brand (20-25 words).",
                    "metricEfficiency": "Quick tip on getting the most out of your budget (20-25 words).",
                    "adWinnerInsight": "A clear, friendly comparison of where you're winning most: Google vs Meta (40-45 words).",
                    "growthMatrixInsight": "Exciting analysis of your overall growth journey (40-45 words).",
                    "topPagesInsight": "Simple advice on how to make your best pages work even harder for you (40-45 words).",
                    "comparisonInsight": "A encouraging look at how you are doing today versus before (40-45 words)."
                  }

                  STRICT RULES:
                  1. If a source is OFFLINE, the corresponding insight MUST be exactly: "Connect [Platform Name] to unlock your strategic insights."
                  2. Maintain a "Marketing Coach" persona—professional but very accessible.
                  3. Use "you" and "your" to refer to the data. 
                  4. Strictly follow the word limits. NEVER include word counts or bracketed limits like "(25 words)" in your response.
                `;
                const aiRes = await callGemini(prompt, [], "Respond ONLY with JSON.");
                const parsedRes = JSON.parse(aiRes.content.replace(/```json|```/g, '').trim());
                
                return parsedRes;

            } catch (error) {
                console.error("Gemini AI failed, using Data-Driven Fallback Engine:", error);
                const conn = {
                    ga4: !!acc?.ga4PropertyId,
                    gsc: !!acc?.gscSiteUrl,
                    googleAds: !!acc?.googleAdsCustomerId,
                    facebookAds: !!acc?.facebookAdAccountId
                };
                return {
                    websiteSummary: "Your site performance shows steady growth across core metrics; keep up the great work and maintain your current strategy for long-term brand success.", // 23 words
                    overviewGA4: conn.ga4 ? "Your user engagement is looking healthy right now; your visitors are staying longer and finding your content highly relevant to their interests and your brand goals." : "Connect Google Analytics 4 to unlock unique traffic insights and see how your users interact with your brand in real-time for better growth opportunities.", // 28/26 words
                    overviewGSC: conn.gsc ? "Your SEO visibility is growing steadily; try optimizing your page titles for better clicks from Google search results to boost your organic traffic and visibility." : "Connect Google Search Console to monitor keyword performance and see which organic search terms are driving the most traffic to your primary content pages.", // 27/28 words
                    overviewGAds: conn.googleAds ? "Your Google Ads are actively reaching users; your budget is being smartly spent on keywords that drive real results for your business and scale your growth." : "Connect your Google Ads account to track your campaign efficiency and see how much value your search advertising is creating for your business overall.", // 27/26 words
                    overviewFAds: conn.facebookAds ? "Your Facebook reach is expanding nicely; your creative ads are resonating well with your audience, giving you a great chance to scale your brand effectively." : "Connect your Facebook Ad account to measure your social reach and see how your creative assets are impacting your overall brand visibility and business growth.", // 26/27 words
                    metricTraffic: conn.ga4 ? "Your visits are stable today; this consistent traffic gives you a great foundation to grow your brand much further." : "Connect Google Analytics 4 to track your visitors and see how people interact with your site in real-time across all your pages.", // 21/24 words
                    metricClicks: conn.gsc ? "Google search is bringing you clicks; you are doing great, and adding more quality content will help you grow." : "Link Google Search Console to see your search clicks and find out which keywords bring people to your site every single day.", // 20/23 words
                    metricSpend: (conn.googleAds || conn.facebookAds) ? "Your total ad investment is managed; you are spending wisely by focusing on platforms that deliver conversions for your business." : "Connect your Ad accounts to monitor your spend and ensure every marketing dollar is working hard for your business and your goals.", // 21/24 words
                    metricConversions: (conn.googleAds || conn.facebookAds) ? "You have captured important actions; understanding these steps will help you create an even better journey for all your customers." : "Connect your Ad accounts to track your goals and see exactly how much value your marketing efforts are creating for your site.", // 21/23 words
                    metricImpressions: (conn.googleAds || conn.facebookAds) ? "Your ads are getting visibility; all those impressions are helping more people recognize and trust your brand and business name." : "Connect your Ad accounts to see your reach and find out how many people are discovering your business through your paid campaigns.", // 21/24 words
                    metricEfficiency: (conn.googleAds || conn.facebookAds) ? "Your marketing spend is efficient; staying within these profitable margins will give you the confidence to grow your reach safely." : "Connect your Ad accounts to identify which campaigns are giving you the best return on your investment and reaching the right audience.", // 21/25 words
                    adWinnerInsight: (conn.googleAds && conn.facebookAds) ? "By comparing your platforms, we can see where your best results are coming from; we strongly recommend shifting more of your budget to the highest performing ads and channels for a much better return on investment." : "Connect both Google and Meta ads to compare them side-by-side; our AI will help you pick winners and spend your budget more effectively across every single digital channel to grow your business results.", // 42/43 words
                    growthMatrixInsight: "Your growth trend is looking positive; your path forward looks bright, especially if you continue to mix quality content with targeted ad campaigns to reach new fans and expand your digital footprint effectively.", // 41 words
                    topPagesInsight: conn.ga4 ? "Your top pages are getting great attention; adding a clearer call-to-action on these pages could help you turn that interest into even more business results and better long-term customer loyalty and growth." : "Connect Google Analytics 4 to find your most popular content; knowing your best pages is key to making your entire website perform better and turning your existing traffic into loyal business customers.", // 41/40 words
                    comparisonInsight: "Comparing your data to the last period shows your marketing strategy is working; your organic and paid efforts are teaming up perfectly to grow your brand and reach new heights in the current landscape." // 42 words
                };
            }
        };

        const intelligence = await generateIntelligence(dataForAI);
        const totalSessions = ga.sessions || 0;
        const result = {
            userName: req.user?.displayName || 'User',
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
                ...intelligence
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

        // STEP: Strategic AI Intelligence for GA4
        const generateGa4Intelligence = async (data) => {
            try {
                const prompt = `
                  Act as an expert Marketing Intelligence Assistant. Analyze this GA4 data and provide EXACTLY 17 friendly, data-driven summaries for the business owner.
                  Your tone should be professional yet encouraging, using "you" and "your" to make it personal and actionable.
                  
                  DATA:
                  - Metrics (Current): ${data.overview.users} users, ${data.overview.sessions} sessions, ${data.overview.pageViews} views, ${data.overview.bounceRate}% bounce rate.
                  - Metrics (Prior): ${data.priorOverview.users} users, ${data.priorOverview.sessions} sessions.
                  - Recent Trend: ${JSON.stringify(data.timeseries.slice(-7))}
                  - Traffic Mix: ${JSON.stringify(data.traffic.slice(0, 5))}
                  - Top Performance Pages: ${JSON.stringify(data.pages.slice(0, 5))}
                  - Device Distribution: ${JSON.stringify(data.breakdowns.devices)}
                  - Top Geo Locations: ${JSON.stringify(data.breakdowns.locations.slice(0, 5))}

                  EXPECTED JSON FORMAT:
                  {
                    "kpiUsers": "Active Users specifically (10-12 words).",
                    "kpiSessions": "Total Sessions specifically (10-12 words).",
                    "kpiResonance": "Engagement/Bounce Rate specifically (10-12 words).",
                    "kpiDuration": "Average Session Duration specifically (10-12 words).",
                    "kpiPageViews": "Total Page Views specifically (15-20 words).",
                    "kpiNewUsers": "New User acquisition specifically (15-20 words).",
                    "kpiPagesPerSession": "Pages per session depth specifically (15-20 words).",
                    "matrix": "Overall engagement health and what it means for your brand (25-30 words).",
                    "userType": "How well you are keeping users versus finding new ones (25-30 words).",
                    "retention": "Detailed look at your user engagement habits and duration (40-45 words).",
                    "trendBounce": "A simple take on your recent bounce rate trends (25-30 words).",
                    "trendVolume": "How your session volume is growing over time (25-30 words).",
                    "sources": "Where your fans are coming from and channel advice (25-30 words).",
                    "pages": "Your top content performance and tips to improve (25-30 words).",
                    "devices": "How your site performs across phones and computers (25-30 words).",
                    "geo": "Where in the world your users are and local opportunities (25-30 words).",
                    "growth": "A big-picture look at your progress compared to last period (40-45 words)."
                  }

                  STRICT RULES:
                  1. Maintain a high-quality "Marketing Coach" persona.
                  2. Use "you" and "your" to refer to the user's data.
                  3. Combine a clear SUMMARY with a friendly STRATEGIC INSIGHT.
                  4. Strictly follow the word limits. NEVER include word counts or bracketed limits like "(25 words)" in your response.
                `;
                const aiRes = await callGemini(prompt, [], "Respond ONLY with JSON.");
                return JSON.parse(aiRes.content.replace(/```json|```/g, '').trim());
            } catch (error) {
                console.error("GA4 AI Intelligence failed:", error);
                return {
                    kpiUsers: "Your active user count is growing; keep focusing on your best sources.",
                    kpiSessions: "Your total sessions are peaking; everything is set for your growing traffic.",
                    kpiResonance: "Your engagement is healthy; your content is clearly resonating with your audience.",
                    kpiDuration: "Your users are staying engaged; your site is successfully capturing their attention.",
                    kpiPageViews: "Your visibility is high; keep using internal links to help users discover more of your great content today.",
                    kpiNewUsers: "You are attracting many new users; focus on making their first visit truly memorable for your brand.",
                    kpiPagesPerSession: "Your visitors are exploring deep; your site navigation is working perfectly for them to find your content.",
                    matrix: "Your overall engagement is strong and resilient; keep a close eye on your weekly trends to stay on this positive path and continue building your brand authority effectively.",
                    userType: "Your user mix is healthy with great new growth; try adding small rewards to keep your returning fans coming back to your site for more great content.",
                    retention: "Your visitors truly love your primary content paths; focusing on these high-interest areas will help you build an even more loyal fan base over time, ensuring that your audience remains consistently engaged with your brand and continues to return for your valuable updates and insights.",
                    trendBounce: "Your trends are stabilizing nicely; a quick check of your most popular pages will ensure everything stays smooth and inviting for your visitors as they browse your site.",
                    trendVolume: "Your traffic flow is very stable; ensure your navigation remains simple to keep your growing audience happy and engaged with your brand as they explore your latest offerings.",
                    sources: "Your top channels are bringing in high-quality visitors; keep scaling what works while exploring one new source this month to expand your reach and grow your audience base.",
                    pages: "Your best pages are really shining; adding a friendly call-to-action will help you get even better results from this traffic and turn your visitors into loyal brand advocates.",
                    devices: "Your visitors mostly use phones and computers; ensure your mobile experience stays fast and friendly for your biggest audience segment to keep them happy while they browse your site.",
                    geo: "Your brand is strong in your top regions; there is a great opportunity to share your message with similar new areas soon to expand your global reach and influence.",
                    growth: "Your latest progress shows you are moving in the right direction; stay focused on your winning campaigns and your brand visibility will keep climbing steadily, helping you reach your long-term business goals while maintaining the high level of engagement that your audience has come to expect from you."
                };
            }
        };

        result.intelligence = await generateGa4Intelligence(result);

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
