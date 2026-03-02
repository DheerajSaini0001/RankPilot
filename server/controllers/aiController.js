import { callClaude } from '../services/claudeService.js';
import { callOpenAI } from '../services/openaiService.js';
import promptBuilder from '../services/promptBuilder.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import WeeklyInsight from '../models/WeeklyInsight.js';

const getAiResponse = async (prompt) => {
    const start = Date.now();
    let result;
    try {
        result = await callClaude(prompt);
    } catch (err) {
        console.warn(`Claude failed (${err.status || err.message}). Falling back to OpenAI...`);
        try {
            result = await callOpenAI(prompt);
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
    const { question, conversationId, dateRangeStart, dateRangeEnd, activeSources, data } = req.body;
    const prompt = promptBuilder.buildAskPrompt(question, dateRangeStart, dateRangeEnd, data);

    let convId = conversationId;
    if (!convId) {
        const conv = await Conversation.create({ userId: req.user._id, title: question.substring(0, 60), sources: activeSources });
        convId = conv._id;
    }

    await Message.create({ conversationId: convId, role: 'user', content: question });

    const aiResult = await getAiResponse(prompt);

    const aiMsg = await Message.create({
        conversationId: convId,
        role: 'assistant',
        content: aiResult.content,
        model: aiResult.model,
        tokensUsed: aiResult.tokensUsed,
        latencyMs: aiResult.latencyMs
    });

    res.status(200).json({ answer: aiResult.content, conversationId: convId, messageId: aiMsg._id });
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

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const insight = await WeeklyInsight.findOneAndUpdate(
        { userId: req.user._id },
        { content: aiResult.content, sources: activeSources, expiresAt },
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
