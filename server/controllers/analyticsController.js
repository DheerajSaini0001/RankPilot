import Ga4Metric from '../models/Ga4Metric.js';
import GscMetric from '../models/GscMetric.js';
import GoogleAdsMetric from '../models/GoogleAdsMetric.js';
import FacebookAdsMetric from '../models/FacebookAdsMetric.js';
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

export const buildMatchFilter = async (userId, query) => {
    const { startDate, endDate, device, siteId } = query;

    const filter = {
        'metadata.userId': userId,
        date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    if (siteId) {
        filter['metadata.siteId'] = typeof siteId === 'string' ? new mongoose.Types.ObjectId(siteId) : siteId;
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
            buildMatchFilter(userId, req.query),
            buildMatchFilter(userId, { ...req.query, startDate: prevStart.toISOString().split('T')[0], endDate: prevEnd.toISOString().split('T')[0] })
        ]);

        const [ga4Data, gscData, gAdsData, fAdsData, ga4Ts, gscTs, adsTs, pGa4Data, pGscData, pGAdsData, pFAdsData, topPages] = await Promise.all([
            // Current Period Aggregates (0-3)
            Ga4Metric.aggregate([{ $match: filters[0] }, { $group: { _id: null, users: { $sum: "$metrics.users" }, sessions: { $sum: "$metrics.sessions" }, pageViews: { $sum: "$metrics.pageViews" }, bounceRate: { $avg: "$metrics.bounceRate" }, avgSessionDuration: { $avg: "$metrics.avgSessionDuration" } } }]),
            GscMetric.aggregate([{ $match: filters[0] }, { $group: { _id: null, clicks: { $sum: "$metrics.clicks" }, impressions: { $sum: "$metrics.impressions" }, position: { $avg: "$metrics.position" } } }]),
            GoogleAdsMetric.aggregate([{ $match: filters[0] }, { $group: { _id: null, spend: { $sum: "$metrics.spend" }, conversions: { $sum: "$metrics.conversions" }, impressions: { $sum: "$metrics.impressions" }, clicks: { $sum: "$metrics.clicks" }, reach: { $sum: "$metrics.reach" }, purchaseValue: { $sum: "$metrics.purchase_value" } } }]),
            FacebookAdsMetric.aggregate([{ $match: filters[0] }, { $group: { _id: null, spend: { $sum: "$metrics.spend" }, conversions: { $sum: "$metrics.conversions" }, impressions: { $sum: "$metrics.impressions" }, clicks: { $sum: "$metrics.clicks" }, reach: { $sum: "$metrics.reach" }, purchaseValue: { $sum: "$metrics.purchase_value" } } }]),
            // Timeseries
            Ga4Metric.aggregate([{ $match: filters[0] }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, sessions: { $sum: "$metrics.sessions" } } }, { $sort: { _id: 1 } }]),
            GscMetric.aggregate([{ $match: filters[0] }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, clicks: { $sum: "$metrics.clicks" }, impressions: { $sum: "$metrics.impressions" } } }, { $sort: { _id: 1 } }]),
            // Combined Ads Spend for Timeseries
            Promise.all([
                GoogleAdsMetric.aggregate([{ $match: filters[0] }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, spend: { $sum: "$metrics.spend" }, conversions: { $sum: "$metrics.conversions" } } }]),
                FacebookAdsMetric.aggregate([{ $match: filters[0] }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, spend: { $sum: "$metrics.spend" }, conversions: { $sum: "$metrics.conversions" } } }])
            ]).then(([g, f]) => {
                const combined = [...g, ...f];
                const map = {};
                combined.forEach(d => {
                    if (!map[d._id]) map[d._id] = { _id: d._id, spend: 0, conversions: 0 };
                    map[d._id].spend += d.spend;
                    map[d._id].conversions += d.conversions;
                });
                return Object.values(map).sort((a,b) => a._id.localeCompare(b._id));
            }),
            // Prior Period for Growth
            Ga4Metric.aggregate([{ $match: filters[1] }, { $group: { _id: null, sessions: { $sum: "$metrics.sessions" }, users: { $sum: "$metrics.users" } } }]),
            GscMetric.aggregate([{ $match: filters[1] }, { $group: { _id: null, clicks: { $sum: "$metrics.clicks" }, impressions: { $sum: "$metrics.impressions" } } }]),
            GoogleAdsMetric.aggregate([{ $match: filters[1] }, { $group: { _id: null, spend: { $sum: "$metrics.spend" }, conversions: { $sum: "$metrics.conversions" } } }]),
            FacebookAdsMetric.aggregate([{ $match: filters[1] }, { $group: { _id: null, spend: { $sum: "$metrics.spend" }, reach: { $sum: "$metrics.reach" } } }]),
            // Content
            Ga4Metric.aggregate([{ $match: filters[0] }, { $group: { _id: "$metadata.dimensions.pagePath", views: { $sum: "$metrics.pageViews" }, users: { $sum: "$metrics.users" }, bounceRate: { $avg: "$metrics.bounceRate" } } }, { $sort: { views: -1 } }, { $limit: 10 }])
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
            ga4: { 
                ...ga, 
                priorSessions: pGa.sessions, 
                growthSessions: calculateGrowth(ga.sessions, pGa.sessions),
                growthUsers: calculateGrowth(ga.users, pGa.users)
            },
            gsc: { 
                ...gs, 
                avgPosition: gs.position,
                priorClicks: pGs.clicks, 
                growthClicks: calculateGrowth(gs.clicks, pGs.clicks),
                growthImpressions: calculateGrowth(gs.impressions, pGs.impressions)
            },
            googleAds: { 
                ...ad.google, 
                priorSpend: pAd.google.spend, 
                priorConversions: pAd.google.conversions, 
                growthConversions: calculateGrowth(ad.google.conversions, pAd.google.conversions),
                growthSpend: calculateGrowth(ad.google.spend, pAd.google.spend)
            },
            facebookAds: { 
                ...ad.facebook, 
                priorSpend: pAd.facebook.spend, 
                priorReach: pAd.facebook.reach, 
                growthReach: calculateGrowth(ad.facebook.reach, pAd.facebook.reach),
                growthSpend: calculateGrowth(ad.facebook.spend, pAd.facebook.spend)
            },
            topPages: topPages.map(p => ({ url: p._id || '/', views: p.views, users: p.users }))
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
                  - GA4: ${conn.ga4 ? `${data.ga4.sessions} sessions (${data.ga4.growthSessions}% growth), ${data.ga4.users} users, ${data.ga4.bounceRate}% bounce (Prior: ${data.ga4.priorSessions} sessions)` : 'NO DATA'}
                  - GSC: ${conn.gsc ? `${data.gsc.clicks} clicks (${data.gsc.growthClicks}% growth), ${data.gsc.impressions} impressions, #${data.gsc.avgPosition?.toFixed(1)} pos (Prior: ${data.gsc.priorClicks} clicks)` : 'NO DATA'}
                  - Google Ads: ${conn.googleAds ? `$${data.googleAds.spend} spend (${data.googleAds.growthSpend}% growth), ${data.googleAds.conversions} conv (${data.googleAds.growthConversions}% growth), ${(data.googleAds.ctr * 100).toFixed(2)}% CTR` : 'NO DATA'}
                  - FB Ads: ${conn.facebookAds ? `$${data.facebookAds.spend} spend (${data.facebookAds.growthSpend}% growth), ${data.facebookAds.roas}x ROAS, ${data.facebookAds.reach} reach (${data.facebookAds.growthReach}% growth)` : 'NO DATA'}
                  - Top page: ${data.topPages[0]?.url || 'Home'} (${data.topPages[0]?.views || 0} views, ${data.topPages[0]?.users || 0} visitors).

                  EXPECTED JSON FORMAT:
                  {
                    "websiteSummary": "A big-picture look at your site performance for ${data.siteName}. Mention ${data.ga4.sessions} sessions and ${data.gsc.clicks} clicks. (20-25 words).",
                    "overviewGA4": "Friendly summary of your traffic (${data.ga4.sessions} sessions) and ${data.ga4.growthSessions}% growth. (25-30 words).",
                    "overviewGSC": "Encouraging take on your Google search visibility with ${data.gsc.clicks} clicks and #${data.gsc.avgPosition} avg position. (25-30 words).",
                    "overviewGAds": "Simple summary of your Google Ads success: $${data.googleAds.spend} spend for ${data.googleAds.conversions} conversions. (25-30 words).",
                    "overviewFAds": "Friendly look at your Facebook impact: $${data.facebookAds.spend} spend reaching ${data.facebookAds.reach} people with ${data.facebookAds.roas}x ROAS. (25-30 words).",
                    "metricTraffic": "Simple take on your visit trends (${data.ga4.sessions} sessions). (20-25 words).",
                    "metricClicks": "Encouraging note on your organic growth (${data.gsc.clicks} clicks). (20-25 words).",
                    "metricSpend": "Comforting summary of your $${(data.googleAds.spend + data.facebookAds.spend).toFixed(2)} total ad investment. (20-25 words).",
                    "metricConversions": "Exciting summary of your ${data.googleAds.conversions + data.facebookAds.conversions} total conversions. (20-25 words).",
                    "metricImpressions": "A note on how many eyes (${data.googleAds.impressions + data.facebookAds.reach} impressions/reach) are seeing your brand. (20-25 words).",
                    "metricEfficiency": "Quick tip on getting the most out of your budget based on your ${(data.googleAds.ctr * 100).toFixed(2)}% Google CTR and ${data.facebookAds.roas}x Meta ROAS. (20-25 words).",
                    "adWinnerInsight": "A clear, friendly comparison of where you're winning most based on your Ad Platform Comparison table: Google ($${data.googleAds.spend} spend, ${data.googleAds.clicks} clicks, ${data.googleAds.conversions} conversions, $${data.googleAds.cpc.toFixed(2)} CPC, ${(data.googleAds.ctr * 100).toFixed(2)}% CTR) vs Meta ($${data.facebookAds.spend} spend, ${data.facebookAds.clicks} clicks, ${data.facebookAds.conversions} conversions, $${data.facebookAds.cpc.toFixed(2)} CPC, ${(data.facebookAds.ctr * 100).toFixed(2)}% CTR). (40-45 words).",
                    "growthMatrixInsight": "Exciting analysis of your multi-channel growth journey. Analyze these trends: ${data.ga4.growthSessions}% sessions growth (GA4), ${data.gsc.growthClicks}% clicks growth (GSC), ${data.googleAds.growthConversions}% conversion growth (GAds), and ${data.facebookAds.growthReach}% reach growth (Meta). (40-45 words).",
                    "topPagesInsight": "Simple advice on how to make your best page (${data.topPages[0]?.url || 'Home'} with ${data.topPages[0]?.views || 0} views and ${data.topPages[0]?.users || 0} unique visitors) work even harder. (40-45 words).",
                    "comparisonInsight": "An encouraging look at your performance journey. Compare this period vs prior: Sessions (${data.ga4.sessions} vs ${data.ga4.priorSessions}), GSC Clicks (${data.gsc.clicks} vs ${data.gsc.priorClicks}), and Total Ad Spend ($${(data.googleAds.spend + data.facebookAds.spend).toFixed(2)} vs $${(data.googleAds.priorSpend + data.facebookAds.priorSpend).toFixed(2)}). (40-45 words).",
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
                    websiteSummary: `Your site performance for ${data.siteName} is looking stable with ${data.ga4.sessions} total sessions and ${data.gsc.clicks} organic clicks captured during this current analysis period.`,
                    overviewGA4: conn.ga4 ? `Your traffic is holding steady at ${data.ga4.sessions} sessions with a ${data.ga4.growthSessions}% growth rate, showing that your audience engagement strategy is consistently reaching new people.` : "Connect Google Analytics 4 to unlock unique traffic insights and see how your users interact with your brand in real-time for better growth opportunities.",
                    overviewGSC: conn.gsc ? `Your search visibility is active with ${data.gsc.clicks} clicks and an average position of #${data.gsc.avgPosition?.toFixed(1)}, indicating your content is ranking well for your target keywords.` : "Connect Google Search Console to monitor keyword performance and see which organic search terms are driving the most traffic to your primary content pages.",
                    overviewGAds: conn.googleAds ? `Your Google Ads are performing with $${data.googleAds.spend} spend and ${data.googleAds.conversions} conversions, proving that your search campaigns are successfully driving valuable actions for your business.` : "Connect your Google Ads account to track your campaign efficiency and see how much value your search advertising is creating for your business overall.",
                    overviewFAds: conn.facebookAds ? `Your Meta impact is clear with $${data.facebookAds.spend} spend reaching ${data.facebookAds.reach} people at a ${data.facebookAds.roas}x ROAS, showing strong resonance with your social audience.` : "Connect your Meta Ad account to measure your social reach and see how your creative assets are impacting your overall brand visibility and business growth.",
                    metricTraffic: conn.ga4 ? `You've welcomed ${data.ga4.sessions} visitors this period; this consistent flow of traffic provides a solid foundation for your brand's digital growth and expansion.` : "Connect Google Analytics 4 to track your visitors and see how people interact with your site in real-time across all your pages.",
                    metricClicks: conn.gsc ? `Your content earned ${data.gsc.clicks} clicks from Google; this organic interest shows that your SEO efforts are successfully capturing the attention of your target audience.` : "Link Google Search Console to see your search clicks and find out which keywords bring people to your site every single day.",
                    metricSpend: (conn.googleAds || conn.facebookAds) ? `Your total ad investment of $${(data.googleAds.spend + data.facebookAds.spend).toFixed(2)} is being managed across platforms to ensure you're reaching customers where they are most active.` : "Connect your Ad accounts to monitor your spend and ensure every marketing dollar is working hard for your business and your goals.",
                    metricConversions: (conn.googleAds || conn.facebookAds) ? `You have successfully captured ${data.googleAds.conversions + data.facebookAds.conversions} total conversions, showing that your marketing funnel is effectively turning visitors into valuable leads.` : "Connect your Ad accounts to track your goals and see exactly how much value your marketing efforts are creating for your site.",
                    metricImpressions: (conn.googleAds || conn.facebookAds) ? `Your brand has earned ${data.googleAds.impressions + data.facebookAds.reach} total impressions and reach, significantly boosting your visibility and name recognition in the digital marketplace.` : "Connect your Ad accounts to see your reach and find out how many people are discovering your business through your paid campaigns.",
                    metricEfficiency: (conn.googleAds || conn.facebookAds) ? `Your campaigns are operating with a ${(data.googleAds.ctr * 100).toFixed(2)}% Google CTR and ${data.facebookAds.roas}x Meta ROAS, showing a healthy level of efficiency in your current paid strategy.` : "Connect your Ad accounts to identify which campaigns are giving you the best return on your investment and reaching the right audience.",
                    adWinnerInsight: (conn.googleAds && conn.facebookAds) ? `By comparing your performance across platforms, we see that Google Ads ($${data.googleAds.spend}) and Meta Ads ($${data.facebookAds.spend}) are both contributing to your overall growth. To maximize results, we recommend focusing your future budget on the specific channel currently delivering the lowest cost-per-action for your brand.` : "Connect both Google and Meta ads to compare them side-by-side; our AI will help you pick winners and spend your budget more effectively across every single digital channel.",
                    growthMatrixInsight: `Your current multi-channel growth journey shows ${data.ga4.growthSessions}% session growth and ${data.gsc.growthClicks}% click growth this period. This positive upward trend suggests that your combined organic and paid strategies are working effectively together to expand your digital footprint and reach new potential customers across the web.`,
                    topPagesInsight: conn.ga4 ? `Your top performing page (${data.topPages[0]?.url || 'Home'}) is attracting significant attention with ${data.topPages[0]?.views || 0} views this period. We suggest refining its conversion path and adding a clearer call-to-action to help you turn this high-intent traffic into even more measurable results and long-term brand loyalty.` : "Connect Google Analytics 4 to find your most popular content; knowing your best pages is key to making your entire website perform better.",
                    comparisonInsight: `Comparing today's ${data.ga4.sessions} sessions to the prior period's ${data.ga4.priorSessions} sessions confirms that your marketing efforts are moving in the right direction. This steady increase in traffic across channels proves that your current strategy is resonating with your audience and building a solid foundation for your brand's long-term digital success.`
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
            const acc = await UserAccounts.findOne({ _id: siteId, userId }).select('siteName lastDailySyncAt syncStatus isHistoricalSyncComplete');
            if (acc) {
                syncMetadata = {
                    siteName: acc.siteName,
                    lastDailySyncAt: acc.lastDailySyncAt,
                    syncStatus: acc.syncStatus,
                    isHistoricalSyncComplete: acc.isHistoricalSyncComplete
                };
            }
        }
        const filter = await buildMatchFilter(userId, req.query);

        // Calculate previous period
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diff = end - start;
        const prevEnd = new Date(start.getTime() - (24 * 60 * 60 * 1000));
        const prevStart = new Date(prevEnd.getTime() - diff);
        const prevStartDate = prevStart.toISOString().split('T')[0];
        const prevEndDate = prevEnd.toISOString().split('T')[0];

        const prevFilter = await buildMatchFilter(userId, { ...req.query, startDate: prevStartDate, endDate: prevEndDate });

        const [overview, priorOverview, timeseries, traffic, pages, ga4BreakdownsDevices, ga4BreakdownsLocations] = await Promise.all([
            Ga4Metric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        users: { $sum: "$metrics.users" },
                        newUsers: { $sum: "$metrics.newUsers" },
                        sessions: { $sum: "$metrics.sessions" },
                        bounceRate: { $avg: "$metrics.bounceRate" },
                        avgSessionDuration: { $avg: "$metrics.avgSessionDuration" },
                        pageViews: { $sum: "$metrics.pageViews" }
                    }
                }
            ]),
            Ga4Metric.aggregate([
                { $match: prevFilter },
                {
                    $group: {
                        _id: null,
                        users: { $sum: "$metrics.users" },
                        newUsers: { $sum: "$metrics.newUsers" },
                        sessions: { $sum: "$metrics.sessions" },
                        bounceRate: { $avg: "$metrics.bounceRate" },
                        avgSessionDuration: { $avg: "$metrics.avgSessionDuration" },
                        pageViews: { $sum: "$metrics.pageViews" }
                    }
                }
            ]),
            Ga4Metric.aggregate([
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
            Ga4Metric.aggregate([
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
            Ga4Metric.aggregate([
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
            Ga4Metric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: "$metadata.dimensions.device",
                        value: { $sum: "$metrics.sessions" }
                    }
                },
                { $sort: { value: -1 } }
            ]),
            Ga4Metric.aggregate([
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
            overview: overview[0] || { users: 0, newUsers: 0, sessions: 0, bounceRate: 0, avgSessionDuration: 0, pageViews: 0 },
            priorOverview: priorOverview[0] || { users: 0, newUsers: 0, sessions: 0, bounceRate: 0, avgSessionDuration: 0, pageViews: 0 },
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
        const siteName = syncMetadata?.siteName || "your website";
        
        const generateGa4Intelligence = async (data) => {
            try {
                const prompt = `
                  Act as an expert Marketing Intelligence Assistant for the website "${siteName}". 
                  Analyze this GA4 data and provide EXACTLY 17 friendly, data-driven summaries for the business owner.
                  Your tone should be professional yet encouraging, using "you" and "your" to make it personal and actionable for ${siteName}.
                  
                  EXPECTED JSON FORMAT:
                  {
                    "kpiUsers": "Active Users Card (10-12 words). Analyze ${data.overview.users} current vs ${data.priorOverview.users} prior users. Summarize the growth or dip.",
                    "kpiSessions": "Total Sessions Card (10-12 words). Analyze ${data.overview.sessions} current vs ${data.priorOverview.sessions} prior sessions. Comment on traffic volume.",
                    "kpiResonance": "Engagement Rate Card (10-12 words). Current Engagement Rate is ${(100 - data.overview.bounceRate).toFixed(1)}%. Explain what this means for interaction quality.",
                    "kpiDuration": "Avg. Duration Card (10-12 words). Analyze ${data.overview.avgSessionDuration} seconds average stay. Comment on attention capture.",
                    "kpiPageViews": "Page Views Strip (15-20 words). Total views are ${data.overview.pageViews}. Discuss the scale of content discovery.",
                    "kpiNewUsers": "New Users Strip (15-20 words). Based on ${data.overview.newUsers} new users out of ${data.overview.users} total, comment on reach.",
                    "kpiPagesPerSession": "Content Depth Strip (15-20 words). Average ${(data.overview.pageViews / (data.overview.sessions || 1)).toFixed(2)} pages per session. Comment on how deep users explore your site.",
                    "matrix": "Sessions Trend Summary (25-30 words). Analyze this 7-day trend: ${JSON.stringify(data.timeseries.slice(-7).map(d => ({date: d.date, sessions: d.sessions})))}.",
                    "userType": "Loyalty Summary (25-30 words). Analyze the audience split: ${data.overview.newUsers} New vs ${data.overview.users - data.overview.newUsers} Returning users. Evaluate brand loyalty.",
                    "retention": "Engagement Deep Dive (40-45 words). Analyze: ${(100 - data.overview.bounceRate).toFixed(1)}% engagement rate, ${data.overview.avgSessionDuration}s duration, and trend: ${JSON.stringify(data.timeseries.slice(-7).map(d => ({date: d.date, bounce: d.bounceRate})))}.",
                    "trendBounce": "Bounce Trend (25-30 words). Interpret daily bounce changes from this trend: ${JSON.stringify(data.timeseries.slice(-7).map(d => ({date: d.date, bounce: d.bounceRate})))}.",
                    "trendVolume": "Traffic Patterns (25-30 words). Analyze daily fluctuations from this trend: ${JSON.stringify(data.timeseries.slice(-7).map(d => ({date: d.date, views: d.pageViews})))}.",
                    "sources": "Traffic Channels (25-30 words). Analyze these top sources: ${JSON.stringify(data.traffic.slice(0, 3))}. Identify winners.",
                    "pages": "Content Performance (25-30 words). Analyze these top pages: ${JSON.stringify(data.pages.slice(0, 3))}. Suggest optimizations.",
                    "devices": "Device Experience (25-30 words). Analyze this split: ${data.breakdowns.devices.map(d => `${d.name}: ${d.value} sessions`).join(', ')}. Compare mobile vs desktop behavior.",
                    "geo": "Geo Opportunities (25-30 words). Top locations: ${data.breakdowns.locations.slice(0, 3).map(l => `${l.name}: ${l.value} sessions`).join(', ')}. Suggest local growth tips.",
                    "growth": "Master Growth Report (40-45 words). Comprehensive comparison of current vs prior: Users (${data.overview.users} vs ${data.priorOverview.users}), New Users (${data.overview.newUsers} vs ${data.priorOverview.newUsers}), Sessions (${data.overview.sessions} vs ${data.priorOverview.sessions}), Views (${data.overview.pageViews} vs ${data.priorOverview.pageViews}), Bounce (${data.overview.bounceRate}% vs ${data.priorOverview.bounceRate}%), Duration (${data.overview.avgSessionDuration}s vs ${data.priorOverview.avgSessionDuration}s). Summarize overall growth trajectory."
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
                const userDiff = data.overview.users - data.priorOverview.users;
                const sessDiff = data.overview.sessions - data.priorOverview.sessions;
                const bounceDiff = data.overview.bounceRate - data.priorOverview.bounceRate;

                return {
                    kpiUsers: userDiff >= 0 
                        ? `Great news! Active users grew to ${data.overview.users}. Your acquisition strategy is performing well.`
                        : `Active users are at ${data.overview.users}. Consider a quick campaign to boost your reach.`,
                    kpiSessions: sessDiff >= 0
                        ? `Traffic is up with ${data.overview.sessions} sessions. Your site visibility is climbing steadily.`
                        : `Sessions are at ${data.overview.sessions}. Focus on driving more consistent daily visitor traffic.`,
                    kpiResonance: bounceDiff <= 0
                        ? `Engagement improved! Your rate climbed to ${(100 - data.overview.bounceRate).toFixed(1)}%. Content is resonating well.`
                        : `Engagement rate is ${(100 - data.overview.bounceRate).toFixed(1)}%. Optimize top landing pages for better interaction.`,
                    kpiDuration: `Visitors stay for ${(data.overview.avgSessionDuration).toFixed(0)}s on average. Your site successfully captures their interest.`,
                    kpiPageViews: `Total views reached ${data.overview.pageViews}. Use more internal links to help your users discover even more great content today.`,
                    kpiNewUsers: `You've welcomed ${data.overview.newUsers} new users. Focus on turning these first-time visitors into loyal brand fans for long-term growth.`,
                    kpiPagesPerSession: `Users explore ${(data.overview.pageViews / (data.overview.sessions || 1)).toFixed(2)} pages per visit. Your clear site navigation is successfully aiding deeper content discovery.`,
                    matrix: `Your ${data.timeseries.length}-day session trends show ${sessDiff >= 0 ? 'growth' : 'stability'}. Continue monitoring your daily traffic peaks closely to optimize your posting schedule and capture the maximum amount of visitor interest effectively.`,
                    userType: `Your audience is a healthy mix of ${data.overview.newUsers} New vs ${data.overview.users - data.overview.newUsers} Returning users. This solid blend of fresh discovery and brand loyalty is excellent for your long-term growth.`,
                    retention: `Engagement metrics including your ${(100 - data.overview.bounceRate).toFixed(1)}% engagement rate remain ${bounceDiff <= 0 ? 'strong' : 'consistent'}. To maintain this interest, focus on refining your user experience and ensuring your most popular landing pages are perfectly optimized to guide visitors toward your goals consistently.`,
                    trendBounce: `Daily bounce trends are ${bounceDiff <= 0 ? 'improving steadily' : 'stabilizing'}. Keep a close watch for any unexpected spikes on your high-traffic pages and ensure that your technical performance remains fast and inviting for all users.`,
                    trendVolume: `Traffic patterns for your ${data.overview.pageViews} views are ${sessDiff >= 0 ? 'climbing consistently' : 'steady'}. Keep your top-performing content fresh and updated to ensure that your growing audience finds significant value every time they return to your site.`,
                    sources: `${data.traffic[0]?.source || data.traffic[0]?.channel || 'Direct'} is currently your #1 traffic source. Doubling down on your top-performing channels while testing one new acquisition strategy this month will yield the best long-term growth results for you.`,
                    pages: `Your top page "${data.pages[0]?.path || '/'}" is performing ${userDiff >= 0 ? 'exceptionally well' : 'consistently'} right now. Consider adding a clear, friendly call-to-action here to convert this high volume of traffic into loyal brand subscribers.`,
                    devices: `${data.breakdowns.devices[0]?.name || 'Mobile'} users are currently your biggest audience segment. Ensure your site experience is perfectly optimized for smaller screens with fast loading times and intuitive navigation to keep these visitors highly engaged.`,
                    geo: `Your brand is currently strongest in ${data.breakdowns.locations[0]?.name || 'your top region'}. Expanding your marketing reach to similar geographical areas could unlock significant new growth opportunities and help you build a truly global audience.`,
                    growth: `The overall trajectory for your ${data.overview.users} users is ${userDiff >= 0 ? 'positive' : 'stable'} and shows great potential. Keep scaling your winning campaigns and top content paths to ensure future success, as your current foundation is strong enough to support higher levels of global brand visibility.`
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
        const filter = await buildMatchFilter(userId, req.query);

        // Previous period
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diff = end - start;
        const prevEnd = new Date(start.getTime() - (24 * 60 * 60 * 1000));
        const prevStart = new Date(prevEnd.getTime() - diff);
        const prevFilter = await buildMatchFilter(userId, { ...req.query, startDate: prevStart.toISOString().split('T')[0], endDate: prevEnd.toISOString().split('T')[0] });

        const [overview, priorOverview, timeseries, queries, pages] = await Promise.all([
            GscMetric.aggregate([
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
            GscMetric.aggregate([
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
            GscMetric.aggregate([
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
            GscMetric.aggregate([
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
            GscMetric.aggregate([
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

        const filter = await buildMatchFilter(userId, req.query);
        const prevFilter = await buildMatchFilter(userId, { ...req.query, startDate: prevStartDate, endDate: prevEndDate });

        const [overview, priorOverview, timeseries, campaigns, keywords, deviceBreakdown] = await Promise.all([
            GoogleAdsMetric.aggregate([
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
            GoogleAdsMetric.aggregate([
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
            GoogleAdsMetric.aggregate([
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
            GoogleAdsMetric.aggregate([
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
            GoogleAdsMetric.aggregate([
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
            GoogleAdsMetric.aggregate([
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

        const filter = await buildMatchFilter(userId, req.query);
        const prevFilter = await buildMatchFilter(userId, { ...req.query, startDate: prevStartDate, endDate: prevEndDate });

        const [overview, priorOverview, timeseries, campaigns, adsets, deviceBreakdown] = await Promise.all([
            FacebookAdsMetric.aggregate([
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
            FacebookAdsMetric.aggregate([
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
            FacebookAdsMetric.aggregate([
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
            FacebookAdsMetric.aggregate([
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
            FacebookAdsMetric.aggregate([
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
            FacebookAdsMetric.aggregate([
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
