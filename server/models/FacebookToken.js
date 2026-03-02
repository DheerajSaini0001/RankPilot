import mongoose from 'mongoose';

const facebookTokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    accessToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    facebookUserId: { type: String, required: true },
    scope: { type: String, required: true }
}, {
    timestamps: true
});

export default mongoose.model('FacebookToken', facebookTokenSchema);
