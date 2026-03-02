import mongoose from 'mongoose';

const analyticsCacheSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    source: { type: String, required: true, enum: ['ga4', 'gsc', 'google-ads', 'facebook-ads'] },
    reportType: { type: String, required: true },
    accountId: { type: String, required: true },
    dateRangeStart: { type: String, required: true },
    dateRangeEnd: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    fetchedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true }
}, {
    timestamps: true
});

analyticsCacheSchema.index({ userId: 1, source: 1, reportType: 1, dateRangeStart: 1, dateRangeEnd: 1 });
analyticsCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('AnalyticsCache', analyticsCacheSchema);
