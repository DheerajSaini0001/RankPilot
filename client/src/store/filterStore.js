import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useFilterStore = create(
    persist(
        (set) => ({
            device: '', // mobile, desktop, tablet
            campaign: '',
            channel: '',
            setFilters: (filters) => set((state) => ({ ...state, ...filters })),
            resetFilters: () => set({ device: '', campaign: '', channel: '' }),
        }),
        {
            name: 'filter-storage',
        }
    )
);
