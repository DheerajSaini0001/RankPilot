import mongoose from 'mongoose';

const gscMetricSchema = new mongoose.Schema({
    metadata: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserAccounts', required: true },
        platformAccountId: { type: String, required: true },
        dimensions: {
            page: { type: String },
            query: { type: String },
            device: { type: String },
            country: { type: String }
        }
    },
    date: { type: Date, required: true },
    metrics: {
        clicks: { type: Number, default: 0 },
        impressions: { type: Number, default: 0 },
        ctr: { type: Number, default: 0 },
        position: { type: Number, default: 0 }
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
gscMetricSchema.index({ 'metadata.userId': 1, 'metadata.siteId': 1 });
gscMetricSchema.index({ 'metadata.platformAccountId': 1 });
gscMetricSchema.index({ 
    'metadata.userId': 1, 
    'metadata.siteId': 1, 
    'date': 1,
    'metadata.dimensions.page': 1,
    'metadata.dimensions.query': 1
});

export default mongoose.model('GscMetric', gscMetricSchema);
