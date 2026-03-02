import { runQuery } from '../services/googleAdsService.js';

export const getOverview = async (req, res) => {
    const { startDate, endDate } = req.query;
    const query = `SELECT metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.ctr, metrics.average_cpc FROM campaign WHERE segments.date >= '${startDate}' AND segments.date <= '${endDate}'`;
    const data = await runQuery(req.user._id, 'overview', startDate, endDate, query);
    res.status(200).json(data);
};

export const getCampaigns = async (req, res) => {
    const { startDate, endDate } = req.query;
    const query = `SELECT campaign.id, campaign.name, campaign.status, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.ctr, metrics.average_cpc FROM campaign WHERE segments.date >= '${startDate}' AND segments.date <= '${endDate}' ORDER BY metrics.cost_micros DESC LIMIT 20`;
    const data = await runQuery(req.user._id, 'campaigns', startDate, endDate, query);
    res.status(200).json(data);
};

export const getAdgroups = async (req, res) => {
    const { startDate, endDate } = req.query;
    const query = `SELECT ad_group.id, ad_group.name, ad_group.status, metrics.cost_micros, metrics.clicks, metrics.impressions FROM ad_group WHERE segments.date >= '${startDate}' AND segments.date <= '${endDate}' ORDER BY metrics.cost_micros DESC LIMIT 20`;
    const data = await runQuery(req.user._id, 'adgroups', startDate, endDate, query);
    res.status(200).json(data);
};

export const getKeywords = async (req, res) => {
    const { startDate, endDate } = req.query;
    const query = `SELECT keyword_view.resource_name, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.average_cpc FROM keyword_view WHERE segments.date >= '${startDate}' AND segments.date <= '${endDate}' ORDER BY metrics.cost_micros DESC LIMIT 20`;
    const data = await runQuery(req.user._id, 'keywords', startDate, endDate, query);
    res.status(200).json(data);
};

export const getTimeseries = async (req, res) => {
    const { startDate, endDate } = req.query;
    const query = `SELECT segments.date, metrics.cost_micros, metrics.clicks, metrics.impressions FROM campaign WHERE segments.date >= '${startDate}' AND segments.date <= '${endDate}'`;
    const data = await runQuery(req.user._id, 'timeseries', startDate, endDate, query);
    res.status(200).json(data);
};

export const getCompare = async (req, res) => {
    const { startDate1, endDate1, startDate2, endDate2 } = req.query;
    const query1 = `SELECT metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.ctr, metrics.average_cpc FROM campaign WHERE segments.date >= '${startDate1}' AND segments.date <= '${endDate1}'`;
    const data1 = await runQuery(req.user._id, 'overview', startDate1, endDate1, query1);

    const query2 = `SELECT metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.ctr, metrics.average_cpc FROM campaign WHERE segments.date >= '${startDate2}' AND segments.date <= '${endDate2}'`;
    const data2 = await runQuery(req.user._id, 'overview', startDate2, endDate2, query2);

    res.status(200).json({ current: data1, prior: data2 });
};
