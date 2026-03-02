import { getInsights } from '../services/facebookAdsService.js';

export const getOverview = async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await getInsights(req.user._id, 'overview', startDate, endDate, 'account', {});
    res.status(200).json(data);
};

export const getCampaigns = async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await getInsights(req.user._id, 'campaigns', startDate, endDate, 'campaign', {});
    res.status(200).json(data);
};

export const getAdsets = async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await getInsights(req.user._id, 'adsets', startDate, endDate, 'adset', {});
    res.status(200).json(data);
};

export const getAds = async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await getInsights(req.user._id, 'ads', startDate, endDate, 'ad', {});
    res.status(200).json(data);
};

export const getTimeseries = async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await getInsights(req.user._id, 'timeseries', startDate, endDate, 'account', { time_increment: 1 });
    res.status(200).json(data);
};

export const getCompare = async (req, res) => {
    const { startDate1, endDate1, startDate2, endDate2 } = req.query;
    const data1 = await getInsights(req.user._id, 'overview', startDate1, endDate1, 'account', {});
    const data2 = await getInsights(req.user._id, 'overview', startDate2, endDate2, 'account', {});
    res.status(200).json({ current: data1, prior: data2 });
};
