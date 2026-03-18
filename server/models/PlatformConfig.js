import mongoose from 'mongoose';

const platformConfigSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, index: true },
    value: { type: String, required: true },
    label: { type: String, required: true },
    group: { type: String, required: true, enum: ['google', 'facebook', 'gemini', 'server', 'database', 'security', 'other'] },
    isSecret: { type: Boolean, required: true, default: true },
    updatedBy: { type: String, required: true }
}, {
    timestamps: true
});

export default mongoose.model('PlatformConfig', platformConfigSchema);
