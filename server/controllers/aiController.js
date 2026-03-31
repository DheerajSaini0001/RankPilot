import { callGemini, callGeminiStream } from '../services/geminiService.js';
import { createNotification } from '../utils/notification.js';

import promptBuilder from '../services/promptBuilder.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import WeeklyInsight from '../models/WeeklyInsight.js';
import UserAccounts from '../models/UserAccounts.js';
import DailyMetric from '../models/DailyMetric.js';

const getAiResponse = async (prompt) => {
    const start = Date.now();
    try {
        const result = await callGemini(prompt);
        result.latencyMs = Date.now() - start;
        return result;
    } catch (err) {
        console.error("Gemini AI Error:", err.message);
        const isQuotaError = err.message.includes('429');
        const error = new Error(isQuotaError 
            ? 'Gemini Quota Exceeded (429). Your daily free tier limit has been reached. Please wait a minute.' 
            : 'Gemini AI service is currently unavailable. Please try again later.');
        error.statusCode = isQuotaError ? 429 : 503;
        throw error;
    }
};

export const fetchPlatformData = async (userId, startDate, endDate, siteId, activeSources = []) => {

    if (!startDate || !endDate) {
        const tzOffset = (new Date()).getTimezoneOffset() * 60000;
        const nowLocal = new Date(Date.now() - tzOffset);
        if (!endDate) endDate = nowLocal.toISOString().split('T')[0];
        if (!startDate) {
            const date = new Date(nowLocal);
            date.setDate(date.getDate() - 90);
            startDate = date.toISOString().split('T')[0];
        }
    }

    let data = { startDate, endDate, today: new Date().toISOString().split('T')[0] };
    const query = siteId ? { _id: siteId, userId } : { userId };
    const userAcc = await UserAccounts.findOne(query).sort({ updatedAt: -1 });
    if (!userAcc) return data;

    const sourceMap = {
        'ga4': ['ga4'],
        'gsc': ['gsc'],
        'google-ads': ['google-ads'],
        'facebook-ads': ['facebook-ads']
    };
    const dbSources = activeSources.flatMap(s => sourceMap[s] || [s]);

    const dailyQuery = { 
        'metadata.userId': userId,
        date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };
    if (dbSources.length > 0) dailyQuery['metadata.source'] = { $in: dbSources };
    
    // Site-specific platform filter
    const platformIds = [];
    if (userAcc.ga4PropertyId) platformIds.push(userAcc.ga4PropertyId);
    if (userAcc.gscSiteUrl) platformIds.push(userAcc.gscSiteUrl);
    if (userAcc.googleAdsCustomerId) platformIds.push(userAcc.googleAdsCustomerId);
    if (userAcc.facebookAdAccountId) platformIds.push(userAcc.facebookAdAccountId);
    if (platformIds.length > 0) dailyQuery['metadata.platformAccountId'] = { $in: platformIds };

    const dailyLogs = await DailyMetric.find(dailyQuery).sort({ date: 1 });

    if (dailyLogs.length > 0) {
        const aggregated = {};
        const sourceTotals = {};
        const sourceEntryCount = {};
        
        // Dimension tracking
        const dimensions = {
            queries: {}, 
            pages: {}, 
            pageQueryMap: {}, // { pagePath: { query: count } }
            campaigns: {},
            devices: {},
            channels: {}
        };

        dailyLogs.forEach(log => {
            const source = log.metadata.source;
            const dateStr = log.date.toISOString().split('T')[0];
            const key = `${source}_${dateStr}`;
            
            if (!sourceTotals[source]) {
                sourceTotals[source] = {};
                sourceEntryCount[source] = 0;
            }
            sourceEntryCount[source] += 1;

            // Daily Aggregation
            if (!aggregated[key]) {
                aggregated[key] = { source, date: dateStr, metrics: { ...log.metrics }, count: 1 };
            } else {
                aggregated[key].count += 1;
                Object.keys(log.metrics).forEach(m => {
                    if (typeof log.metrics[m] === 'number') {
                        aggregated[key].metrics[m] = (aggregated[key].metrics[m] || 0) + log.metrics[m];
                    }
                });
            }

            // Overall Range Totals
            Object.keys(log.metrics).forEach(m => {
                if (typeof log.metrics[m] === 'number') {
                    sourceTotals[source][m] = (sourceTotals[source][m] || 0) + log.metrics[m];
                }
            });

            // Dimension Aggregation (from metadata)
            if (log.metadata && log.metadata.dimensions) {
                const d = log.metadata.dimensions;
                const m = log.metrics;
                
                if (d.query) {
                    if (!dimensions.queries[d.query]) dimensions.queries[d.query] = { clicks: 0, impressions: 0, positionSum: 0, count: 0 };
                    dimensions.queries[d.query].clicks += (m.clicks || 0);
                    dimensions.queries[d.query].impressions += (m.impressions || 0);
                    if (m.position !== undefined) {
                      dimensions.queries[d.query].positionSum += m.position;
                      dimensions.queries[d.query].count += 1;
                    }
                }
                
                if (d.page || d.pagePath) {
                    let page = d.page || d.pagePath;
                    
                    // Normalize URL to Path (GSC often gives full URLs, GA4 gives relative paths)
                    if (page.startsWith('http')) {
                        try {
                            const urlObj = new URL(page);
                            page = urlObj.pathname || '/';
                        } catch (e) {
                            // If invalid URL, use as is or try to fallback
                            if (page.includes('://')) page = '/' + page.split('://')[1].split('/').slice(1).join('/');
                        }
                    }
                    if (page === '') page = '/';

                    if (!dimensions.pages[page]) dimensions.pages[page] = { sessions: 0, bounceRateSum: 0, gscClicks: 0, gscImpressions: 0, gscPositionSum: 0, gscCount: 0, count: 0 };
                    
                    // GA4 Side
                    dimensions.pages[page].sessions += (m.sessions || 0);
                    if (m.bounceRate !== undefined) {
                        dimensions.pages[page].bounceRateSum += m.bounceRate;
                        dimensions.pages[page].count += 1;
                    }
                    // GSC Side
                    dimensions.pages[page].gscClicks += (m.clicks || 0);
                    dimensions.pages[page].gscImpressions += (m.impressions || 0);
                    if (source === 'gsc' && m.position !== undefined) {
                        dimensions.pages[page].gscPositionSum += m.position;
                        dimensions.pages[page].gscCount += 1;
                    }

                    // Map Query to Normalized Page Path
                    if (d.query) {
                        if (!dimensions.pageQueryMap[page]) dimensions.pageQueryMap[page] = {};
                        dimensions.pageQueryMap[page][d.query] = (dimensions.pageQueryMap[page][d.query] || 0) + (m.clicks || m.impressions || 0);
                    }
                }
                
                if (d.campaign) dimensions.campaigns[d.campaign] = (dimensions.campaigns[d.campaign] || 0) + (m.conversions || m.clicks || 0);
                if (d.device) dimensions.devices[d.device] = (dimensions.devices[d.device] || 0) + (m.sessions || m.clicks || 0);
                if (d.channel) dimensions.channels[d.channel] = (dimensions.channels[d.channel] || 0) + (m.sessions || 0);
            }
        });

        // Formatting for top dimensions
        data.topDimensions = {
            queries: Object.entries(dimensions.queries)
                .sort((a,b) => b[1].clicks - a[1].clicks)
                .slice(0, 10)
                .map(([name, stats]) => ({ 
                    name, 
                    clicks: stats.clicks, 
                    impressions: stats.impressions,
                    ctr: stats.impressions > 0 ? ((stats.clicks / stats.impressions) * 100).toFixed(2) : 0,
                    position: stats.count > 0 ? (stats.positionSum / stats.count).toFixed(1) : 'N/A'
                })),
            pages: Object.entries(dimensions.pages)
                .sort((a,b) => (b[1].sessions + b[1].gscClicks) - (a[1].sessions + a[1].gscClicks))
                .slice(0, 10)
                .map(([name, stats]) => {
                    // Extract top 3 keywords for this page
                    const pageQueries = Object.entries(dimensions.pageQueryMap[name] || {})
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([q]) => q);

                    return { 
                        name, 
                        sessions: stats.sessions, 
                        bounceRate: stats.count > 0 ? (stats.bounceRateSum / stats.count).toFixed(2) : 'N/A',
                        gscClicks: stats.gscClicks,
                        gscImpressions: stats.gscImpressions,
                        gscPosition: stats.gscCount > 0 ? (stats.gscPositionSum / stats.gscCount).toFixed(1) : 'N/A',
                        topKeywords: pageQueries.join(', ')
                    };
                }),
            campaigns: Object.entries(dimensions.campaigns)
                .sort((a,b) => b[1] - a[1])
                .slice(0, 10)
                .map(([name, value]) => ({ name, value })),
            devices: Object.entries(dimensions.devices)
                .sort((a,b) => b[1] - a[1])
                .map(([name, value]) => ({ name, value })),
            channels: Object.entries(dimensions.channels)
                .sort((a,b) => b[1] - a[1])
                .map(([name, value]) => ({ name, value }))
        };

        // Format Daily Breakdown for AI with proper averaging for ratios
        data.dailyBreakdown = Object.values(aggregated).reduce((acc, item) => {
            if (!acc[item.source]) acc[item.source] = [];
            
            // Average metrics that should not be summed
            const avgMetrics = ['position', 'ctr', 'bounceRate', 'avgSessionDuration', 'engagementRate', 'frequency', 'cpc', 'cpm', 'searchImpressionShare'];
            const finalMetrics = { ...item.metrics };
            
            avgMetrics.forEach(m => {
                if (finalMetrics[m] !== undefined && typeof finalMetrics[m] === 'number') {
                    finalMetrics[m] = parseFloat((finalMetrics[m] / item.count).toFixed(2));
                }
            });

            acc[item.source].push({ date: item.date, metrics: finalMetrics });
            return acc;
        }, {});

        // Build Totals with safe averaging
        if (sourceTotals['ga4']) {
            const count = sourceEntryCount['ga4'];
            data.ga4 = {
                users: sourceTotals['ga4'].users || 0,
                sessions: sourceTotals['ga4'].sessions || 0,
                pageViews: sourceTotals['ga4'].pageViews || 0,
                revenue: (sourceTotals['ga4'].revenue || 0).toFixed(2),
                transactions: sourceTotals['ga4'].transactions || 0,
                bounceRate: (sourceTotals['ga4'].bounceRate / count || 0).toFixed(2),
                avgSessionDuration: (sourceTotals['ga4'].avgSessionDuration / count || 0).toFixed(1),
                engagementRate: (sourceTotals['ga4'].engagementRate / count || 0).toFixed(2),
                engagedSessions: sourceTotals['ga4'].engagedSessions || 0
            };
        }
        if (sourceTotals['gsc']) {
            const count = sourceEntryCount['gsc'];
            data.gsc = {
                clicks: sourceTotals['gsc'].clicks || 0,
                impressions: sourceTotals['gsc'].impressions || 0,
                position: (sourceTotals['gsc'].position / count || 0).toFixed(1),
                ctr: (sourceTotals['gsc'].ctr / count || 0).toFixed(2)
            };
        }
        if (sourceTotals['google-ads']) {
            data.googleAds = {
                currencyCode: userAcc.googleAdsCurrencyCode || '$',
                spend: (sourceTotals['google-ads'].spend || 0).toFixed(2),
                impressions: sourceTotals['google-ads'].impressions || 0,
                clicks: sourceTotals['google-ads'].clicks || 0,
                conversions: sourceTotals['google-ads'].conversions || 0,
                conversionValue: (sourceTotals['google-ads'].conversionValue || 0).toFixed(2),
                cpc: (sourceTotals['google-ads'].cpc / count || 0).toFixed(2),
                cpm: (sourceTotals['google-ads'].cpm / count || 0).toFixed(2),
                ctr: (sourceTotals['google-ads'].ctr / count || 0).toFixed(2),
                searchImpressionShare: (sourceTotals['google-ads'].searchImpressionShare / count || 0).toFixed(2)
            };
        }
        if (sourceTotals['facebook-ads']) {
            data.facebookAds = {
                currency: userAcc.facebookAdCurrency || '$',
                spend: (sourceTotals['facebook-ads'].spend || 0).toFixed(2),
                impressions: sourceTotals['facebook-ads'].impressions || 0,
                clicks: sourceTotals['facebook-ads'].clicks || 0,
                conversions: sourceTotals['facebook-ads'].conversions || 0,
                reach: sourceTotals['facebook-ads'].reach || 0,
                landingPageViews: sourceTotals['facebook-ads'].landing_page_views || 0,
                linkClicks: sourceTotals['facebook-ads'].link_clicks || 0,
                cpc: (sourceTotals['facebook-ads'].cpc / count || 0).toFixed(2),
                cpm: (sourceTotals['facebook-ads'].cpm / count || 0).toFixed(2),
                ctr: (sourceTotals['facebook-ads'].ctr / count || 0).toFixed(2)
            };
        }
    }

    return data;
};


export const askAi = async (req, res) => {
    let { question, conversationId, activeSources, siteId, history } = req.body;

    // Sanitize history — keep last 10 turns max to avoid token overflow
    const chatHistory = Array.isArray(history)
        ? history.slice(-10)
        : [];

    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const now = new Date(Date.now() - tzOffset);
    const localISOTime = now.toISOString().slice(0, 10);
    
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 90);
    const fallbackStart = defaultStart.toISOString().slice(0, 10);

    const dateExtractionPrompt = `Extract the date range for this question: "${question}". Today is ${localISOTime}.
    If the user mentions 'today', 'last 10 days', 'yesterday' etc., calculate the exact 'startDate' and 'endDate'.
    IMPORTANT: If the user asks to "compare" with another period (e.g. "compare last 10 days to last month"), provide a wide 'startDate' that COVERS BOTH periods.
    Return ONLY JSON: {"startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD"}.
    Fallback if no date is mentioned: {"startDate": "${fallbackStart}", "endDate": "${localISOTime}"}`;

    let startDate = fallbackStart;
    let endDate = localISOTime;

    try {
        const extractionResult = await getAiResponse(dateExtractionPrompt);
        const jsonMatch = extractionResult.content.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : extractionResult.content);
        if (parsed.startDate && parsed.endDate) {
            startDate = parsed.startDate;
            endDate = parsed.endDate;
        }
    } catch (e) {
        console.error("Date Extraction Failed:", e);
    }

    const userId = req.user._id;
    const data = await fetchPlatformData(userId, startDate, endDate, siteId, activeSources);

    const prompt = promptBuilder.buildAskPrompt(question, data, chatHistory);

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

    // Enable SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullContent = "";
    try {
        const streamResult = await callGeminiStream(prompt, (chunk) => {
            fullContent += chunk;
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        });

        const cleanContent = fullContent
            .replace(/(\r?\n)*.*response is advisory only.*/gi, '')
            .trim();

        const aiMsg = await Message.create({
            conversationId: convId,
            role: 'assistant',
            content: cleanContent,
            model: streamResult.model,
            latencyMs: Date.now() - now
        });

        res.write(`data: ${JSON.stringify({ done: true, conversationId: convId, messageId: aiMsg._id, answer: cleanContent })}\n\n`);
        res.end();
    } catch (err) {
        console.error("Streaming AI Error:", err);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
    }
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

export const generateWeeklyInsightInternal = async (userId, siteId) => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const nowLocal = new Date(Date.now() - tzOffset);
    const dateRangeEnd = nowLocal.toISOString().split('T')[0];
    
    const sevenDaysAgo = new Date(nowLocal);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateRangeStart = sevenDaysAgo.toISOString().split('T')[0];

    const data = await fetchPlatformData(userId, dateRangeStart, dateRangeEnd, siteId, []);

    const prompt = promptBuilder.buildWeeklyInsightPrompt(data);
    
    try {
        const aiResult = await getAiResponse(prompt);
        let cleanContent = aiResult.content
            .replace(/(\r?\n)*.*response is advisory only.*/gi, '')
            .trim();

        const sourceMap = { ga4: 'ga4', gsc: 'gsc', googleAds: 'google-ads', facebookAds: 'facebook-ads' };
        const discoveredSources = Object.keys(data).filter(k => sourceMap[k]).map(k => sourceMap[k]);

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const insight = await WeeklyInsight.findOneAndUpdate(
            { userId: userId, siteId: siteId || null },
            { 
                content: cleanContent, 
                sources: discoveredSources.length > 0 ? discoveredSources : ['ga4'],
                expiresAt 
            },
            { upsert: true, returnDocument: 'after' }
        );

        // Notify user about new AI Insight
        await createNotification(userId, {
            type: 'info',
            title: 'Weekly AI Insight Ready',
            message: 'Your weekly performance analysis is ready. See what changed and what to optimize next.',
            source: 'ai',
            actionLabel: 'View Insight',
            actionPath: '/dashboard/ai-chat'
        });

        return insight;

    } catch (err) {
        throw err;
    }
};

export const refreshWeeklyInsight = async (req, res) => {
    try {
        const siteId = req.body.siteId || req.query.siteId;
        const insight = await generateWeeklyInsightInternal(req.user._id, siteId);
        res.status(200).json(insight);
    } catch (err) {
        res.status(err.statusCode || 503).json({ message: err.message });
    }
};

export const generateSuggestedQuestionsInternal = async (userId, siteId) => {
    try {
        const tzOffset = (new Date()).getTimezoneOffset() * 60000;
        const nowLocal = new Date(Date.now() - tzOffset);
        const dateRangeEnd = nowLocal.toISOString().split('T')[0];
        
        const thirtyDaysAgo = new Date(nowLocal);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateRangeStart = thirtyDaysAgo.toISOString().split('T')[0];

        const data = await fetchPlatformData(userId, dateRangeStart, dateRangeEnd, siteId, []); 

        const prompt = promptBuilder.buildSuggestionsPrompt(data);
        const aiResult = await getAiResponse(prompt);

        let questions = [];
        const fallbacks = [
            "Find keywords with high impressions but low CTR.",
            "Identify GA4 conversion leaks in my funnel.",
            "Which Google Ads campaigns have highest ROI?",
            "Compare ROAS across Meta Ads audiences."
        ];

        try {
            const content = aiResult.content;
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            const jsonStr = jsonMatch ? jsonMatch[0] : content;
            questions = JSON.parse(jsonStr);
            if (!Array.isArray(questions)) questions = [];
        } catch (e) {
            console.error("AI Suggestions Parse Error:", e);
            questions = fallbacks;
        }

        // Ensure exactly 4 questions
        if (questions.length < 4) {
            questions = [...questions, ...fallbacks.slice(questions.length)].slice(0, 4);
        } else {
            questions = questions.slice(0, 4);
        }

        // Save to DB
        await UserAccounts.findOneAndUpdate(
            { _id: siteId, userId },
            { 
                suggestedQuestions: questions, 
                suggestedQuestionsUpdatedAt: new Date() 
            }
        );

        return questions;
    } catch (err) {
        console.error("Internal Suggested Questions Error:", err.message);
        return [];
    }
};

export const getSuggestedQuestions = async (req, res) => {
    const siteId = req.query.siteId || req.body.siteId;
    const userId = req.user._id;

    try {
        const userAcc = await UserAccounts.findOne({ _id: siteId, userId });
        
        if (userAcc && userAcc.suggestedQuestions && userAcc.suggestedQuestions.length > 0) {
            // Check if updated in the last 24 hours
            const yesterday = new Date();
            yesterday.setHours(yesterday.getHours() - 24);
            
            if (userAcc.suggestedQuestionsUpdatedAt && userAcc.suggestedQuestionsUpdatedAt > yesterday) {
                return res.status(200).json({ questions: userAcc.suggestedQuestions });
            }
        }

        // Generate and save (if not found or stale)
        const questions = await generateSuggestedQuestionsInternal(userId, siteId);
        res.status(200).json({ questions });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching suggested questions' });
    }
};
