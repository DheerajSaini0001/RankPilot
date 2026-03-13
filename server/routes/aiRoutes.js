import express from 'express';
import { protect } from '../middleware/auth.js';
import { catchAsync } from '../utils/catchAsync.js';
import { askAi, getConversations, getConversation, deleteConversation, getWeeklyInsight, refreshWeeklyInsight, getSuggestedQuestions } from '../controllers/aiController.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();
router.use(protect);

router.post('/ask', aiLimiter, catchAsync(askAi));
router.get('/conversations', catchAsync(getConversations));
router.get('/conversations/:id', catchAsync(getConversation));
router.delete('/conversations/:id', catchAsync(deleteConversation));
router.get('/weekly-insight', catchAsync(getWeeklyInsight));
router.post('/weekly-insight/refresh', aiLimiter, catchAsync(refreshWeeklyInsight));

router.get('/suggested-questions', catchAsync(getSuggestedQuestions));

export default router;
