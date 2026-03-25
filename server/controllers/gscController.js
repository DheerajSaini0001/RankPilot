import DailyMetric from '../models/DailyMetric.js';
import { buildMatchFilter } from './analyticsController.js';

export const getOverview = async (req, res) => {
    const filter = await buildMatchFilter(req.user._id, 'gsc', req.query);
    const results = await DailyMetric.aggregate([
        { $match: filter },
        { $group: {
            _id: null,
            clicks: { $sum: "$metrics.clicks" },
            impressions: { $sum: "$metrics.impressions" },
            avgPosition: { $avg: "$metrics.position" }
        }}
    ]);
    const d = results[0] || { clicks: 0, impressions: 0, avgPosition: 0 };
    res.status(200).json({
        rows: [{
            clicks: d.clicks,
            impressions: d.impressions,
            ctr: d.impressions > 0 ? (d.clicks / d.impressions) : 0,
            position: d.avgPosition
        }]
    });
};

export const getQueries = async (req, res) => {
    const filter = await buildMatchFilter(req.user._id, 'gsc', req.query);
    const data = await DailyMetric.aggregate([
        { $match: filter },
        { $group: {
            _id: "$metadata.dimensions.query",
            clicks: { $sum: "$metrics.clicks" },
            impressions: { $sum: "$metrics.impressions" },
            ctr: { $avg: "$metrics.ctr" },
            position: { $avg: "$metrics.position" }
        }},
        { $sort: { clicks: -1 } },
        { $limit: 50 }
    ]);
    res.status(200).json({
        rows: data.map(d => ({
            keys: [d._id],
            clicks: d.clicks,
            impressions: d.impressions,
            ctr: d.ctr,
            position: d.position
        }))
    });
};

export const getPages = async (req, res) => {
    const filter = await buildMatchFilter(req.user._id, 'gsc', req.query);
    const data = await DailyMetric.aggregate([
        { $match: filter },
        { $group: {
            _id: "$metadata.dimensions.page",
            clicks: { $sum: "$metrics.clicks" },
            impressions: { $sum: "$metrics.impressions" }
        }},
        { $sort: { clicks: -1 } },
        { $limit: 50 }
    ]);
    res.status(200).json({
        rows: data.map(d => ({
            keys: [d._id],
            clicks: d.clicks,
            impressions: d.impressions
        }))
    });
};

export const getDevices = async (req, res) => {
    res.status(200).json({ rows: [] });
};

export const getCountries = async (req, res) => {
    res.status(200).json({ rows: [] });
};

export const getTimeseries = async (req, res) => {
    const filter = await buildMatchFilter(req.user._id, 'gsc', req.query);
    const data = await DailyMetric.aggregate([
        { $match: filter },
        { $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            clicks: { $sum: "$metrics.clicks" },
            impressions: { $sum: "$metrics.impressions" }
        }},
        { $sort: { _id: 1 } }
    ]);
    res.status(200).json({
        rows: data.map(d => ({
            keys: [d._id],
            clicks: d.clicks,
            impressions: d.impressions
        }))
    });
};
