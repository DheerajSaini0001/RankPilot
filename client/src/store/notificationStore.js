import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useNotificationStore = create(
    persist(
        (set) => ({
            notifications: [
                {
                    id: 1,
                    type: 'success',
                    title: 'Data Sync Successful',
                    message: 'Your Google Search Console and Analytics data has been successfully updated.',
                    time: 'Just now',
                    isRead: false
                },
                {
                    id: 2,
                    type: 'info',
                    title: 'New Growth Opportunity',
                    message: 'AI analyzed your latest data and found a new way to increase your search visibility.',
                    time: '2 hours ago',
                    isRead: false
                }
            ],
            unreadCount: 2,
            
            addNotification: (notification) => set((state) => ({
                notifications: [
                    { id: Date.now(), isRead: false, time: 'Just now', ...notification },
                    ...state.notifications
                ],
                unreadCount: state.unreadCount + 1
            })),

            markAsRead: (id) => set((state) => {
                const newNotifications = state.notifications.map(n => 
                    n.id === id ? { ...n, isRead: true } : n
                );
                return {
                    notifications: newNotifications,
                    unreadCount: newNotifications.filter(n => !n.isRead).length
                };
            }),

            markAllRead: () => set((state) => ({
                notifications: state.notifications.map(n => ({ ...n, isRead: true })),
                unreadCount: 0
            })),

            clearNotifications: () => set({ notifications: [], unreadCount: 0 })
        }),
        {
            name: 'notification-storage',
        }
    )
);
