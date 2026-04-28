import mongoose from 'mongoose';

const suggestedQuestionsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserAccounts', required: true },
    questions: { type: [String], required: true },
    createdAt: { type: Date, default: Date.now }
});

suggestedQuestionsSchema.index({ userId: 1, siteId: 1 });

export default mongoose.model('SuggestedQuestions', suggestedQuestionsSchema);
