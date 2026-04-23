import mongoose from 'mongoose';

const facebookAdsMetricSchema = new mongoose.Schema({
    metadata: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserAccounts', required: true },
        platformAccountId: { type: String, required: true },
        dimensions: {
            campaign: { type: String },
            adset: { type: String },
            device: { type: String }
        }
    },
    date: { type: Date, required: true },
    metrics: {
        spend: { type: Number, default: 0 },
        impressions: { type: Number, default: 0 },
        clicks: { type: Number, default: 0 },
        reach: { type: Number, default: 0 },
        conversions: { type: Number, default: 0 },
        purchase_value: { type: Number, default: 0 },
        landing_page_views: { type: Number, default: 0 },
        link_clicks: { type: Number, default: 0 },
        frequency: { type: Number, default: 0 },
        engagement: { type: Number, default: 0 },
        cpc: { type: Number, default: 0 },
        cpm: { type: Number, default: 0 },
        ctr: { type: Number, default: 0 }
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
facebookAdsMetricSchema.index({ 'metadata.userId': 1, 'metadata.siteId': 1 });
facebookAdsMetricSchema.index({ 'metadata.dimensions.campaign': 1 }, { sparse: true });

export default mongoose.model('FacebookAdsMetric', facebookAdsMetricSchema);
