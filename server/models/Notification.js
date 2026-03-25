import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['success', 'info', 'warning', 'error'],
        default: 'info'
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    source: {
        type: String,
        // 'ga4' | 'gsc' | 'google-ads' | 'facebook-ads' | 'ai' | 'system'
        default: 'system'
    },
    actionLabel: {
        type: String,
        default: null
    },
    actionPath: {
        type: String,
        default: null
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index to automatically delete old notifications (optional, e.g., after 30 days)
// notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export default mongoose.model('Notification', notificationSchema);
