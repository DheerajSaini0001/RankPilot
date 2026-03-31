import mongoose from 'mongoose';

const userAccountsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    siteName: { type: String, required: true, default: 'My Website' },
    ga4PropertyId: { type: String },
    ga4PropertyName: { type: String },
    ga4AccountId: { type: String },
    ga4TokenId: { type: mongoose.Schema.Types.ObjectId, ref: 'GoogleToken' },
    
    gscSiteUrl: { type: String },
    gscPermission: { type: String },
    gscTokenId: { type: mongoose.Schema.Types.ObjectId, ref: 'GoogleToken' },
    
    googleAdsCustomerId: { type: String },
    googleAdsAccountName: { type: String },
    googleAdsCurrencyCode: { type: String },
    googleAdsTokenId: { type: mongoose.Schema.Types.ObjectId, ref: 'GoogleToken' },
    
    facebookAdAccountId: { type: String },
    facebookAdAccountName: { type: String },
    facebookAdCurrencyCode: { type: String },
    facebookTokenId: { type: mongoose.Schema.Types.ObjectId, ref: 'FacebookToken' },

    ga4HistoricalComplete: { type: Boolean, default: false },
    gscHistoricalComplete: { type: Boolean, default: false },
    googleAdsHistoricalComplete: { type: Boolean, default: false },
    facebookAdsHistoricalComplete: { type: Boolean, default: false },
    
    // Individual Platform Sync Status & Progress
    ga4SyncStatus: { type: String, enum: ['idle', 'syncing', 'error', 'pending'], default: 'idle' },
    ga4SyncProgress: { type: Number, default: 0 },
    gscSyncStatus: { type: String, enum: ['idle', 'syncing', 'error', 'pending'], default: 'idle' },
    gscSyncProgress: { type: Number, default: 0 },
    googleAdsSyncStatus: { type: String, enum: ['idle', 'syncing', 'error', 'pending'], default: 'idle' },
    googleAdsSyncProgress: { type: Number, default: 0 },
    facebookAdsSyncStatus: { type: String, enum: ['idle', 'syncing', 'error', 'pending'], default: 'idle' },
    facebookAdsSyncProgress: { type: Number, default: 0 },
    
    // Resume logic for historical sync (tracks which months are already completed)
    ga4HistoricalMonthIndex: { type: Number, default: 0 },
    gscHistoricalMonthIndex: { type: Number, default: 0 },
    googleAdsHistoricalMonthIndex: { type: Number, default: 0 },
    facebookAdsHistoricalMonthIndex: { type: Number, default: 0 },

    isHistoricalSyncComplete: { type: Boolean, default: false },
    lastDailySyncAt: { type: Date },
    syncStatus: { type: String, enum: ['idle', 'syncing', 'error', 'pending'], default: 'idle' },
    
    suggestedQuestions: { type: [String], default: [] },
    suggestedQuestionsUpdatedAt: { type: Date }
}, {
    timestamps: true
});

userAccountsSchema.index({ userId: 1, siteName: 1 }, { unique: true });


export default mongoose.model('UserAccounts', userAccountsSchema);
