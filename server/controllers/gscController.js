import { runQuery } from '../services/gscService.js';

export const getOverview = async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await runQuery(req.user._id, 'overview', startDate, endDate, []);
    res.status(200).json(data);
};

export const getQueries = async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await runQuery(req.user._id, 'queries', startDate, endDate, ['query']);
    res.status(200).json(data);
};

export const getPages = async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await runQuery(req.user._id, 'pages', startDate, endDate, ['page']);
    res.status(200).json(data);
};

export const getDevices = async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await runQuery(req.user._id, 'devices', startDate, endDate, ['device']);
    res.status(200).json(data);
};

export const getCountries = async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await runQuery(req.user._id, 'countries', startDate, endDate, ['country']);
    res.status(200).json(data);
};

export const getTimeseries = async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await runQuery(req.user._id, 'timeseries', startDate, endDate, ['date']);
    res.status(200).json(data);
};
