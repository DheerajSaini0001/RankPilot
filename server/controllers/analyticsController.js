import DailyMetric from '../models/DailyMetric.js';
import UserAccounts from '../models/UserAccounts.js';
import { syncGsc, syncGa4, syncGoogleAds, syncFacebookAds } from '../services/syncService.js';

export const buildMatchFilter = async (userId, source, query) => {
    const { startDate, endDate, device, campaign, channel, siteId } = query;
    
    // Crucial: Use metadata prefix for Timeseries partitioning/filtering
    const filter = { 
        'metadata.userId': userId, 
        date: { $gte: new Date(startDate), $lte: new Date(endDate) } 
    };
    
    if (siteId) {
        const acc = await UserAccounts.findOne({ _id: siteId, userId });
        if (acc) {
            if (source === 'ga4') filter['metadata.platformAccountId'] = acc.ga4PropertyId;
            else if (source === 'gsc') filter['metadata.platformAccountId'] = acc.gscSiteUrl;
            else if (source === 'google-ads') filter['metadata.platformAccountId'] = acc.googleAdsCustomerId;
            else if (source === 'facebook-ads') filter['metadata.platformAccountId'] = acc.facebookAdAccountId;
            else if (Array.isArray(source)) {
                filter.$or = [
                    { 'metadata.source': 'google-ads', 'metadata.platformAccountId': acc.googleAdsCustomerId },
                    { 'metadata.source': 'facebook-ads', 'metadata.platformAccountId': acc.facebookAdAccountId }
                ];
            }
        }
    }

    if (source && !filter.$or) {
        if (Array.isArray(source)) {
            filter['metadata.source'] = { $in: source };
        } else {
            filter['metadata.source'] = source;
        }
    }

    if (device) filter["metadata.dimensions.device"] = device;
    if (campaign) filter["metadata.dimensions.campaign"] = campaign;
    if (channel) filter["metadata.dimensions.channel"] = channel;
    
    return filter;
};


export const getDashboardSummary = async (req, res) => {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;

    try {
        // Calculate previous period for growth comparison
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diff = end - start;
        const prevEnd = new Date(start.getTime() - (24 * 60 * 60 * 1000));
        const prevStart = new Date(prevEnd.getTime() - diff);
        const prevStartDate = prevStart.toISOString().split('T')[0];
        const prevEndDate = prevEnd.toISOString().split('T')[0];

        // Fetch everything in parallel
        const [ga4Filter, gscFilter, adsFilter, tsGa4Filter, tsGscFilter, tsAdsFilter, prevGa4Filter, prevGscFilter, prevAdsFilter, topPagesFilter] = await Promise.all([
            buildMatchFilter(userId, 'ga4', req.query),
            buildMatchFilter(userId, 'gsc', req.query),
            buildMatchFilter(userId, ['google-ads', 'facebook-ads'], req.query),
            buildMatchFilter(userId, 'ga4', req.query),
            buildMatchFilter(userId, 'gsc', req.query),
            buildMatchFilter(userId, ['google-ads', 'facebook-ads'], req.query),
            buildMatchFilter(userId, 'ga4', { ...req.query, startDate: prevStartDate, endDate: prevEndDate }),
            buildMatchFilter(userId, 'gsc', { ...req.query, startDate: prevStartDate, endDate: prevEndDate }),
            buildMatchFilter(userId, ['google-ads', 'facebook-ads'], { ...req.query, startDate: prevStartDate, endDate: prevEndDate }),
            buildMatchFilter(userId, 'ga4', req.query)
        ]);

        const [ga4Data, gscData, adsData, ga4Ts, gscTs, adsTs, prevGa4Data, prevGscData, prevAdsData, topPages] = await Promise.all([
            // Current Period
            DailyMetric.aggregate([ { $match: ga4Filter }, { $group: { _id: null, users: { $sum: "$metrics.users" }, sessions: { $sum: "$metrics.sessions" }, pageViews: { $sum: "$metrics.pageViews" }, bounceRate: { $avg: "$metrics.bounceRate" }, avgSessionDuration: { $avg: "$metrics.avgSessionDuration" } }} ]),
            DailyMetric.aggregate([ { $match: gscFilter }, { $group: { _id: null, clicks: { $sum: "$metrics.clicks" }, impressions: { $sum: "$metrics.impressions" }, position: { $avg: "$metrics.position" } }} ]),
            DailyMetric.aggregate([ { $match: adsFilter }, { $group: { _id: "$metadata.source", spend: { $sum: "$metrics.spend" }, impressions: { $sum: "$metrics.impressions" }, clicks: { $sum: "$metrics.clicks" }, conversions: { $sum: "$metrics.conversions" }, reach: { $sum: "$metrics.reach" }, purchaseValue: { $sum: "$metrics.purchase_value" } }} ]),
            
            // Timeseries (Format Date to string for frontend compatibility)
            DailyMetric.aggregate([ { $match: tsGa4Filter }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, sessions: { $sum: "$metrics.sessions" } }}, { $sort: { _id: 1 } } ]),
            DailyMetric.aggregate([ { $match: tsGscFilter }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, clicks: { $sum: "$metrics.clicks" }, impressions: { $sum: "$metrics.impressions" } }}, { $sort: { _id: 1 } } ]),
            DailyMetric.aggregate([ { $match: tsAdsFilter }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, spend: { $sum: "$metrics.spend" }, conversions: { $sum: "$metrics.conversions" } }}, { $sort: { _id: 1 } } ]),
            
            // Previous Period (for growth)
            DailyMetric.aggregate([ { $match: prevGa4Filter }, { $group: { _id: null, sessions: { $sum: "$metrics.sessions" } }} ]),
            DailyMetric.aggregate([ { $match: prevGscFilter }, { $group: { _id: null, clicks: { $sum: "$metrics.clicks" } }} ]),
            DailyMetric.aggregate([ { $match: prevAdsFilter }, { $group: { _id: "$metadata.source", spend: { $sum: "$metrics.spend" }, conversions: { $sum: "$metrics.conversions" } }} ]),

            // Top Pages
            DailyMetric.aggregate([
                { $match: topPagesFilter },
                { $group: {
                    _id: "$metadata.dimensions.pagePath",
                    views: { $sum: "$metrics.pageViews" },
                    users: { $sum: "$metrics.users" },
                    bounceRate: { $avg: "$metrics.bounceRate" }
                }},
                { $sort: { views: -1 } },
                { $limit: 10 }
            ])
        ]);

        // Merge timeseries
        const tsMap = {};
        ga4Ts.forEach(d => { tsMap[d._id] = { date: d._id, Sessions: d.sessions, Clicks: 0, Impressions: 0, Spend: 0, Conversions: 0 }; });
        gscTs.forEach(d => {
            if (!tsMap[d._id]) tsMap[d._id] = { date: d._id, Sessions: 0, Clicks: 0, Impressions: 0, Spend: 0, Conversions: 0 };
            tsMap[d._id].Clicks = d.clicks;
            tsMap[d._id].Impressions = d.impressions;
        });
        adsTs.forEach(d => {
            if (!tsMap[d._id]) tsMap[d._id] = { date: d._id, Sessions: 0, Clicks: 0, Impressions: 0, Spend: 0, Conversions: 0 };
            tsMap[d._id].Spend = d.spend;
            tsMap[d._id].Conversions = d.conversions;
        });
        const combinedTs = Object.values(tsMap).sort((a,b) => a.date.localeCompare(b.date));

        const ga4 = ga4Data[0] || { users: 0, sessions: 0, pageViews: 0, bounceRate: 0, avgSessionDuration: 0 };
        const gscRaw = gscData[0] || { clicks: 0, impressions: 0, position: 0 };
        const gsc = { ...gscRaw, avgPosition: gscRaw.position, ctr: gscRaw.impressions > 0 ? gscRaw.clicks / gscRaw.impressions : 0 };

        const adsDataAgg = adsData || [];
        const gAdsRaw = adsDataAgg.find(r => r._id === 'google-ads') || { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
        const gAds = {
            ...gAdsRaw,
            ctr: gAdsRaw.impressions > 0 ? gAdsRaw.clicks / gAdsRaw.impressions : 0,
            cpc: gAdsRaw.clicks > 0 ? gAdsRaw.spend / gAdsRaw.clicks : 0
        };

        const fbAdsRaw = adsDataAgg.find(r => r._id === 'facebook-ads') || { spend: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0, purchaseValue: 0 };
        const fbAds = {
            ...fbAdsRaw,
            ctr: fbAdsRaw.impressions > 0 ? fbAdsRaw.clicks / fbAdsRaw.impressions : 0,
            cpc: fbAdsRaw.clicks > 0 ? fbAdsRaw.spend / fbAdsRaw.clicks : 0,
            roas: fbAdsRaw.spend > 0 ? (fbAdsRaw.purchaseValue || (fbAdsRaw.conversions * 50)) / fbAdsRaw.spend : 0
        };

        const prevGa4 = prevGa4Data[0] || { sessions: 0 };
        const prevGsc = prevGscData[0] || { clicks: 0 };
        const prevAdsDataAgg = prevAdsData || [];
        const prevGAds = prevAdsDataAgg.find(r => r._id === 'google-ads') || { spend: 0, conversions: 0 };
        const prevFbAds = prevAdsDataAgg.find(r => r._id === 'facebook-ads') || { spend: 0, conversions: 0 };

        const calculateGrowth = (current, previous) => {
            if (!previous || previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        const totalConversions = gAds.conversions + fbAds.conversions;
        const prevTotalConversions = prevGAds.conversions + prevFbAds.conversions;

        // Generate dynamic insights
        const insights = [];
        if (ga4.sessions > prevGa4.sessions) {
            insights.push({ title: 'Traffic Momentum', desc: `Traffic is up ${calculateGrowth(ga4.sessions, prevGa4.sessions).toFixed(1)}% compared to the previous period.`, color: 'brand', icon: 'UsersIcon' });
        }
        if (gsc.clicks > prevGsc.clicks) {
            insights.push({ title: 'SEO Growth', desc: `Search visibility increased, driving ${gsc.clicks} clicks from Google Search.`, color: 'semantic-green', icon: 'MagnifyingGlassIcon' });
        }
        if (totalConversions > prevTotalConversions) {
            insights.push({ title: 'Conversion Surge', desc: `Your marketing resonance is peaking with ${totalConversions} total conversions.`, color: 'accent', icon: 'CheckCircleIcon' });
        } else if (totalConversions > 0) {
             insights.push({ title: 'Conversion Insight', desc: `Connected channels generated ${totalConversions} conversions this period.`, color: 'brand', icon: 'CheckCircleIcon' });
        }

        if (insights.length < 3) {
            insights.push({ title: 'Node Sync', desc: 'All data streams are currently synchronized and reflecting real-time metrics.', color: 'neutral', icon: 'CloudArrowUpIcon' });
        }

        res.status(200).json({
            ga4: { ...ga4, growth: calculateGrowth(ga4.sessions, prevGa4.sessions) },
            gsc: { ...gsc, growth: calculateGrowth(gsc.clicks, prevGsc.clicks) },
            googleAds: { ...gAds, growth: calculateGrowth(gAds.conversions, prevGAds.conversions) },
            facebookAds: { ...fbAds, growth: calculateGrowth(fbAds.spend, prevFbAds.spend) },
            timeseries: combinedTs,
            topPages: topPages.map(p => ({
                url: p._id || '/',
                visitors: p.users,
                views: p.views,
                bounce: ((p.bounceRate || 0) * 100).toFixed(0) + '%',
                share: ga4.pageViews > 0 ? Math.round((p.views / ga4.pageViews) * 100) : 0
            })),
            insights: insights.slice(0, 3)
        });
    } catch (error) {
        console.error('Dashboard Summary Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary' });
    }
};

export const getGa4Summary = async (req, res) => {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;

    try {
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
                { $group: {
                    _id: null,
                    users: { $sum: "$metrics.users" },
                    sessions: { $sum: "$metrics.sessions" },
                    bounceRate: { $avg: "$metrics.bounceRate" },
                    avgSessionDuration: { $avg: "$metrics.avgSessionDuration" },
                    pageViews: { $sum: "$metrics.pageViews" }
                }}
            ]),
            DailyMetric.aggregate([
                { $match: prevFilter },
                { $group: {
                    _id: null,
                    users: { $sum: "$metrics.users" },
                    sessions: { $sum: "$metrics.sessions" },
                    bounceRate: { $avg: "$metrics.bounceRate" },
                    avgSessionDuration: { $avg: "$metrics.avgSessionDuration" },
                    pageViews: { $sum: "$metrics.pageViews" }
                }}
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: { 
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, 
                    sessions: { $sum: "$metrics.sessions" },
                    pageViews: { $sum: "$metrics.pageViews" },
                    users: { $sum: "$metrics.users" },
                    bounceRate: { $avg: "$metrics.bounceRate" }
                } },
                { $sort: { _id: 1 } }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: {
                    _id: { channel: "$metadata.dimensions.channel", source: "$metadata.dimensions.source" },
                    sessions: { $sum: "$metrics.sessions" },
                    users: { $sum: "$metrics.users" }
                }},
                { $sort: { sessions: -1 } },
                { $limit: 10 }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: {
                    _id: { path: "$metadata.dimensions.pagePath", title: "$metadata.dimensions.pageTitle" },
                    views: { $sum: "$metrics.pageViews" },
                    users: { $sum: "$metrics.users" }
                }},
                { $sort: { views: -1 } },
                { $limit: 10 }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: {
                    _id: "$metadata.dimensions.device",
                    value: { $sum: "$metrics.sessions" }
                }},
                { $sort: { value: -1 } }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: {
                    _id: "$metadata.dimensions.country",
                    value: { $sum: "$metrics.sessions" }
                }},
                { $sort: { value: -1 } },
                { $limit: 5 }
            ])
        ]);


        res.status(200).json({
            overview: overview[0] || { users: 0, sessions: 0, bounceRate: 0, avgSessionDuration: 0, pageViews: 0 },
            priorOverview: priorOverview[0] || { users: 0, sessions: 0, bounceRate: 0, avgSessionDuration: 0, pageViews: 0 },
            timeseries: timeseries.map(d => ({ 
                date: d._id, 
                sessions: d.sessions,
                pageViews: d.pageViews || 0,
                users: d.users || 0,
                bounceRate: (d.bounceRate || 0) * 100 // Scale to pct
            })),
            traffic: traffic.map(d => ({ channel: d._id.channel, source: d._id.source, sessions: d.sessions, users: d.users })),
            pages: pages.map(d => ({ path: d._id.path, title: d._id.title, views: d.views, users: d.users })),
            breakdowns: {
                devices: (ga4BreakdownsDevices || []).map(d => ({ name: d._id || 'unknown', value: d.value })),
                locations: (ga4BreakdownsLocations || []).map(d => ({ name: d._id || 'unknown', value: d.value }))
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const getGscSummary = async (req, res) => {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;

    try {
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
                { $group: {
                    _id: null,
                    clicks: { $sum: "$metrics.clicks" },
                    impressions: { $sum: "$metrics.impressions" },
                    position: { $avg: "$metrics.position" }
                }}
            ]),
            DailyMetric.aggregate([
                { $match: prevFilter },
                { $group: {
                    _id: null,
                    clicks: { $sum: "$metrics.clicks" },
                    impressions: { $sum: "$metrics.impressions" },
                    position: { $avg: "$metrics.position" }
                }}
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: { 
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, 
                    clicks: { $sum: "$metrics.clicks" }, 
                    impressions: { $sum: "$metrics.impressions" },
                    position: { $avg: "$metrics.position" }
                } },
                { $sort: { _id: 1 } }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: {
                    _id: "$metadata.dimensions.query",
                    clicks: { $sum: "$metrics.clicks" },
                    impressions: { $sum: "$metrics.impressions" },
                    position: { $avg: "$metrics.position" }
                }},
                { $sort: { clicks: -1 } },
                { $limit: 20 }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: {
                    _id: "$metadata.dimensions.page",
                    clicks: { $sum: "$metrics.clicks" },
                    impressions: { $sum: "$metrics.impressions" },
                    position: { $avg: "$metrics.position" }
                }},
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

        res.status(200).json({
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
            countries: countryBreakdown.map(d => ({ name: d._id || 'unknown', value: d.value }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const getGoogleAdsSummary = async (req, res) => {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;

    try {
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
                { $group: {
                    _id: null,
                    cost: { $sum: "$metrics.spend" },
                    impressions: { $sum: "$metrics.impressions" },
                    clicks: { $sum: "$metrics.clicks" },
                    conversions: { $sum: "$metrics.conversions" }
                }}
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: { 
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, 
                    cost: { $sum: "$metrics.spend" }, 
                    clicks: { $sum: "$metrics.clicks" },
                    impressions: { $sum: "$metrics.impressions" },
                    conversions: { $sum: "$metrics.conversions" }
                } },
                { $sort: { _id: 1 } }
            ]),
            DailyMetric.aggregate([
                { $match: prevFilter },
                { $group: {
                    _id: null,
                    cost: { $sum: "$metrics.spend" },
                    impressions: { $sum: "$metrics.impressions" },
                    clicks: { $sum: "$metrics.clicks" },
                    conversions: { $sum: "$metrics.conversions" }
                }}
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: {
                    _id: { name: "$metadata.dimensions.campaign", status: "$metadata.dimensions.campaignStatus" },
                    cost: { $sum: "$metrics.spend" },
                    impressions: { $sum: "$metrics.impressions" },
                    clicks: { $sum: "$metrics.clicks" },
                    conversions: { $sum: "$metrics.conversions" }
                }},
                { $sort: { cost: -1 } }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: {
                    _id: "$metadata.dimensions.adGroup",
                    cost: { $sum: "$metrics.spend" },
                    impressions: { $sum: "$metrics.impressions" },
                    clicks: { $sum: "$metrics.clicks" }
                }},
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

        res.status(200).json({
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
            }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getFacebookAdsSummary = async (req, res) => {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;

    try {
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
                { $group: {
                    _id: null,
                    spend: { $sum: "$metrics.spend" },
                    impressions: { $sum: "$metrics.impressions" },
                    clicks: { $sum: "$metrics.clicks" },
                    conversions: { $sum: "$metrics.conversions" },
                    reach: { $sum: "$metrics.reach" },
                    purchase_value: { $sum: "$metrics.purchase_value" }
                }}
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: { 
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, 
                    spend: { $sum: "$metrics.spend" }, 
                    clicks: { $sum: "$metrics.clicks" },
                    impressions: { $sum: "$metrics.impressions" },
                    reach: { $sum: "$metrics.reach" }
                } },
                { $sort: { _id: 1 } }
            ]),
            DailyMetric.aggregate([
                { $match: prevFilter },
                { $group: {
                    _id: null,
                    spend: { $sum: "$metrics.spend" },
                    impressions: { $sum: "$metrics.impressions" },
                    clicks: { $sum: "$metrics.clicks" },
                    conversions: { $sum: "$metrics.conversions" },
                    reach: { $sum: "$metrics.reach" },
                    purchase_value: { $sum: "$metrics.purchase_value" }
                }}
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: {
                    _id: "$metadata.dimensions.campaign",
                    spend: { $sum: "$metrics.spend" },
                    impressions: { $sum: "$metrics.impressions" },
                    clicks: { $sum: "$metrics.clicks" },
                    conversions: { $sum: "$metrics.conversions" },
                    reach: { $sum: "$metrics.reach" }
                }},
                { $sort: { spend: -1 } }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: {
                    _id: "$metadata.dimensions.adset",
                    spend: { $sum: "$metrics.spend" },
                    impressions: { $sum: "$metrics.impressions" },
                    clicks: { $sum: "$metrics.clicks" },
                    conversions: { $sum: "$metrics.conversions" },
                    reach: { $sum: "$metrics.reach" }
                }},
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

        res.status(200).json({
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
            }))
        });
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

        // Calculate a small window for daily refresh (last 3 days)
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const startDate = threeDaysAgo.toISOString().split('T')[0];
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
