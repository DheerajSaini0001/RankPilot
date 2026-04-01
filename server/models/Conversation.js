import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserAccount', index: true },
    title: { type: String }
}, {
    timestamps: true
});

export default mongoose.model('Conversation', conversationSchema);
