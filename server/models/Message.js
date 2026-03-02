import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    role: { type: String, required: true, enum: ['user', 'assistant'] },
    content: { type: String, required: true },
    model: { type: String },
    tokensUsed: { type: Number },
    latencyMs: { type: Number }
}, {
    timestamps: true
});

export default mongoose.model('Message', messageSchema);
