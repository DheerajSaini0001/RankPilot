import DailyMetric from '../models/DailyMetric.js';

export const getOverview = async (req, res) => {
    const { startDate, endDate } = req.query;
    const results = await DailyMetric.aggregate([
        { $match: { userId: req.user._id, source: 'facebook-ads', date: { $gte: startDate, $lte: endDate } } },
        { $group: {
            _id: null,
            spend: { $sum: "$metrics.spend" },
            impressions: { $sum: "$metrics.impressions" },
            clicks: { $sum: "$metrics.clicks" },
            reach: { $sum: "$metrics.reach" }
        }}
    ]);
    res.status(200).json(results);
};

export const getCampaigns = async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await DailyMetric.aggregate([
        { $match: { userId: req.user._id, source: 'facebook-ads', date: { $gte: startDate, $lte: endDate } } },
        { $group: {
            _id: "$dimensions.campaign",
            spend: { $sum: "$metrics.spend" },
            clicks: { $sum: "$metrics.clicks" },
            impressions: { $sum: "$metrics.impressions" }
        }},
        { $sort: { spend: -1 } }
    ]);
    res.status(200).json(data.map(d => ({
        campaign_name: d._id,
        spend: d.spend,
        clicks: d.clicks,
        impressions: d.impressions
    })));
};

export const getAdsets = async (req, res) => {
    res.status(200).json([]);
};

export const getAds = async (req, res) => {
    res.status(200).json([]);
};

export const getTimeseries = async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await DailyMetric.aggregate([
        { $match: { userId: req.user._id, source: 'facebook-ads', date: { $gte: startDate, $lte: endDate } } },
        { $group: {
            _id: "$date",
            spend: { $sum: "$metrics.spend" },
            clicks: { $sum: "$metrics.clicks" }
        }},
        { $sort: { _id: 1 } }
    ]);
    res.status(200).json(data.map(d => ({
        date_start: d._id,
        spend: d.spend,
        clicks: d.clicks
    })));
};

export const getCompare = async (req, res) => {
    res.status(200).json({ current: null, prior: null });
};
