import mongoose from 'mongoose';

const weeklyInsightSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserAccount', index: true },
    content: { type: String, required: true },

}, {
    timestamps: true
});



export default mongoose.model('WeeklyInsight', weeklyInsightSchema);
