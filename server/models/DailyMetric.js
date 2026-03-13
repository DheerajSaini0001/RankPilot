import mongoose from 'mongoose';

const dailyMetricSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    source: { type: String, required: true, enum: ['ga4', 'gsc', 'google-ads', 'facebook-ads'] },
    platformAccountId: { type: String, required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    dimensions: { type: mongoose.Schema.Types.Mixed, default: {} },
    syncedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Index for fast lookups by user, source, date and dimensions for filtering
dailyMetricSchema.index({ userId: 1, source: 1, date: 1 });
dailyMetricSchema.index({ date: 1 });

export default mongoose.model('DailyMetric', dailyMetricSchema);
