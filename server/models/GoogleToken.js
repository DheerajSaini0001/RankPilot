import mongoose from 'mongoose';

const googleTokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    googleId: { type: String, required: true },
    email: { type: String, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    scope: { type: String, required: true }
}, {
    timestamps: true
});

googleTokenSchema.index({ userId: 1, googleId: 1 }, { unique: true });

export default mongoose.model('GoogleToken', googleTokenSchema);
