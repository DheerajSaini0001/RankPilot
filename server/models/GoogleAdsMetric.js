import mongoose from 'mongoose';

const googleAdsMetricSchema = new mongoose.Schema({
    metadata: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserAccounts', required: true },
        platformAccountId: { type: String, required: true },
        dimensions: {
            campaign: { type: String },
            campaignStatus: { type: String },
            adGroup: { type: String },
            adGroupStatus: { type: String },
            device: { type: String },
            network: { type: String }
        }
    },
    date: { type: Date, required: true },
    metrics: {
        spend: { type: Number, default: 0 },
        impressions: { type: Number, default: 0 },
        clicks: { type: Number, default: 0 },
        conversions: { type: Number, default: 0 },
        conversionValue: { type: Number, default: 0 },
        allConversions: { type: Number, default: 0 },
        viewThroughConversions: { type: Number, default: 0 },
        searchImpressionShare: { type: Number, default: 0 },
        cpc: { type: Number, default: 0 },
        ctr: { type: Number, default: 0 },
        cpm: { type: Number, default: 0 }
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
googleAdsMetricSchema.index({ 'metadata.userId': 1, 'metadata.siteId': 1 });
googleAdsMetricSchema.index({ 'metadata.dimensions.campaign': 1 }, { sparse: true });

export default mongoose.model('GoogleAdsMetric', googleAdsMetricSchema);
