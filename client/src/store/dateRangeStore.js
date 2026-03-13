import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { subDays, format } from 'date-fns';

const today = new Date();
const endDate = format(today, 'yyyy-MM-dd');
const startDate = format(subDays(today, 7), 'yyyy-MM-dd');

export const useDateRangeStore = create(
    persist(
        (set) => ({
            preset: '7d',
            startDate: startDate,
            endDate: endDate,
            setPreset: (preset, startDate, endDate) => set({ preset, startDate, endDate }),
            setCustomRange: (startDate, endDate) => set({ preset: 'custom', startDate, endDate }),
        }),
        {
            name: 'date-range-storage',
        }
    )
);
