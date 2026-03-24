import DailyMetric from '../models/DailyMetric.js';
import { buildMatchFilter } from './analyticsController.js';

export const getOverview = async (req, res) => {
    const filter = await buildMatchFilter(req.user._id, 'google-ads', req.query);
    const results = await DailyMetric.aggregate([
        { $match: filter },
        { $group: {
            _id: "$source",
            spend: { $sum: "$metrics.spend" },
            impressions: { $sum: "$metrics.impressions" },
            clicks: { $sum: "$metrics.clicks" },
            conversions: { $sum: "$metrics.conversions" }
        }}
    ]);
    
    // Split combined metrics into their respective objects
    const gads = results.find(r => r._id === 'google-ads') || { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
    res.status(200).json(gads);
};

export const getCampaigns = async (req, res) => {
    const filter = await buildMatchFilter(req.user._id, 'google-ads', req.query);
    const data = await DailyMetric.aggregate([
        { $match: filter },
        { $group: {
            _id: "$dimensions.campaign",
            spend: { $sum: "$metrics.spend" },
            clicks: { $sum: "$metrics.clicks" },
            impressions: { $sum: "$metrics.impressions" },
            conversions: { $sum: "$metrics.conversions" }
        }},
        { $sort: { spend: -1 } }
    ]);
    res.status(200).json(data.map(d => ({
        campaign: { name: d._id },
        metrics: { costMicros: d.spend * 1000000, impressions: d.impressions, clicks: d.clicks, conversions: d.conversions }
    })));
};

export const getAdgroups = async (req, res) => {
    res.status(200).json([]);
};

export const getKeywords = async (req, res) => {
    res.status(200).json([]);
};

export const getTimeseries = async (req, res) => {
    const filter = await buildMatchFilter(req.user._id, 'google-ads', req.query);
    const data = await DailyMetric.aggregate([
        { $match: filter },
        { $group: {
            _id: "$date",
            spend: { $sum: "$metrics.spend" },
            clicks: { $sum: "$metrics.clicks" }
        }},
        { $sort: { _id: 1 } }
    ]);
    res.status(200).json(data.map(d => ({
        segments: { date: d._id },
        metrics: { costMicros: d.spend * 1000000, clicks: d.clicks }
    })));
};

export const getCompare = async (req, res) => {
    res.status(200).json({ current: null, prior: null });
};
