import mongoose from 'mongoose';

const aiIntelligenceSchema = new mongoose.Schema({
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserAccounts', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    platform: { type: String, enum: ['ga4', 'gsc', 'gads', 'fbads'], required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    device: { type: String, default: 'all' },
    
    content: { type: Object, required: true },
    
    // Tracks the sync timestamp at the time of generation
    // If site's actual lastSyncedAt becomes greater than this, the cache is invalid
    lastSyncedAtOnGeneration: { type: Date, required: true }
}, { 
    timestamps: true 
});

// Compound index for lightning-fast lookups
aiIntelligenceSchema.index({ siteId: 1, platform: 1, startDate: 1, endDate: 1, device: 1 });

// Optional: Auto-expire old insights after 30 days to keep DB lean
aiIntelligenceSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export default mongoose.model('AiIntelligence', aiIntelligenceSchema);
