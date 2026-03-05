import { callClaude } from '../services/claudeService.js';
import { callGemini } from '../services/geminiService.js';
import promptBuilder from '../services/promptBuilder.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import WeeklyInsight from '../models/WeeklyInsight.js';
import UserAccounts from '../models/UserAccounts.js';
import { runReport as runGa4Report } from '../services/ga4Service.js';
import { runQuery as runGscQuery } from '../services/gscService.js';
import { runQuery as runGAdsQuery } from '../services/googleAdsService.js';
import { getInsights as getFbInsights } from '../services/facebookAdsService.js';

const getAiResponse = async (prompt) => {
    const start = Date.now();
    let result;
    try {
        result = await callClaude(prompt);
    } catch (err) {
        console.warn(`Claude failed (${err.status || err.message}). Falling back to Gemini...`);
        try {
            result = await callGemini(prompt);
        } catch (fallbackErr) {
            const error = new Error('AI service temporarily unavailable');
            error.statusCode = 503;
            throw error;
        }
    }
    result.latencyMs = Date.now() - start;
    return result;
};

export const askAi = async (req, res) => {
    let { question, conversationId, dateRangeStart, dateRangeEnd, activeSources, data } = req.body;

    // Reliability: If data is missing (e.g. user is on a page that didn't fetch it yet),
    // fetch a baseline overview for the AI on the backend.
    if (!data || Object.keys(data).length === 0) {
        data = {};
        const userId = req.user._id;

        try {
            // Fetch GA4 if property is set
            const userAcc = await UserAccounts.findOne({ userId });
            if (userAcc) {
                const promises = [];

                if (userAcc.ga4PropertyId) {
                    promises.push(runGa4Report(userId, 'overview', dateRangeStart, dateRangeEnd, ['date'], ['activeUsers', 'sessions', 'bounceRate', 'averageSessionDuration', 'screenPageViews'])
                        .then(r => {
                            const rows = r.rows?.[0]?.metricValues || [];
                            data.ga4 = {
                                users: rows[0]?.value || 0,
                                sessions: rows[1]?.value || 0,
                                bounceRate: rows[2]?.value || 0,
                                avgSessionDuration: rows[3]?.value || 0,
                                screenPageViews: rows[4]?.value || 0
                            };
                        }).catch(() => null));
                }

                if (userAcc.gscSiteUrl) {
                    promises.push(runGscQuery(userId, 'overview', dateRangeStart, dateRangeEnd, [])
                        .then(r => {
                            const totals = r.rows?.[0] || {};
                            data.gsc = {
                                clicks: totals.clicks || 0,
                                impressions: totals.impressions || 0,
                                ctr: (totals.ctr * 100).toFixed(2) || 0,
                                position: totals.position?.toFixed(1) || 0
                            };
                        }).catch(() => null));
                }

                if (userAcc.googleAdsCustomerId) {
                    const q = `SELECT metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.ctr, metrics.average_cpc FROM campaign WHERE segments.date >= '${dateRangeStart}' AND segments.date <= '${dateRangeEnd}'`;
                    promises.push(runGAdsQuery(userId, 'overview', dateRangeStart, dateRangeEnd, q)
                        .then(r => {
                            const totals = r.reduce((acc, row) => {
                                acc.spend += (row.metrics.costMicros / 1000000);
                                acc.impressions += parseInt(row.metrics.impressions);
                                acc.clicks += parseInt(row.metrics.clicks);
                                acc.conversions += parseFloat(row.metrics.conversions);
                                return acc;
                            }, { spend: 0, impressions: 0, clicks: 0, conversions: 0 });

                            data.googleAds = {
                                currencyCode: userAcc.googleAdsCurrencyCode || '$',
                                spend: totals.spend.toFixed(2),
                                impressions: totals.impressions,
                                clicks: totals.clicks,
                                ctr: totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : 0,
                                cpc: totals.clicks > 0 ? (totals.spend / totals.clicks).toFixed(2) : 0,
                                conversions: totals.conversions.toFixed(1),
                                roas: totals.spend > 0 ? (totals.conversions / totals.spend).toFixed(2) : 0
                            };
                        }).catch(() => null));
                }

                if (userAcc.facebookAdAccountId) {
                    promises.push(getFbInsights(userId, 'overview', dateRangeStart, dateRangeEnd, 'account', {})
                        .then(r => {
                            const insight = r.data?.[0] || {};
                            data.facebookAds = {
                                currency: userAcc.facebookAdCurrency || '$',
                                spend: insight.spend || 0,
                                reach: insight.reach || 0,
                                impressions: insight.impressions || 0,
                                clicks: insight.clicks || 0,
                                ctr: insight.ctr || 0,
                                cpm: insight.cpm || 0,
                                cpc: insight.cpc || 0,
                                roas: insight.purchase_roas?.[0]?.value || 0
                            };
                        }).catch(() => null));
                }

                await Promise.all(promises);
            }
        } catch (err) {
            console.error("Backend AI Context Fetch Error:", err);
        }
    }

    const prompt = promptBuilder.buildAskPrompt(question, dateRangeStart, dateRangeEnd, data);

    let convId = conversationId;
    if (!convId) {
        const conv = await Conversation.create({ userId: req.user._id, title: question.substring(0, 60), sources: activeSources });
        convId = conv._id;
    }

    await Message.create({ conversationId: convId, role: 'user', content: question });

    const aiResult = await getAiResponse(prompt);

    // Final cleanup: Ensure no bold, headers, or the advisory disclaimer leak through
    let cleanContent = aiResult.content
        .replace(/^[#\s]+(.+)$/gm, '$1') // Remove markdown headers
        .replace(/\*\*?|__/g, '')        // Remove bold/italics
        .replace(/(\r?\n)*.*response is advisory only.*/gi, '') // Remove disclaimer
        .trim();

    const aiMsg = await Message.create({
        conversationId: convId,
        role: 'assistant',
        content: cleanContent,
        model: aiResult.model,
        tokensUsed: aiResult.tokensUsed,
        latencyMs: aiResult.latencyMs
    });

    res.status(200).json({ answer: cleanContent, conversationId: convId, messageId: aiMsg._id });
};

export const getConversations = async (req, res) => {
    const convs = await Conversation.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(convs);
};

export const getConversation = async (req, res) => {
    const conv = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });
    if (!conv) return res.status(404).json({ message: 'Not found' });
    const messages = await Message.find({ conversationId: conv._id }).sort({ createdAt: 1 });
    res.status(200).json({ _id: conv._id, title: conv.title, messages });
};

export const deleteConversation = async (req, res) => {
    const conv = await Conversation.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (conv) await Message.deleteMany({ conversationId: conv._id });
    res.status(200).json({ message: 'Conversation deleted' });
};

export const getWeeklyInsight = async (req, res) => {
    const insight = await WeeklyInsight.findOne({ userId: req.user._id, expiresAt: { $gt: new Date() } });
    if (insight) return res.status(200).json(insight);
    res.status(404).json({ message: 'No insight found. Please refresh.' });
};

export const refreshWeeklyInsight = async (req, res) => {
    const { dateRangeStart, dateRangeEnd, activeSources, data } = req.body;
    const prompt = promptBuilder.buildWeeklyInsightPrompt(dateRangeStart, dateRangeEnd, data);
    const aiResult = await getAiResponse(prompt);

    // Final cleanup: Ensure no bold, headers, or the advisory disclaimer leak through
    let cleanContent = aiResult.content
        .replace(/^[#\s]+(.+)$/gm, '$1') // Remove markdown headers
        .replace(/\*\*?|__/g, '')        // Remove bold/italics
        .replace(/(\r?\n)*.*response is advisory only.*/gi, '') // Remove disclaimer
        .trim();

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const insight = await WeeklyInsight.findOneAndUpdate(
        { userId: req.user._id },
        { content: cleanContent, sources: activeSources, expiresAt },
        { upsert: true, returnDocument: 'after' }
    );
    res.status(200).json(insight);
};

export const getSuggestedQuestions = async (req, res) => {
    const { dateRangeStart, dateRangeEnd, data } = req.body;
    const prompt = promptBuilder.buildSuggestionsPrompt(dateRangeStart, dateRangeEnd, data);
    const aiResult = await getAiResponse(prompt);

    let questions = [];
    try {
        questions = JSON.parse(aiResult.content);
    } catch (e) {
        questions = ["How is my ROI looking?", "Can you explain the drop in traffic?", "Which campaign performs best?", "Compare to previous period."];
    }

    res.status(200).json({ questions });
};
