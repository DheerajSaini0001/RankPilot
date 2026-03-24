import mongoose from 'mongoose';

const facebookTokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    facebookUserId: { type: String, required: true },
    name: { type: String, required: true },
    accessToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    scope: { type: String, required: true }
}, {
    timestamps: true
});

facebookTokenSchema.index({ userId: 1, facebookUserId: 1 }, { unique: true });

export default mongoose.model('FacebookToken', facebookTokenSchema);
