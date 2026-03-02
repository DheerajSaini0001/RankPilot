import mongoose from 'mongoose';

const userAccountsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
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
    facebookAdCurrency: { type: String }
}, {
    timestamps: true
});

export default mongoose.model('UserAccounts', userAccountsSchema);
