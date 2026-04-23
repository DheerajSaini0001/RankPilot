import mongoose from 'mongoose';

const ga4MetricSchema = new mongoose.Schema({
    metadata: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserAccounts', required: true },
        platformAccountId: { type: String, required: true },
        dimensions: {
            channel: { type: String },
            source: { type: String },
            device: { type: String },
            country: { type: String },
            pagePath: { type: String },
            landingPage: { type: String },
            pageTitle: { type: String }
        }
    },
    date: { type: Date, required: true },
    metrics: {
        users: { type: Number, default: 0 },
        newUsers: { type: Number, default: 0 },
        sessions: { type: Number, default: 0 },
        engagedSessions: { type: Number, default: 0 },
        pageViews: { type: Number, default: 0 },
        avgSessionDuration: { type: Number, default: 0 },
        engagementRate: { type: Number, default: 0 },
        bounceRate: { type: Number, default: 0 },
        revenue: { type: Number, default: 0 },
        transactions: { type: Number, default: 0 },
        conversions: { type: Number, default: 0 }
    },
    syncedAt: { type: Date, default: Date.now }
}, {
    timestamps: true,
    timeseries: {
        timeField: 'date',
        metaField: 'metadata',
        granularity: 'days'
    }
});

// Indexes
ga4MetricSchema.index({ 'metadata.userId': 1, 'metadata.siteId': 1 });
ga4MetricSchema.index({ 'metadata.platformAccountId': 1 });
ga4MetricSchema.index({ 
    'metadata.userId': 1, 
    'metadata.siteId': 1, 
    'date': 1,
    'metadata.dimensions.pagePath': 1,
    'metadata.dimensions.channel': 1
});

export default mongoose.model('Ga4Metric', ga4MetricSchema);
