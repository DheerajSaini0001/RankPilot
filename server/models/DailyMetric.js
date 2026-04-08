import mongoose from 'mongoose';

const dailyMetricSchema = new mongoose.Schema({
    // metadata: { userId, source, platformAccountId, dimensions }
    metadata: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserAccounts', required: true },
        source: { type: String, required: true, enum: ['ga4', 'gsc', 'google-ads', 'facebook-ads'] },
        platformAccountId: { type: String, required: true },
        dimensions: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    // timeField: date (Date Object required for Timeseries)
    date: { type: Date, required: true },
    // data: metrics
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    syncedAt: { type: Date, default: Date.now }
}, {
    timestamps: true,
    // Enable Timeseries (Requires MongoDB 5.0+)
    timeseries: {
        timeField: 'date',
        metaField: 'metadata',
        granularity: 'days'
    }
});

// Compound Index for fast lookups across sites and sources (Timeseries automatically handles timeField)
dailyMetricSchema.index({ 'metadata.userId': 1, 'metadata.siteId': 1, 'metadata.source': 1 });
dailyMetricSchema.index({ 'metadata.platformAccountId': 1 });

// ULTRA-FAST SYNC INDEX: Covers all unique dimensions used in GSC/GA4 upserts
dailyMetricSchema.index({ 
    'metadata.userId': 1, 
    'metadata.siteId': 1, 
    'metadata.source': 1, 
    'metadata.platformAccountId': 1, 
    'date': 1,
    'metadata.dimensions.page': 1,
    'metadata.dimensions.pagePath': 1,
    'metadata.dimensions.query': 1
});

// Helper indexes for common dimension filters within metadata
dailyMetricSchema.index({ 'metadata.dimensions.campaign': 1 }, { sparse: true });
dailyMetricSchema.index({ 'metadata.dimensions.query': 1 }, { sparse: true });
dailyMetricSchema.index({ 'metadata.dimensions.landingPage': 1 }, { sparse: true });

export default mongoose.model('DailyMetric', dailyMetricSchema);
