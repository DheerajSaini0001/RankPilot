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
                ga4HistoricalComplete: false,
                gscHistoricalComplete: false,
                googleAdsHistoricalComplete: false,
                facebookAdsHistoricalComplete: false,
                syncStatus: 'idle',
                ga4LastSyncedAt: null,
                gscLastSyncedAt: null,
                googleAdsLastSyncedAt: null,
                facebookAdsLastSyncedAt: null
            },

            setAccounts: (updates) => set((state) => {
                const newState = { ...state, ...updates };
                
                // Only merge syncMetadata if it's actually provided in updates
                if (updates.syncStatus || updates.ga4HistoricalComplete !== undefined || updates.gscHistoricalComplete !== undefined || updates.ga4LastSyncedAt || updates.gscLastSyncedAt || updates.googleAdsLastSyncedAt || updates.facebookAdsLastSyncedAt) {
                    newState.syncMetadata = {
                        ...state.syncMetadata,
                        ...(updates.ga4HistoricalComplete !== undefined && { ga4HistoricalComplete: updates.ga4HistoricalComplete }),
                        ...(updates.gscHistoricalComplete !== undefined && { gscHistoricalComplete: updates.gscHistoricalComplete }),
                        ...(updates.googleAdsHistoricalComplete !== undefined && { googleAdsHistoricalComplete: updates.googleAdsHistoricalComplete }),
                        ...(updates.facebookAdsHistoricalComplete !== undefined && { facebookAdsHistoricalComplete: updates.facebookAdsHistoricalComplete }),
                        ...(updates.syncStatus !== undefined && { syncStatus: updates.syncStatus }),
                        ...(updates.ga4LastSyncedAt !== undefined && { ga4LastSyncedAt: updates.ga4LastSyncedAt }),
                        ...(updates.gscLastSyncedAt !== undefined && { gscLastSyncedAt: updates.gscLastSyncedAt }),
                        ...(updates.googleAdsLastSyncedAt !== undefined && { googleAdsLastSyncedAt: updates.googleAdsLastSyncedAt }),
                        ...(updates.facebookAdsLastSyncedAt !== undefined && { facebookAdsLastSyncedAt: updates.facebookAdsLastSyncedAt })
                    };
                }
                return newState;
            }),
            setUserSites: (sites) => set({ userSites: sites }),
            clearAccounts: () => set({ 
                ga4: {}, 
                gsc: {}, 
                googleAds: {}, 
                facebook: {}, 
                connectedSources: [], 
                gscSites: [], 
                userSites: [], 
                activeSiteId: null, 
                activeGscSite: null, 
                activeGa4PropertyId: null, 
                activeGoogleAdsCustomerId: null, 
                activeFacebookAdAccountId: null, 
                syncMetadata: { 
                    ga4HistoricalComplete: false,
                    gscHistoricalComplete: false,
                    googleAdsHistoricalComplete: false,
                    facebookAdsHistoricalComplete: false,
                    ga4LastSyncedAt: null,
                    gscLastSyncedAt: null,
                    googleAdsLastSyncedAt: null,
                    facebookAdsLastSyncedAt: null
                } 
            }),
        }),
        {
            name: 'accounts-storage',
        }
    )
);
