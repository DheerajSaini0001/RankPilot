import mongoose from 'mongoose';

const userAccountsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    siteName: { type: String, required: true, default: 'My Website' },
    ga4PropertyId: { type: String },
    ga4PropertyName: { type: String },
    ga4AccountId: { type: String },
    gscSiteUrl: { type: String },
    gscPermission: { type: String },
    googleAdsCustomerId: { type: String },
    googleAdsAccountName: { type: String },
    googleAdsCurrencyCode: { type: String },
    facebookAdAccountId: { type: String },
    facebookAdAccountName: { type: String },
    facebookAdCurrency: { type: String },
    isHistoricalSyncComplete: { type: Boolean, default: false },
    lastDailySyncAt: { type: Date },
    syncStatus: { type: String, enum: ['idle', 'syncing', 'error'], default: 'idle' }
}, {
    timestamps: true
});

userAccountsSchema.index({ userId: 1, siteName: 1 }, { unique: true });


export default mongoose.model('UserAccounts', userAccountsSchema);
