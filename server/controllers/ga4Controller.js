import DailyMetric from '../models/DailyMetric.js';
import { buildMatchFilter } from './analyticsController.js';

export const getOverview = async (req, res) => {
    const { startDate, endDate } = req.query;
    const filter = await buildMatchFilter(req.user._id, 'ga4', req.query);
    const results = await DailyMetric.aggregate([
        { $match: filter },
        { $group: {
            _id: null,
            activeUsers: { $sum: "$metrics.users" },
            sessions: { $sum: "$metrics.sessions" },
            screenPageViews: { $sum: "$metrics.screenPageViews" },
            avgBounceRate: { $avg: "$metrics.bounceRate" }
        }}
    ]);
    
    // Format to match old API response structure for frontend compatibility
    const data = results[0] || { activeUsers: 0, sessions: 0, screenPageViews: 0, avgBounceRate: 0 };
    res.status(200).json({
        rows: [{
            metricValues: [
                { value: data.activeUsers },
                { value: data.sessions },
                { value: data.avgBounceRate },
                { value: 0 }, // placeholder for duration
                { value: data.screenPageViews }
            ]
        }]
    });
};

export const getTimeseries = async (req, res) => {
    const { metric } = req.query;
    const mKey = metric === 'users' ? 'users' : (metric || 'sessions');
    const filter = await buildMatchFilter(req.user._id, 'ga4', req.query);
    
    const data = await DailyMetric.aggregate([
        { $match: filter },
        { $group: {
            _id: "$date",
            value: { $sum: `$metrics.${mKey}` }
        }},
        { $sort: { _id: 1 } }
    ]);
    
    res.status(200).json({
        rows: data.map(d => ({
            dimensionValues: [{ value: d._id.replace(/-/g, '') }],
            metricValues: [{ value: d.value }]
        }))
    });
};

export const getTraffic = async (req, res) => {
    const filter = await buildMatchFilter(req.user._id, 'ga4', req.query);
    const data = await DailyMetric.aggregate([
        { $match: filter },
        { $group: {
            _id: "$dimensions.source",
            sessions: { $sum: "$metrics.sessions" },
            activeUsers: { $sum: "$metrics.users" }
        }},
        { $sort: { sessions: -1 } }
    ]);
    
    res.status(200).json({
        rows: data.map(d => ({
            dimensionValues: [{ value: d._id }, { value: d._id }],
            metricValues: [{ value: d.sessions }, { value: d.activeUsers }, { value: 0 }]
        }))
    });
};

export const getPages = async (req, res) => {
    res.status(200).json({ rows: [] }); // Detail pages not fully synced yet or can use cache
};

export const getDevices = async (req, res) => {
    const filter = await buildMatchFilter(req.user._id, 'ga4', req.query);
    const data = await DailyMetric.aggregate([
        { $match: filter },
        { $group: {
            _id: "$dimensions.device",
            sessions: { $sum: "$metrics.sessions" },
            activeUsers: { $sum: "$metrics.users" }
        }}
    ]);
    res.status(200).json({
        rows: data.map(d => ({
            dimensionValues: [{ value: d._id }],
            metricValues: [{ value: d.sessions }, { value: d.activeUsers }]
        }))
    });
};

export const getGeo = async (req, res) => {
    res.status(200).json({ rows: [] });
};

export const getCompare = async (req, res) => {
    // Logic for comparison using two aggregate calls...
    res.status(200).json({ current: null, prior: null });
};
