import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Notification types:
// 'success' — green  — data sync, connection success
// 'info'    — blue   — AI insights, tips
// 'warning' — amber  — token expiry, low data
// 'error'   — red    — sync failed, API error

export const useNotificationStore = create(
  persist(
    (set, get) => ({

      notifications: [],
      unreadCount: 0,
      isSeeded: false,

      // ── Add single notification ──
      addNotification: ({ type = 'info', title, message, source, actionLabel, actionPath }) =>
        set(state => {
          // Prevent duplicate notifications with same title within 60 seconds
          const isDuplicate = state.notifications.some(
            n => n.title === title &&
            Date.now() - new Date(n.timestamp).getTime() < 60000
          );
          if (isDuplicate) return state;

          const newNotif = {
            id: `notif_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
            type,
            title,
            message,
            source: source || null,        // 'ga4' | 'gsc' | 'google-ads' | 'facebook-ads' | 'ai' | 'system'
            actionLabel: actionLabel || null, // optional CTA button label
            actionPath: actionPath || null,   // optional route to navigate to
            timestamp: new Date().toISOString(),
            isRead: false,
          };

          return {
            notifications: [newNotif, ...state.notifications].slice(0, 50), // max 50
            unreadCount: state.unreadCount + 1,
          };
        }),

      // ── Add multiple notifications at once ──
      addNotifications: (notifArray) =>
        set(state => {
          const newNotifs = notifArray.map(n => ({
            id: `notif_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
            type: n.type || 'info',
            title: n.title,
            message: n.message,
            source: n.source || null,
            actionLabel: n.actionLabel || null,
            actionPath: n.actionPath || null,
            timestamp: new Date().toISOString(),
            isRead: false,
          }));

          return {
            notifications: [...newNotifs, ...state.notifications].slice(0, 50),
            unreadCount: state.unreadCount + newNotifs.length,
          };
        }),

      // ── Mark single as read ──
      markAsRead: (id) =>
        set(state => {
          const updated = state.notifications.map(n =>
            n.id === id ? { ...n, isRead: true } : n
          );
          return {
            notifications: updated,
            unreadCount: updated.filter(n => !n.isRead).length,
          };
        }),

      // ── Mark all as read ──
      markAllRead: () =>
        set(state => ({
          notifications: state.notifications.map(n => ({ ...n, isRead: true })),
          unreadCount: 0,
        })),

      // ── Delete single notification ──
      deleteNotification: (id) =>
        set(state => {
          const updated = state.notifications.filter(n => n.id !== id);
          return {
            notifications: updated,
            unreadCount: updated.filter(n => !n.isRead).length,
          };
        }),

      // ── Clear all notifications ──
      clearAll: () => set({ notifications: [], unreadCount: 0 }),

      // ── Clear only read notifications ──
      clearRead: () =>
        set(state => ({
          notifications: state.notifications.filter(n => !n.isRead),
          unreadCount: state.unreadCount,
        })),

      // ── Get notifications by type ──
      getByType: (type) => get().notifications.filter(n => n.type === type),

      // ── Get notifications by source ──
      getBySource: (source) => get().notifications.filter(n => n.source === source),

      // ── Seed default notifications (call once on first load) ──
      seedDefaults: () => {
        const state = get();
        if (state.isSeeded) return; // already seeded once

        const defaults = [
          {
            id: 'default_1',
            type: 'success',
            title: 'Welcome to RankPilot',
            message: 'Your AI analytics platform is ready. Connect your marketing platforms to start getting insights.',
            source: 'system',
            actionLabel: 'Connect Now',
            actionPath: '/connect-accounts',
            timestamp: new Date().toISOString(),
            isRead: false,
          },
          {
            id: 'default_2',
            type: 'info',
            title: 'AI Analyst is Ready',
            message: 'Ask your AI analyst anything about your marketing data in plain English.',
            source: 'ai',
            actionLabel: 'Try AI Chat',
            actionPath: '/dashboard/ai-chat',
            timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
            isRead: false,
          },
        ];

        set({ notifications: defaults, unreadCount: 2, isSeeded: true });
      },
    }),
    {
      name: 'rankpilot-notifications',
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 20), // only persist last 20
        unreadCount: state.unreadCount,
        isSeeded: state.isSeeded,
      }),
    }
  )
);

// ── Helper: use anywhere in app to trigger notifications ──
export const notify = {
  success: (title, message, options = {}) =>
    useNotificationStore.getState().addNotification({ type: 'success', title, message, ...options }),

  info: (title, message, options = {}) =>
    useNotificationStore.getState().addNotification({ type: 'info', title, message, ...options }),

  warning: (title, message, options = {}) =>
    useNotificationStore.getState().addNotification({ type: 'warning', title, message, ...options }),

  error: (title, message, options = {}) =>
    useNotificationStore.getState().addNotification({ type: 'error', title, message, ...options }),

  // Predefined notification templates:
  syncSuccess: (source) =>
    useNotificationStore.getState().addNotification({
      type: 'success',
      title: `${source} Sync Complete`,
      message: `Your ${source} data has been successfully synced and is ready to view.`,
      source: source.toLowerCase().replace(' ', '-'),
      actionLabel: 'View Dashboard',
      actionPath: '/dashboard',
    }),

  syncFailed: (source, reason) =>
    useNotificationStore.getState().addNotification({
      type: 'error',
      title: `${source} Sync Failed`,
      message: reason || `Failed to sync ${source} data. Please check your connection and try again.`,
      source: source.toLowerCase().replace(' ', '-'),
      actionLabel: 'Check Settings',
      actionPath: '/connect-accounts',
    }),

  tokenExpiring: (source, daysLeft) =>
    useNotificationStore.getState().addNotification({
      type: 'warning',
      title: `${source} Token Expiring`,
      message: `Your ${source} access token expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Reconnect to avoid data gaps.`,
      source: source.toLowerCase().replace(' ', '-'),
      actionLabel: 'Reconnect',
      actionPath: '/connect-accounts',
    }),

  aiInsightReady: (siteId) =>
    useNotificationStore.getState().addNotification({
      type: 'info',
      title: 'Weekly AI Insight Ready',
      message: 'Your weekly performance analysis is ready. See what changed and what to optimize next.',
      source: 'ai',
      actionLabel: 'View Insight',
      actionPath: '/dashboard/ai-chat',
    }),

  newSiteConnected: (siteName) =>
    useNotificationStore.getState().addNotification({
      type: 'success',
      title: 'New Website Connected',
      message: `${siteName} has been successfully added to your dashboard.`,
      source: 'system',
      actionLabel: 'View Sites',
      actionPath: '/dashboard/sites',
    }),
};
