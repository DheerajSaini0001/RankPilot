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
            activeGscSite: null,
            activeGa4PropertyId: null,
            activeGoogleAdsCustomerId: null,
            activeFacebookAdAccountId: null,
            setAccounts: (accounts) => set({ ...accounts }),
            clearAccounts: () => set({ ga4: {}, gsc: {}, googleAds: {}, facebook: {}, connectedSources: [], gscSites: [], activeGscSite: null, activeGa4PropertyId: null, activeGoogleAdsCustomerId: null, activeFacebookAdAccountId: null }),
        }),
        {
            name: 'accounts-storage',
        }
    )
);
