import DailyMetric from '../models/DailyMetric.js';
import UserAccounts from '../models/UserAccounts.js';

const buildMatchFilter = async (userId, source, query) => {
    const { startDate, endDate, device, campaign, channel, siteId } = query;
    const filter = { userId, date: { $gte: startDate, $lte: endDate } };
    
    // If siteId is provided, we need to filter by platformAccountId
    if (siteId) {
        const acc = await UserAccounts.findOne({ _id: siteId, userId });
        if (acc) {
            if (source === 'ga4') filter.platformAccountId = acc.ga4PropertyId;
            else if (source === 'gsc') filter.platformAccountId = acc.gscSiteUrl;
            else if (source === 'google-ads') filter.platformAccountId = acc.googleAdsCustomerId;
            else if (source === 'facebook-ads') filter.platformAccountId = acc.facebookAdAccountId;
            else if (Array.isArray(source)) {
                // For combined ads summary
                filter.$or = [
                    { source: 'google-ads', platformAccountId: acc.googleAdsCustomerId },
                    { source: 'facebook-ads', platformAccountId: acc.facebookAdAccountId }
                ];
                // Remove the top level source filter if using $or
            }
        }
    }

    if (source && !filter.$or) {
        if (Array.isArray(source)) {
            filter.source = { $in: source };
        } else {
            filter.source = source;
        }
    }

    if (device) filter["dimensions.device"] = device;
    if (campaign) filter["dimensions.campaign"] = campaign;
    if (channel) filter["dimensions.channel"] = channel;
    
    return filter;
};


export const getDashboardSummary = async (req, res) => {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;

    try {
        // Fetch everything in parallel for speed
        const [ga4Filter, gscFilter, adsFilter, tsFilter] = await Promise.all([
            buildMatchFilter(userId, 'ga4', req.query),
            buildMatchFilter(userId, 'gsc', req.query),
            buildMatchFilter(userId, ['google-ads', 'facebook-ads'], req.query),
            buildMatchFilter(userId, 'ga4', req.query)
        ]);

        const [ga4Data, gscData, adsData, ga4Timeseries] = await Promise.all([
            // GA4 Summary
            DailyMetric.aggregate([
                { $match: ga4Filter },
                { $group: {
                    _id: null,
                    activeUsers: { $sum: "$metrics.users" },
                    sessions: { $sum: "$metrics.sessions" },
                    screenPageViews: { $sum: "$metrics.screenPageViews" },
                    avgBounceRate: { $avg: "$metrics.bounceRate" }
                }}
            ]),
            // GSC Summary
            DailyMetric.aggregate([
                { $match: gscFilter },
                { $group: {
                    _id: null,
                    clicks: { $sum: "$metrics.clicks" },
                    impressions: { $sum: "$metrics.impressions" },
                    avgPosition: { $avg: "$metrics.position" }
                }}
            ]),
            // Ads Summary (Both Google and Facebook)
            DailyMetric.aggregate([
                { $match: adsFilter },
                { $group: {
                    _id: "$source",
                    spend: { $sum: "$metrics.spend" },
                    impressions: { $sum: "$metrics.impressions" },
                    clicks: { $sum: "$metrics.clicks" },
                    conversions: { $sum: "$metrics.conversions" }
                }}
            ]),
            // GA4 Timeseries for the chart
            DailyMetric.aggregate([
                { $match: tsFilter },
                { $group: {
                    _id: "$date",
                    sessions: { $sum: "$metrics.sessions" }
                }},
                { $sort: { _id: 1 } }
            ])
        ]);


        const ga4 = ga4Data[0] || { activeUsers: 0, sessions: 0, screenPageViews: 0, avgBounceRate: 0 };
        const gsc = gscData[0] || { clicks: 0, impressions: 0, avgPosition: 0 };
        const gAds = adsData.find(r => r._id === 'google-ads') || { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
        const fbAds = adsData.find(r => r._id === 'facebook-ads') || { spend: 0, impressions: 0, clicks: 0, conversions: 0 };

        res.status(200).json({
            ga4: {
                activeUsers: ga4.activeUsers,
                sessions: ga4.sessions,
                avgBounceRate: ga4.avgBounceRate,
                screenPageViews: ga4.screenPageViews
            },
            gsc: {
                clicks: gsc.clicks,
                impressions: gsc.impressions,
                avgPosition: gsc.avgPosition
            },
            googleAds: gAds,
            facebookAds: fbAds,
            timeseries: ga4Timeseries.map(d => ({
                date: d._id,
                traffic: d.sessions
            }))
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
        const [overview, timeseries, traffic, pages] = await Promise.all([
            DailyMetric.aggregate([
                { $match: filter },
                { $group: {
                    _id: null,
                    users: { $sum: "$metrics.users" },
                    sessions: { $sum: "$metrics.sessions" },
                    bounceRate: { $avg: "$metrics.bounceRate" },
                    avgSessionDuration: { $avg: "$metrics.sessionDuration" },
                    pageViews: { $sum: "$metrics.screenPageViews" }
                }}
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: { _id: "$date", sessions: { $sum: "$metrics.sessions" } } },
                { $sort: { _id: 1 } }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: {
                    _id: { channel: "$dimensions.channel", source: "$dimensions.source" },
                    sessions: { $sum: "$metrics.sessions" },
                    users: { $sum: "$metrics.users" }
                }},
                { $sort: { sessions: -1 } },
                { $limit: 10 }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: {
                    _id: { path: "$dimensions.pagePath", title: "$dimensions.pageTitle" },
                    views: { $sum: "$metrics.screenPageViews" },
                    users: { $sum: "$metrics.users" }
                }},
                { $sort: { views: -1 } },
                { $limit: 10 }
            ])
        ]);


        res.status(200).json({
            overview: overview[0] || { users: 0, sessions: 0, bounceRate: 0, avgSessionDuration: 0, pageViews: 0 },
            timeseries: timeseries.map(d => ({ date: d._id, sessions: d.sessions })),
            traffic: traffic.map(d => ({ channel: d._id.channel, source: d._id.source, sessions: d.sessions, users: d.users })),
            pages: pages.map(d => ({ path: d._id.path, title: d._id.title, views: d.views, users: d.users }))
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
        const [overview, timeseries, queries, pages] = await Promise.all([
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
                { $match: filter },
                { $group: { _id: "$date", clicks: { $sum: "$metrics.clicks" }, impressions: { $sum: "$metrics.impressions" } } },
                { $sort: { _id: 1 } }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: {
                    _id: "$dimensions.query",
                    clicks: { $sum: "$metrics.clicks" },
                    impressions: { $sum: "$metrics.impressions" },
                    position: { $avg: "$metrics.position" }
                }},
                { $sort: { clicks: -1 } },
                { $limit: 10 }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: {
                    _id: "$dimensions.page",
                    clicks: { $sum: "$metrics.clicks" },
                    impressions: { $sum: "$metrics.impressions" }
                }},
                { $sort: { clicks: -1 } },
                { $limit: 10 }
            ])
        ]);


        const ov = overview[0] || { clicks: 0, impressions: 0, position: 0 };
        res.status(200).json({
            overview: { ...ov, ctr: ov.impressions > 0 ? ov.clicks / ov.impressions : 0 },
            timeseries: timeseries.map(d => ({ date: d._id, clicks: d.clicks, impressions: d.impressions })),
            queries: queries.map(d => ({ query: d._id, clicks: d.clicks, impressions: d.impressions, ctr: d.impressions > 0 ? d.clicks / d.impressions : 0, position: d.position })),
            pages: pages.map(d => ({ page: d._id, clicks: d.clicks, impressions: d.impressions }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getGoogleAdsSummary = async (req, res) => {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;

    try {
        const filter = await buildMatchFilter(userId, 'google-ads', req.query);
        const [overview, timeseries, campaigns, keywords] = await Promise.all([
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
                { $group: { _id: "$date", cost: { $sum: "$metrics.spend" }, clicks: { $sum: "$metrics.clicks" } } },
                { $sort: { _id: 1 } }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: {
                    _id: { name: "$dimensions.campaign", status: "$dimensions.status" },
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
                    _id: "$dimensions.adGroup",
                    cost: { $sum: "$metrics.spend" },
                    impressions: { $sum: "$metrics.impressions" },
                    clicks: { $sum: "$metrics.clicks" }
                }},
                { $sort: { cost: -1 } },
                { $limit: 10 }
            ])
        ]);


        const ov = overview[0] || { cost: 0, impressions: 0, clicks: 0, conversions: 0 };
        res.status(200).json({
            overview: {
                ...ov,
                ctr: ov.impressions > 0 ? ov.clicks / ov.impressions : 0,
                cpc: ov.clicks > 0 ? ov.cost / ov.clicks : 0
            },
            timeseries: timeseries.map(d => ({ date: d._id, cost: d.cost, clicks: d.clicks })),
            campaigns: campaigns.map(d => ({ name: d._id.name, status: d._id.status, cost: d.cost, impressions: d.impressions, clicks: d.clicks, conversions: d.conversions })),
            keywords: keywords.map(d => ({ name: d._id, cost: d.cost, impressions: d.impressions, clicks: d.clicks }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getFacebookAdsSummary = async (req, res) => {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;

    try {
        const filter = await buildMatchFilter(userId, 'facebook-ads', req.query);
        const [overview, timeseries, campaigns, adsets] = await Promise.all([
            DailyMetric.aggregate([
                { $match: filter },
                { $group: {
                    _id: null,
                    spend: { $sum: "$metrics.spend" },
                    impressions: { $sum: "$metrics.impressions" },
                    clicks: { $sum: "$metrics.clicks" }
                }}
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: { _id: "$date", spend: { $sum: "$metrics.spend" }, clicks: { $sum: "$metrics.clicks" } } },
                { $sort: { _id: 1 } }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: {
                    _id: "$dimensions.campaign",
                    spend: { $sum: "$metrics.spend" },
                    impressions: { $sum: "$metrics.impressions" },
                    clicks: { $sum: "$metrics.clicks" }
                }},
                { $sort: { spend: -1 } }
            ]),
            DailyMetric.aggregate([
                { $match: filter },
                { $group: {
                    _id: "$dimensions.adset",
                    spend: { $sum: "$metrics.spend" },
                    impressions: { $sum: "$metrics.impressions" },
                    clicks: { $sum: "$metrics.clicks" }
                }},
                { $sort: { spend: -1 } },
                { $limit: 10 }
            ])
        ]);


        const ov = overview[0] || { spend: 0, impressions: 0, clicks: 0 };
        res.status(200).json({
            overview: {
                ...ov,
                ctr: ov.impressions > 0 ? (ov.clicks / ov.impressions) * 100 : 0,
                cpc: ov.clicks > 0 ? ov.spend / ov.clicks : 0
            },
            timeseries: timeseries.map(d => ({ date: d._id, spend: d.spend, clicks: d.clicks })),
            campaigns: campaigns.map(d => ({ name: d._id, spend: d.spend, impressions: d.impressions, clicks: d.clicks })),
            adsets: adsets.map(d => ({ name: d._id, spend: d.spend, impressions: d.impressions, clicks: d.clicks }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
