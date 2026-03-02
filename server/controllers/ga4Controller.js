import { runReport } from '../services/ga4Service.js';

export const getOverview = async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await runReport(req.user._id, 'overview', startDate, endDate, ['date'], ['activeUsers', 'sessions', 'bounceRate', 'averageSessionDuration', 'screenPageViews']);
    res.status(200).json(data);
};

export const getTimeseries = async (req, res) => {
    const { startDate, endDate, metric } = req.query;
    const data = await runReport(req.user._id, 'timeseries', startDate, endDate, ['date'], [metric || 'sessions']);
    res.status(200).json(data);
};

export const getTraffic = async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await runReport(req.user._id, 'traffic', startDate, endDate, ['sessionDefaultChannelGroup', 'sessionSource'], ['sessions', 'activeUsers', 'bounceRate']);
    res.status(200).json(data);
};

export const getPages = async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await runReport(req.user._id, 'pages', startDate, endDate, ['pagePath', 'pageTitle'], ['screenPageViews', 'activeUsers', 'averageSessionDuration']);
    res.status(200).json(data);
};

export const getDevices = async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await runReport(req.user._id, 'devices', startDate, endDate, ['deviceCategory'], ['sessions', 'activeUsers']);
    res.status(200).json(data);
};

export const getGeo = async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await runReport(req.user._id, 'geo', startDate, endDate, ['country'], ['activeUsers', 'sessions']);
    res.status(200).json(data);
};

export const getCompare = async (req, res) => {
    const { startDate1, endDate1, startDate2, endDate2 } = req.query;
    const data1 = await runReport(req.user._id, 'overview', startDate1, endDate1, ['date'], ['activeUsers', 'sessions']);
    const data2 = await runReport(req.user._id, 'overview', startDate2, endDate2, ['date'], ['activeUsers', 'sessions']);
    res.status(200).json({ current: data1, prior: data2 });
};
