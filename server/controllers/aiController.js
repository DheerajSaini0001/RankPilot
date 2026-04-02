import { startAgenticChat } from '../services/geminiService.js';
import { createNotification } from '../utils/notification.js';

import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import WeeklyInsight from '../models/WeeklyInsight.js';
import UserAccounts from '../models/UserAccounts.js';
import DailyMetric from '../models/DailyMetric.js';
import fs from 'fs';
import path from 'path';

// Tools Configuration
const aiTools = [
    {
        name: "get_market_data",
        description: "Fetch comprehensive analytics (GA4), search performance (GSC), and PPC data (Google/Meta Ads). This tool provides Comparative Intelligence (Current vs Previous period) and starts multidimensional breakdowns for top queries, pages, and campaigns. Use it for performance audits, identifying growth/decline, and anomaly detection.",
        parameters: {
            type: "OBJECT",
            properties: {
                startDate: { type: "STRING", description: "Start date in YYYY-MM-DD format. Crucial for trend analysis." },
                endDate: { type: "STRING", description: "End date in YYYY-MM-DD format." },
                sources: { 
                    type: "ARRAY", 
                    items: { type: "STRING" }, 
                    description: "List of sources: 'ga4', 'gsc', 'google-ads', 'facebook-ads'. If empty, fetches all available platforms for a holistic audit." 
                }
            },
            required: ["startDate", "endDate"]
        }
    }
];

// Tool Executor
const executeTool = async (name, args, userId, siteId) => {
    if (name === "get_market_data") {
        return await fetchPlatformData(userId, args.startDate, args.endDate, siteId, args.sources || []);
    }
    return { error: "Unknown tool" };
};

export const fetchPlatformData = async (userId, startDate, endDate, siteId, activeSources = []) => {
    // Safety: Handle if AI sends a single string instead of an array
    const sourceList = Array.isArray(activeSources) ? activeSources : (activeSources ? [activeSources] : []);

    // Normalizing sources for AI reliability (handles spaces, underscores, and casing)
    const normalizedActiveSources = sourceList.map(s => String(s).toLowerCase().trim().replace(/[\s_]/g, '-'));

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

    // --- High-Level Intelligence: Calculate Comparison Range (Previous Period) ---
    const currentStart = new Date(startDate);
    const currentEnd = new Date(endDate);
    const daysDiff = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 3600 * 24)) + 1;
    
    const prevEnd = new Date(currentStart);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - daysDiff + 1);

    const prevStartStr = prevStart.toISOString().split('T')[0];
    const prevEndStr = prevEnd.toISOString().split('T')[0];
    data.comparisonRange = { startDate: prevStartStr, endDate: prevEndStr };

    const sourceMap = {
        'ga4': ['ga4'],
        'gsc': ['gsc'],
        'google-ads': ['google-ads'],
        'facebook-ads': ['facebook-ads']
    };
    const dbSources = normalizedActiveSources.flatMap(s => sourceMap[s] || [s]);

    // Fetch BOTH current and previous period logs
    const dailyQuery = { 
        'metadata.userId': userId,
        date: { $gte: prevStart, $lte: currentEnd }
    };
    if (dbSources.length > 0) dailyQuery['metadata.source'] = { $in: dbSources };
    
    const platformIds = [];
    if (userAcc.ga4PropertyId) platformIds.push(userAcc.ga4PropertyId);
    if (userAcc.gscSiteUrl) platformIds.push(userAcc.gscSiteUrl);
    if (userAcc.googleAdsCustomerId) platformIds.push(userAcc.googleAdsCustomerId);
    if (userAcc.facebookAdAccountId) platformIds.push(userAcc.facebookAdAccountId);
    if (platformIds.length > 0) dailyQuery['metadata.platformAccountId'] = { $in: platformIds };

    // --- High-Performance Intelligence Architecture: MongoDB Aggregation Pipeline ---
    // Instead of fetching all logs into JS memory (OOM Risk), we aggregate at the DB level.
    const pipeline = [
        { $match: dailyQuery },
        {
            $facet: {
                // 1. Comparative Totals: Current vs Previous period per source
                "totals": [
                    {
                        $group: {
                            _id: {
                                source: "$metadata.source",
                                isCurrent: { $gte: ["$date", currentStart] }
                            },
                            metrics: {
                                $push: "$metrics" // Temporary push to evaluate all metrics
                            },
                        }
                    },
                    {
                        $project: {
                            source: "$_id.source",
                            period: { $cond: ["$_id.isCurrent", "current", "previous"] },
                            // Dynamically sum all numeric metrics found in the logs
                            // We use a reducer to handle the flexible metrics schema of DailyMetric
                            sums: {
                                $arrayToObject: {
                                    $map: {
                                        input: { $setUnion: { $reduce: { input: "$metrics", initialValue: [], in: { $concatArrays: ["$$value", { $map: { input: { $objectToArray: "$$this" }, as: "m", in: "$$m.k" } }] } } } },
                                        as: "metricName",
                                        in: {
                                            k: "$$metricName",
                                            v: { $sum: { $map: { input: "$metrics", as: "m", in: { $ifNull: [{ $getField: { field: "$$metricName", input: "$$m" } }, 0] } } } }
                                        }
                                    }
                                }
                            },
                            counts: { $size: "$metrics" }
                        }
                    }
                ],
                // 2. Daily Breakdown: Day-by-day metrics for the Current period
                "dailyBreakdown": [
                    { $match: { date: { $gte: currentStart } } },
                    {
                        $group: {
                            _id: {
                                date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                                source: "$metadata.source"
                            },
                            metrics: { $push: "$metrics" },
                            count: { $sum: 1 }
                        }
                    },
                    {
                        $project: {
                            date: "$_id.date",
                            source: "$_id.source",
                            count: "$count",
                            metrics: {
                                $arrayToObject: {
                                    $map: {
                                        input: { $setUnion: { $reduce: { input: "$metrics", initialValue: [], in: { $concatArrays: ["$$value", { $map: { input: { $objectToArray: "$$this" }, as: "m", in: "$$m.k" } }] } } } },
                                        as: "metricName",
                                        in: {
                                            k: "$$metricName",
                                            v: {
                                                $cond: [
                                                    { $in: ["$$metricName", ['position', 'ctr', 'bounceRate', 'avgSessionDuration', 'engagementRate', 'frequency', 'cpc', 'cpm', 'searchImpressionShare']] },
                                                    { $divide: [{ $sum: { $map: { input: "$metrics", as: "m", in: { $ifNull: [{ $getField: { field: "$$metricName", input: "$$m" } }, 0] } } } }, "$count"] },
                                                    { $sum: { $map: { input: "$metrics", as: "m", in: { $ifNull: [{ $getField: { field: "$$metricName", input: "$$m" } }, 0] } } } }
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    { $sort: { date: 1 } }
                ],
                // 3. Top Queries: Search Console dominance
                "topQueries": [
                    { $match: { date: { $gte: currentStart }, "metadata.source": "gsc" } },
                    {
                        $group: {
                            _id: "$metadata.dimensions.query",
                            clicks: { $sum: { $ifNull: ["$metrics.clicks", 0] } },
                            impressions: { $sum: { $ifNull: ["$metrics.impressions", 0] } },
                            positionSum: { $sum: { $ifNull: ["$metrics.position", 0] } },
                            count: { $sum: { $cond: [{ $gt: ["$metrics.position", 0] }, 1, 0] } }
                        }
                    },
                    { $sort: { clicks: -1 } },
                    { $limit: 10 },
                    {
                        $project: {
                            name: "$_id",
                            clicks: 1,
                            impressions: 1,
                            ctr: { $cond: ["$impressions", { $multiply: [{ $divide: ["$clicks", "$impressions"] }, 100] }, 0] },
                            position: { $cond: ["$count", { $divide: ["$positionSum", "$count"] }, 0] }
                        }
                    }
                ],
                // 4. Top Pages: Unified Analytics & Search
                "topPages": [
                    { $match: { date: { $gte: currentStart } } },
                    {
                        $group: {
                            _id: { $ifNull: ["$metadata.dimensions.page", "$metadata.dimensions.pagePath"] },
                            sessions: { $sum: { $ifNull: ["$metrics.sessions", 0] } },
                            gscClicks: { $sum: { $ifNull: ["$metrics.clicks", 0] } },
                            gscImpressions: { $sum: { $ifNull: ["$metrics.impressions", 0] } },
                            bounceRateSum: { $sum: { $ifNull: ["$metrics.bounceRate", 0] } },
                            bounceRateCount: { $sum: { $cond: [{ $gt: ["$metrics.bounceRate", 0] }, 1, 0] } },
                            gscPositionSum: { $sum: { $ifNull: ["$metrics.position", 0] } },
                            gscPositionCount: { $sum: { $cond: [{ $and: [{ $eq: ["$metadata.source", "gsc"] }, { $gt: ["$metrics.position", 0] }] }, 1, 0] } }
                        }
                    },
                    { $addFields: { totalSignal: { $add: ["$sessions", "$gscClicks"] } } },
                    { $sort: { totalSignal: -1 } },
                    { $limit: 10 },
                    {
                        $project: {
                            name: "$_id",
                            sessions: 1,
                            gscClicks: 1,
                            gscImpressions: 1,
                            bounceRate: { $cond: ["$bounceRateCount", { $divide: ["$bounceRateSum", "$bounceRateCount"] }, 0] },
                            gscPosition: { $cond: ["$gscPositionCount", { $divide: ["$gscPositionSum", "$gscPositionCount"] }, 0] }
                        }
                    }
                ],
                // 5. Campaigns, Devices, Channels
                "topCampaigns": [
                    { $match: { date: { $gte: currentStart }, "metadata.dimensions.campaign": { $exists: true } } },
                    { $group: { _id: "$metadata.dimensions.campaign", value: { $sum: { $add: [{ $ifNull: ["$metrics.conversions", 0] }, { $ifNull: ["$metrics.clicks", 0] }] } } } },
                    { $sort: { value: -1 } }, { $limit: 10 }, { $project: { name: "$_id", value: 1 } }
                ],
                "topDevices": [
                    { $match: { date: { $gte: currentStart }, "metadata.dimensions.device": { $exists: true } } },
                    { $group: { _id: "$metadata.dimensions.device", value: { $sum: { $add: [{ $ifNull: ["$metrics.sessions", 0] }, { $ifNull: ["$metrics.clicks", 0] }] } } } },
                    { $sort: { value: -1 } }, { $project: { name: "$_id", value: 1 } }
                ],
                "topChannels": [
                    { $match: { date: { $gte: currentStart }, "metadata.dimensions.channel": { $exists: true } } },
                    { $group: { _id: "$metadata.dimensions.channel", value: { $sum: { $ifNull: ["$metrics.sessions", 0] } } } },
                    { $sort: { value: -1 } }, { $project: { name: "$_id", value: 1 } }
                ]
            }
        }
    ];

    const [results] = await DailyMetric.aggregate(pipeline);

    if (results) {
        const sourceTotals = { current: {}, previous: {} };
        const sourceEntryCount = { current: {}, previous: {} };

        // Process Totals
        results.totals.forEach(t => {
            sourceTotals[t.period][t.source] = t.sums;
            sourceEntryCount[t.period][t.source] = t.counts;
        });

        const getGrowth = (curr, prev) => {
            if (!prev || prev === 0) return curr > 0 ? "100.0" : "0.0";
            return (((curr - prev) / prev) * 100).toFixed(1);
        };

        // Format Daily Breakdown
        data.dailyBreakdown = results.dailyBreakdown.reduce((acc, item) => {
            if (!acc[item.source]) acc[item.source] = [];
            acc[item.source].push({ date: item.date, metrics: item.metrics });
            return acc;
        }, {});

        // Format Dimensions with rounding
        data.topDimensions = {
            queries: results.topQueries.map(q => ({ ...q, ctr: q.ctr.toFixed(2), position: q.position.toFixed(1) })),
            pages: results.topPages.map(p => ({ ...p, bounceRate: p.bounceRate.toFixed(2), gscPosition: p.gscPosition.toFixed(1) })),
            campaigns: results.topCampaigns,
            devices: results.topDevices,
            channels: results.topChannels
        };

        // Build Platform Specific Totals with Growth Comparison
        if (sourceTotals.current['ga4']) {
            const curr = sourceTotals.current['ga4'];
            const prev = sourceTotals.previous['ga4'] || {};
            const count = sourceEntryCount.current['ga4'];
            data.ga4 = {
                users: Math.round(curr.users || 0),
                usersGrowth: getGrowth(curr.users, prev.users),
                sessions: Math.round(curr.sessions || 0),
                sessionsGrowth: getGrowth(curr.sessions, prev.sessions),
                pageViews: Math.round(curr.pageViews || 0),
                revenue: (curr.revenue || 0).toFixed(2),
                revenueGrowth: getGrowth(curr.revenue, prev.revenue),
                transactions: curr.transactions || 0,
                engagementRate: (curr.engagementRate / count || 0).toFixed(2),
                bounceRate: (curr.bounceRate / count || 0).toFixed(2)
            };
        }
        if (sourceTotals.current['gsc']) {
            const curr = sourceTotals.current['gsc'];
            const prev = sourceTotals.previous['gsc'] || {};
            const count = sourceEntryCount.current['gsc'];
            data.gsc = {
                clicks: curr.clicks || 0,
                clicksGrowth: getGrowth(curr.clicks, prev.clicks),
                impressions: curr.impressions || 0,
                impressionsGrowth: getGrowth(curr.impressions, prev.impressions),
                position: (curr.position / count || 0).toFixed(1),
                ctr: (curr.ctr / count || 0).toFixed(2)
            };
        }
        if (sourceTotals.current['google-ads']) {
            const curr = sourceTotals.current['google-ads'];
            const prev = sourceTotals.previous['google-ads'] || {};
            const count = sourceEntryCount.current['google-ads'];
            data.googleAds = {
                spend: (curr.spend || 0).toFixed(2),
                spendGrowth: getGrowth(curr.spend, prev.spend),
                clicks: curr.clicks || 0,
                clicksGrowth: getGrowth(curr.clicks, prev.clicks),
                conversions: curr.conversions || 0,
                conversionsGrowth: getGrowth(curr.conversions, prev.conversions),
                conversionValue: (curr.conversionValue || 0).toFixed(2),
                ctr: (curr.ctr / count || 0).toFixed(2)
            };
        }
        if (sourceTotals.current['facebook-ads']) {
            const curr = sourceTotals.current['facebook-ads'];
            const prev = sourceTotals.previous['facebook-ads'] || {};
            const count = sourceEntryCount.current['facebook-ads'];
            data.facebookAds = {
                spend: (curr.spend || 0).toFixed(2),
                spendGrowth: getGrowth(curr.spend, prev.spend),
                clicks: curr.clicks || 0,
                clicksGrowth: getGrowth(curr.clicks, prev.clicks),
                conversions: curr.conversions || 0,
                conversionsGrowth: getGrowth(curr.conversions, prev.conversions),
                ctr: (curr.ctr / count || 0).toFixed(2)
            };
        }
    }

    return data;
};

export const askAi = async (req, res) => {
    let { question, conversationId, siteId, history } = req.body;
    const userId = req.user._id;

    // Prepare Sanitized History for Gemini (Prevents Token Limit Crashes)
    // We take the last 8 messages and cap their length to ensure we don't blow the context window
    const chatHistory = (history || [])
        .slice(-8) 
        .map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: String(msg.content || "").substring(0, 4000) }] 
        }));

    // Load System Instruction
    let systemIns = "";
    try {
        systemIns = fs.readFileSync(path.join(process.cwd(), 'server', 'prompts', 'system.txt'), 'utf8');
    } catch (e) {
        systemIns = fs.readFileSync(path.join(process.cwd(), 'prompts', 'system.txt'), 'utf8');
    }

    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const nowLocal = new Date(Date.now() - tzOffset);
    const todayStr = nowLocal.toISOString().split('T')[0];
    const dateContext = `\n\n[REAL-TIME CONTEXT]: Today's date is ${todayStr}. Use this for all relative date calculations.`;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    let convId = conversationId;

    try {
        // 1. Ensure Conversation exists
        if (!convId) {
            const conv = await Conversation.create({
                userId, siteId: siteId || null, title: question.substring(0, 60)
            });
            convId = conv._id;
        }

        // 2. Save User Message Immediately
        await Message.create({ conversationId: convId, role: 'user', content: question });

        const chat = await startAgenticChat(chatHistory, aiTools, systemIns + dateContext);
        
        let result = await chat.sendMessage(question);
        let response = result.response;
        
        // Handle Tool Calls Loop 
        let iteration = 0;
        while (response.functionCalls()?.length > 0 && iteration < 5) {
            iteration++;
            const calls = response.functionCalls();
            const toolResponses = [];
            
            for (const call of calls) {
                const data = await executeTool(call.name, call.args, userId, siteId);
                
                toolResponses.push({
                    functionResponse: {
                        name: call.name,
                        response: { content: data }
                    }
                });
            }
            
            result = await chat.sendMessage(toolResponses);
            response = result.response;
        }

        let finalContent = "";
        try {
            finalContent = response.text()
                .replace(/(\r?\n)*.*response is advisory only.*/gi, '')
                .replace(/\*/g, '') 
                .trim();
        } catch (e) {
            console.error("Gemini response text error:", e);
            finalContent = "I'm sorry, I was unable to process your request at this moment. Please try rephrasing your question.";
        }

        // 3. Save Assistant Message Successfully
        const aiMsg = await Message.create({
            conversationId: convId,
            role: 'assistant',
            content: finalContent,
            model: "gemini-2.5-flash",
            latencyMs: Date.now() - nowLocal
        });

        // Send final response
        res.write(`data: ${JSON.stringify({ chunk: finalContent })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true, conversationId: convId, messageId: aiMsg._id, answer: finalContent })}\n\n`);
        res.end();

    } catch (err) {
        console.error("Agentic AI Loop Error:", err);
        
        // Elite Error Cleaning: Turn technical jargon into human-friendly instructions
        const getFriendlyError = (err) => {
            const msg = err?.message || "";
            if (msg.includes('429') || msg.includes('Quota')) {
                return "The AI is currently catching its breath due to high demand. 🧘‍♂️ Please wait about **60 seconds** and try your question again.";
            }
            if (msg.includes('getaddrinfo') || msg.includes('ENOTFOUND') || msg.includes('redis') || msg.includes('connect')) {
                return "The analytics engine is having a momentary connection glitch. 🔌 Our team has been notified. Please try again in 2-3 minutes.";
            }
            if (msg.includes('API_KEY_INVALID') || msg.includes('auth')) {
                return "There's a configuration issue with the AI's credentials. 🔑 Please contact support to restore access.";
            }
            if (msg.includes('safety') || msg.includes('blocked')) {
                return "This request falls outside our safety guidelines. 🛡️ Please rephrase your question to be more marketing-focused.";
            }
            return "Something unexpected happened in our AI engine. 🔧 A quick refresh of the page usually fix this!";
        };

        const friendlyMsg = getFriendlyError(err);
        const errorMessage = `### 💌 A Quick Note\n\n${friendlyMsg}\n\n---\n*Technical ID: ${err?.message?.substring(0, 50) || "Unknown"}*`;
        
        if (convId) {
            await Message.create({
                conversationId: convId,
                role: 'assistant',
                content: errorMessage,
                isError: true,
                model: "system-error"
            });
        }

        res.write(`data: ${JSON.stringify({ 
            error: errorMessage, 
            conversationId: convId 
        })}\n\n`);
        res.end();
    }
}

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
    const todayStr = nowLocal.toISOString().split('T')[0];
    
    // Load System and Insight Prompts
    let systemIns = "";
    let insightPrompt = "";
    try {
        systemIns = fs.readFileSync(path.join(process.cwd(), 'server', 'prompts', 'system.txt'), 'utf8');
        insightPrompt = fs.readFileSync(path.join(process.cwd(), 'server', 'prompts', 'weekly-insight.txt'), 'utf8');
    } catch (e) {
        systemIns = fs.readFileSync(path.join(process.cwd(), 'prompts', 'system.txt'), 'utf8');
        insightPrompt = fs.readFileSync(path.join(process.cwd(), 'prompts', 'weekly-insight.txt'), 'utf8');
    }

    const dateContext = `\n\n[REAL-TIME CONTEXT]: Today's date is ${todayStr}. Generate a performance insight for the LAST 7 DAYS.`;
    
    try {
        const chat = await startAgenticChat([], aiTools, systemIns + dateContext);
        
        // Initial command to start the analysis
        let result = await chat.sendMessage(insightPrompt);
        let response = result.response;

        // Tool Loop for data
        let iteration = 0;
        while (response.functionCalls()?.length > 0 && iteration < 3) {
            iteration++;
            const calls = response.functionCalls();
            const toolResponses = [];
            for (const call of calls) {
                const data = await executeTool(call.name, call.args, userId, siteId);
                toolResponses.push({ functionResponse: { name: call.name, response: { content: data } } });
            }
            result = await chat.sendMessage(toolResponses);
            response = result.response;
        }

        const finalContent = response.text()
            .replace(/(\r?\n)*.*response is advisory only.*/gi, '')
            .trim();

        // Discovered sources (optional logic if you want to track which sources AI used)
        // For simplicity, we just save the general result
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const insight = await WeeklyInsight.findOneAndUpdate(
            { userId: userId, siteId: siteId || null },
            { content: finalContent, expiresAt },
            { upsert: true, returnDocument: 'after' }
        );

        // Notify user
        await createNotification(userId, {
            type: 'info',
            title: 'Weekly AI Insight Ready',
            message: 'Your weekly performance analysis has been generated by AI.',
            source: 'ai',
            actionLabel: 'View Insight',
            actionPath: '/dashboard/ai-chat'
        });

        return insight;

    } catch (err) {
        console.error("Weekly Insight Internal Error:", err);
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
        const todayStr = nowLocal.toISOString().split('T')[0];

        // Load Prompts
        let systemIns = "";
        let suggestPrompt = "";
        try {
            systemIns = fs.readFileSync(path.join(process.cwd(), 'server', 'prompts', 'system.txt'), 'utf8');
            suggestPrompt = fs.readFileSync(path.join(process.cwd(), 'server', 'prompts', 'suggested-questions.txt'), 'utf8');
        } catch (e) {
            systemIns = fs.readFileSync(path.join(process.cwd(), 'prompts', 'system.txt'), 'utf8');
            suggestPrompt = fs.readFileSync(path.join(process.cwd(), 'prompts', 'suggested-questions.txt'), 'utf8');
        }

        const dateContext = `\n\n[REAL-TIME CONTEXT]: Today's date is ${todayStr}. suggestedQuestions must be a JSON array of 4 strings. Analyze the last 30 days of data and return ONLY the JSON array.`;

        const chat = await startAgenticChat([], aiTools, systemIns + dateContext);
        
        let result = await chat.sendMessage(suggestPrompt);
        let response = result.response;

        // Tool Loop (AI might call metrics to find interesting trends)
        let iteration = 0;
        while (response.functionCalls()?.length > 0 && iteration < 3) {
            iteration++;
            const calls = response.functionCalls();
            const toolResponses = [];
            for (const call of calls) {
                const data = await executeTool(call.name, call.args, userId, siteId);
                toolResponses.push({ functionResponse: { name: call.name, response: { content: data } } });
            }
            result = await chat.sendMessage(toolResponses);
            response = result.response;
        }

        let questions = [];
        const fallbacks = [
            "Find keywords with high impressions but low CTR.",
            "Identify GA4 conversion leaks in my funnel.",
            "Which Google Ads campaigns have highest ROI?",
            "Compare ROAS across Meta Ads audiences."
        ];

        try {
            const content = response.text();
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
