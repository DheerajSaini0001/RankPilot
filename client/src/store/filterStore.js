import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useFilterStore = create(
    persist(
        (set) => ({
            device: '', // mobile, desktop, tablet
            campaign: '',
            channel: '',
            searchQuery: '',
            setFilters: (filters) => set((state) => ({ ...state, ...filters })),
            setSearchQuery: (query) => set({ searchQuery: query }),
            resetFilters: () => set({ device: '', campaign: '', channel: '', searchQuery: '' }),
        }),
        {
            name: 'filter-storage',
        }
    )
);
