import mongoose from 'mongoose';

const aiIntelligenceSchema = new mongoose.Schema({
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserAccounts', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    platform: { type: String, enum: ['ga4', 'gsc', 'gads', 'fbads', 'dash'], required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    device: { type: String, default: 'all' },
    content: { type: Object, required: true },
    lastSyncedAtOnGeneration: { type: Date, required: true }
}, { 
    timestamps: true 
});

aiIntelligenceSchema.index({ siteId: 1, platform: 1, startDate: 1, endDate: 1, device: 1 });

aiIntelligenceSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model('AiIntelligence', aiIntelligenceSchema);
