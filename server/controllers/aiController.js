import { callClaude } from '../services/claudeService.js';
import { callGemini } from '../services/geminiService.js';
import promptBuilder from '../services/promptBuilder.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import WeeklyInsight from '../models/WeeklyInsight.js';
import UserAccounts from '../models/UserAccounts.js';
import DailyMetric from '../models/DailyMetric.js';

const getAiResponse = async (prompt) => {
    const start = Date.now();
    let result;
    try {
        result = await callClaude(prompt);
    } catch (err) {
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

const fetchPlatformData = async (userId, startDate, endDate, siteId, activeSources = []) => {
    let data = {};
    const query = siteId ? { _id: siteId, userId } : { userId };
    const userAcc = await UserAccounts.findOne(query).sort({ updatedAt: -1 });
    if (!userAcc) return data;

    const sourceMap = {
        'google': ['ga4', 'gsc', 'google-ads'],
        'facebook': ['facebook-ads'],
        'google_ads': ['google-ads'],
        'google-ads': ['google-ads'],
        'meta': ['facebook-ads'],
        'facebook-ads': ['facebook-ads']
    };
    const dbSources = activeSources.flatMap(s => sourceMap[s] || [s]);

    const dailyQuery = { 
        userId,
        date: { $gte: startDate, $lte: endDate }
    };
    if (dbSources.length > 0) dailyQuery.source = { $in: dbSources };
    
    // Site-specific platform filter
    const platformIds = [];
    if (userAcc.ga4PropertyId) platformIds.push(userAcc.ga4PropertyId);
    if (userAcc.gscSiteUrl) platformIds.push(userAcc.gscSiteUrl);
    if (userAcc.googleAdsCustomerId) platformIds.push(userAcc.googleAdsCustomerId);
    if (userAcc.facebookAdAccountId) platformIds.push(userAcc.facebookAdAccountId);
    if (platformIds.length > 0) dailyQuery.platformAccountId = { $in: platformIds };

    const dailyLogs = await DailyMetric.find(dailyQuery).sort({ date: 1 });

    if (dailyLogs.length > 0) {
        const aggregated = {};
        const sourceTotals = {};
        const sourceEntryCount = {}; // For calculating averages (bounce rate, position)

        dailyLogs.forEach(log => {
            const key = `${log.source}_${log.date}`;
            
            if (!sourceTotals[log.source]) {
                sourceTotals[log.source] = {};
                sourceEntryCount[log.source] = 0;
            }
            sourceEntryCount[log.source] += 1;

            // Daily Aggregation
            if (!aggregated[key]) {
                aggregated[key] = { source: log.source, date: log.date, metrics: { ...log.metrics } };
            } else {
                Object.keys(log.metrics).forEach(m => {
                    if (typeof log.metrics[m] === 'number') {
                        aggregated[key].metrics[m] = (aggregated[key].metrics[m] || 0) + log.metrics[m];
                    }
                });
            }

            // Overall Range Totals
            Object.keys(log.metrics).forEach(m => {
                if (typeof log.metrics[m] === 'number') {
                    sourceTotals[log.source][m] = (sourceTotals[log.source][m] || 0) + log.metrics[m];
                }
            });
        });

        // Format Daily Breakdown for AI
        data.dailyBreakdown = Object.values(aggregated).reduce((acc, item) => {
            if (!acc[item.source]) acc[item.source] = [];
            acc[item.source].push({ date: item.date, metrics: item.metrics });
            return acc;
        }, {});

        // Build Totals with safe averaging
        if (sourceTotals['ga4']) {
            const count = sourceEntryCount['ga4'];
            data.ga4 = {
                users: sourceTotals['ga4'].users || 0,
                sessions: sourceTotals['ga4'].sessions || 0,
                pageViews: sourceTotals['ga4'].pageViews || 0,
                bounceRate: (sourceTotals['ga4'].bounceRate / count).toFixed(2),
                avgSessionDuration: (sourceTotals['ga4'].avgSessionDuration / count).toFixed(1) || 0,
                engagementRate: (sourceTotals['ga4'].engagementRate / count).toFixed(2) || 0
            };
        }
        if (sourceTotals['gsc']) {
            const count = sourceEntryCount['gsc'];
            data.gsc = {
                clicks: sourceTotals['gsc'].clicks || 0,
                impressions: sourceTotals['gsc'].impressions || 0,
                position: (sourceTotals['gsc'].position / count).toFixed(1),
                ctr: (sourceTotals['gsc'].ctr / count).toFixed(2) || 0
            };
        }
        if (sourceTotals['google-ads']) {
            data.googleAds = {
                currencyCode: userAcc.googleAdsCurrencyCode || '$',
                spend: (sourceTotals['google-ads'].spend || 0).toFixed(2),
                impressions: sourceTotals['google-ads'].impressions || 0,
                clicks: sourceTotals['google-ads'].clicks || 0,
                conversions: sourceTotals['google-ads'].conversions || 0
            };
        }
        if (sourceTotals['facebook-ads']) {
            data.facebookAds = {
                currency: userAcc.facebookAdCurrency || '$',
                spend: (sourceTotals['facebook-ads'].spend || 0).toFixed(2),
                impressions: sourceTotals['facebook-ads'].impressions || 0,
                clicks: sourceTotals['facebook-ads'].clicks || 0,
                conversions: sourceTotals['facebook-ads'].conversions || 0
            };
        }
    }

    return data;
};


export const askAi = async (req, res) => {
    let { question, conversationId, activeSources, siteId } = req.body;

    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);
    const dateExtractionPrompt = `Extract the specific date range mentioned in this user question: "${question}". Today's date is ${localISOTime}. If the user mentions 'today', 'last 10 days', 'yesterday' etc., calculate the exact 'startDate' and 'endDate' in YYYY-MM-DD format. If NO specific date timeframe is mentioned, return a broad range backward facing: {"startDate": "2023-01-01", "endDate": "${localISOTime}"}. Return ONLY a raw JSON strictly matching: {"startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD"}`;

    let startDate = '2023-01-01';
    let endDate = localISOTime;

    try {
        const extractionResult = await getAiResponse(dateExtractionPrompt);
        const parsed = JSON.parse(extractionResult.content.replace(/```json/i, '').replace(/```/g, '').trim());
        if (parsed.startDate && parsed.endDate) {
            startDate = parsed.startDate;
            endDate = parsed.endDate;
        }
    } catch (e) {
        console.error("Date Extraction Failed:", e);
    }

    const userId = req.user._id;
    const data = await fetchPlatformData(userId, startDate, endDate, siteId, activeSources);

    const prompt = promptBuilder.buildAskPrompt(question, data);

    let convId = conversationId;
    if (!convId) {
        const conv = await Conversation.create({
            userId: req.user._id,
            siteId: siteId || null,
            title: question.substring(0, 60),
            sources: activeSources
        });
        convId = conv._id;
    }


    await Message.create({ conversationId: convId, role: 'user', content: question });

    const aiResult = await getAiResponse(prompt);

    let cleanContent = aiResult.content
        .replace(/^[#\s]+(.+)$/gm, '$1')
        .replace(/\*\*?|__/g, '')
        .replace(/(\r?\n)*.*response is advisory only.*/gi, '')
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
    const { siteId } = req.query;
    const query = siteId ? { userId: req.user._id, siteId } : { userId: req.user._id };
    const convs = await Conversation.find(query).sort({ createdAt: -1 });
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
    const { siteId } = req.query;
    const query = siteId ? { userId: req.user._id, siteId, expiresAt: { $gt: new Date() } } : { userId: req.user._id, expiresAt: { $gt: new Date() } };
    const insight = await WeeklyInsight.findOne(query);
    if (insight) return res.status(200).json(insight);

    res.status(404).json({ message: 'No insight found. Please refresh.' });
};

export const refreshWeeklyInsight = async (req, res) => {
    const siteId = req.body.siteId || req.query.siteId;

    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const nowLocal = new Date(Date.now() - tzOffset);
    const dateRangeEnd = nowLocal.toISOString().split('T')[0];
    
    const sevenDaysAgo = new Date(nowLocal);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateRangeStart = sevenDaysAgo.toISOString().split('T')[0];

    const data = await fetchPlatformData(req.user._id, dateRangeStart, dateRangeEnd, siteId, []);

    const prompt = promptBuilder.buildWeeklyInsightPrompt(data);
    const aiResult = await getAiResponse(prompt);

    let cleanContent = aiResult.content
        .replace(/(\r?\n)*.*response is advisory only.*/gi, '')
        .trim();

    const sourceMap = { ga4: 'ga4', gsc: 'gsc', googleAds: 'google-ads', facebookAds: 'facebook-ads' };
    const discoveredSources = Object.keys(data).filter(k => sourceMap[k]).map(k => sourceMap[k]);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const insight = await WeeklyInsight.findOneAndUpdate(
        { userId: req.user._id, siteId: siteId || null },
        { 
            content: cleanContent, 
            sources: discoveredSources.length > 0 ? discoveredSources : ['ga4'],
            expiresAt 
        },
        { upsert: true, returnDocument: 'after' }
    );

    res.status(200).json(insight);
};

export const getSuggestedQuestions = async (req, res) => {
    const siteId = req.query.siteId || req.body.siteId;

    // Use timezone-aware logic for last 30 days
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const nowLocal = new Date(Date.now() - tzOffset);
    const dateRangeEnd = nowLocal.toISOString().split('T')[0];
    
    const thirtyDaysAgo = new Date(nowLocal);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateRangeStart = thirtyDaysAgo.toISOString().split('T')[0];

    const data = await fetchPlatformData(req.user._id, dateRangeStart, dateRangeEnd, siteId, []); 

    const prompt = promptBuilder.buildSuggestionsPrompt(data);
    const aiResult = await getAiResponse(prompt);

    let questions = [];
    try {
        const content = aiResult.content;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        questions = JSON.parse(jsonStr);
        if (!Array.isArray(questions)) questions = [];
    } catch (e) {
        console.error("AI Suggestions Parse Error:", e);
        questions = [
            "How is my ROI looking compared to last month?", 
            "Can you explain any recent traffic drops?", 
            "Which source is performing best lately?", 
            "What should I focus on for next week?"
        ];
    }

    res.status(200).json({ questions });
};
