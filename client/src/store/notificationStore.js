import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useNotificationStore = create(
    persist(
        (set) => ({
            notifications: [
                {
                    id: 1,
                    type: 'success',
                    title: 'Intelligence Sync Live',
                    message: 'Your Google Analytics, Search Console, & Ads data have been successfully unified into the RankPilot engine.',
                    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
                    isRead: false
                },
                {
                    id: 2,
                    type: 'info',
                    title: 'Growth Analysis Ready',
                    message: 'AI has analyzed your latest organic traffic trends. Check the dashboard for new optimization insights.',
                    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
                    isRead: false
                },
            ],
            unreadCount: 2,
            
            addNotification: (notification) => set((state) => ({
                notifications: [
                    { 
                        id: Date.now(), 
                        isRead: false, 
                        timestamp: new Date().toISOString(), 
                        ...notification 
                    },
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
