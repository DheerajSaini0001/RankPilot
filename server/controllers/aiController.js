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

    const allLogs = await DailyMetric.find(dailyQuery).sort({ date: 1 });

    if (allLogs.length > 0) {
        const aggregated = {};
        const sourceTotals = { current: {}, previous: {} };
        const sourceEntryCount = { current: {}, previous: {} };
        
        // Dimension tracking (Current Period only for simplicity)
        const dimensions = { queries: {}, pages: {}, pageQueryMap: {}, campaigns: {}, devices: {}, channels: {} };

        allLogs.forEach(log => {
            const isCurrent = log.date >= currentStart;
            const periodKey = isCurrent ? 'current' : 'previous';
            const source = log.metadata.source;
            const dateStr = log.date.toISOString().split('T')[0];
            const aggKey = `${source}_${dateStr}`;
            
            if (!sourceTotals[periodKey][source]) {
                sourceTotals[periodKey][source] = {};
                sourceEntryCount[periodKey][source] = 0;
            }
            sourceEntryCount[periodKey][source] += 1;

            // Daily Breakdowns (Current only)
            if (isCurrent) {
                if (!aggregated[aggKey]) {
                    aggregated[aggKey] = { source, date: dateStr, metrics: { ...log.metrics }, count: 1 };
                } else {
                    aggregated[aggKey].count += 1;
                    Object.keys(log.metrics).forEach(m => {
                        if (typeof log.metrics[m] === 'number') aggregated[aggKey].metrics[m] = (aggregated[aggKey].metrics[m] || 0) + log.metrics[m];
                    });
                }
            }

            // Overall Range Totals (Both Periods)
            Object.keys(log.metrics).forEach(m => {
                if (typeof log.metrics[m] === 'number') {
                    sourceTotals[periodKey][source][m] = (sourceTotals[periodKey][source][m] || 0) + log.metrics[m];
                }
            });

            // Dimension Aggregation (Current only)
            if (isCurrent && log.metadata && log.metadata.dimensions) {
                const d = log.metadata.dimensions;
                const m = log.metrics;
                if (d.query) {
                    if (!dimensions.queries[d.query]) dimensions.queries[d.query] = { clicks: 0, impressions: 0, positionSum: 0, count: 0 };
                    dimensions.queries[d.query].clicks += (m.clicks || 0);
                    dimensions.queries[d.query].impressions += (m.impressions || 0);
                    if (m.position !== undefined) { dimensions.queries[d.query].positionSum += m.position; dimensions.queries[d.query].count += 1; }
                }
                if (d.page || d.pagePath) {
                    let page = d.page || d.pagePath;
                    if (page.startsWith('http')) { try { const u = new URL(page); page = u.pathname || '/'; } catch (e) {} }
                    if (page === '') page = '/';
                    if (!dimensions.pages[page]) dimensions.pages[page] = { sessions: 0, bounceRateSum: 0, gscClicks: 0, gscImpressions: 0, gscPositionSum: 0, gscCount: 0, count: 0 };
                    dimensions.pages[page].sessions += (m.sessions || 0);
                    if (m.bounceRate !== undefined) { dimensions.pages[page].bounceRateSum += m.bounceRate; dimensions.pages[page].count += 1; }
                    dimensions.pages[page].gscClicks += (m.clicks || 0);
                    dimensions.pages[page].gscImpressions += (m.impressions || 0);
                    if (source === 'gsc' && m.position !== undefined) { dimensions.pages[page].gscPositionSum += m.position; dimensions.pages[page].gscCount += 1; }
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

        const getGrowth = (curr, prev) => {
            if (!prev || prev === 0) return curr > 0 ? "100.0" : "0.0";
            return (((curr - prev) / prev) * 100).toFixed(1);
        };

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

        // Build Totals with Growth Comparison
        if (sourceTotals.current['ga4']) {
            const curr = sourceTotals.current['ga4'];
            const prev = sourceTotals.previous['ga4'] || {};
            const count = sourceEntryCount.current['ga4'];
            data.ga4 = {
                users: curr.users || 0,
                usersGrowth: getGrowth(curr.users, prev.users),
                sessions: curr.sessions || 0,
                sessionsGrowth: getGrowth(curr.sessions, prev.sessions),
                pageViews: curr.pageViews || 0,
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

    // Prepare History for Gemini (role must be 'user' or 'model')
    const chatHistory = (history || []).slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
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

        const finalContent = response.text()
            .replace(/(\r?\n)*.*response is advisory only.*/gi, '')
            .replace(/\*/g, '') // THE NUCLEAR OPTION: Global Wipe out of ALL asterisks
            .trim();

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
