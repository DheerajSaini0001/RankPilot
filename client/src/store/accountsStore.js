import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAccountsStore = create(
    persist(
        (set) => ({
            ga4: {},
            gsc: {},
            googleAds: {},
            facebook: {},
            connectedSources: [],
            gscSites: [],
            userSites: [], // All sites from DB
            activeSiteId: null, // Currently selected site ID
            activeGscSite: null,
            activeGa4PropertyId: null,
            activeGoogleAdsCustomerId: null,
            activeFacebookAdAccountId: null,
            syncMetadata: {
                isHistoricalSyncComplete: false,
                lastDailySyncAt: null,
                syncStatus: 'idle'
            },

            setAccounts: (updates) => set((state) => {
                const newState = { ...state, ...updates };
                
                // Only merge syncMetadata if it's actually provided in updates
                if (updates.syncStatus || updates.lastDailySyncAt || updates.isHistoricalSyncComplete !== undefined) {
                    newState.syncMetadata = {
                        ...state.syncMetadata,
                        ...(updates.isHistoricalSyncComplete !== undefined && { isHistoricalSyncComplete: updates.isHistoricalSyncComplete }),
                        ...(updates.lastDailySyncAt !== undefined && { lastDailySyncAt: updates.lastDailySyncAt }),
                        ...(updates.syncStatus !== undefined && { syncStatus: updates.syncStatus })
                    };
                }
                return newState;
            }),
            setUserSites: (sites) => set({ userSites: sites }),
            clearAccounts: () => set({ ga4: {}, gsc: {}, googleAds: {}, facebook: {}, connectedSources: [], gscSites: [], userSites: [], activeSiteId: null, activeGscSite: null, activeGa4PropertyId: null, activeGoogleAdsCustomerId: null, activeFacebookAdAccountId: null, syncMetadata: { isHistoricalSyncComplete: false, lastDailySyncAt: null, syncStatus: 'idle' } }),
        }),
        {
            name: 'accounts-storage',
        }
    )
);
