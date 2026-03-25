import Notification from '../models/Notification.js';

/**
 * Helper to create a notification for a user from the backend
 * @param {string} userId - The ID of the user
 * @param {object} data - Notification data (type, title, message, source, actionLabel, actionPath)
 */
export const createNotification = async (userId, { type = 'info', title, message, source = 'system', actionLabel = null, actionPath = null }) => {
    try {
        await Notification.create({
            userId,
            type,
            title,
            message,
            source,
            actionLabel,
            actionPath
        });
        return true;
    } catch (error) {
        console.error('Failed to create backend notification:', error.message);
        return false;
    }
};
