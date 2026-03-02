import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { subDays, format } from 'date-fns';

const defaultStart = format(subDays(new Date(), 28), 'yyyy-MM-dd');
const defaultEnd = format(new Date(), 'yyyy-MM-dd');

export const useDateRangeStore = create(
    persist(
        (set) => ({
            preset: '28d',
            startDate: defaultStart,
            endDate: defaultEnd,
            setPreset: (preset, startDate, endDate) => set({ preset, startDate, endDate }),
            setCustomRange: (startDate, endDate) => set({ preset: 'custom', startDate, endDate }),
        }),
        {
            name: 'date-range-storage',
        }
    )
);
