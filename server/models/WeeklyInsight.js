import mongoose from 'mongoose';

const weeklyInsightSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserAccount', index: true },
    content: { type: String, required: true },
    sources: [{ type: String, required: true, enum: ['ga4', 'gsc', 'google-ads', 'facebook-ads'] }],
    expiresAt: { type: Date, required: true }

}, {
    timestamps: true
});

weeklyInsightSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('WeeklyInsight', weeklyInsightSchema);
