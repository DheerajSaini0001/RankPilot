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
    
    isHistoricalSyncComplete: { type: Boolean, default: false },
    lastDailySyncAt: { type: Date },
    syncStatus: { type: String, enum: ['idle', 'syncing', 'error'], default: 'idle' }
}, {
    timestamps: true
});

userAccountsSchema.index({ userId: 1, siteName: 1 }, { unique: true });


export default mongoose.model('UserAccounts', userAccountsSchema);
