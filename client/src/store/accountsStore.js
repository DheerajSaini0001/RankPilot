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
            setAccounts: (accounts) => set({ ...accounts }),
            clearAccounts: () => set({ ga4: {}, gsc: {}, googleAds: {}, facebook: {}, connectedSources: [] }),
        }),
        {
            name: 'accounts-storage',
        }
    )
);
