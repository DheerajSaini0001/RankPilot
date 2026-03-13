import React from 'react';
import { useDateRangeStore } from '../../store/dateRangeStore';
import { useFilterStore } from '../../store/filterStore';
import { useAccountsStore } from '../../store/accountsStore';
import { 
    CalendarIcon, 
    DevicePhoneMobileIcon, 
    ComputerDesktopIcon, 
    DeviceTabletIcon,
    FunnelIcon,
    XMarkIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    CloudArrowUpIcon
} from '@heroicons/react/24/outline';

const FilterBar = ({ showDevice = true, showCampaign = false, showChannel = false }) => {
    const { preset, setPreset, startDate, endDate } = useDateRangeStore();
    const { device, campaign, channel, setFilters, resetFilters } = useFilterStore();
    const { 
        syncMetadata, 
        activeGa4PropertyId,
        activeGscSite,
        activeGoogleAdsCustomerId,
        activeFacebookAdAccountId
    } = useAccountsStore();

    const datePresets = [
        { label: 'Today', value: 'today', days: 0 },
        { label: 'Yesterday', value: 'yesterday', days: 1 },
        { label: '7D', value: '7d', days: 7 },
        { label: '28D', value: '28d', days: 28 },
        { label: '90D', value: '90d', days: 90 },
        { label: '1Y', value: '1y', days: 365 },
    ];

    const handleDatePreset = (p) => {
        const fmt = (d) => {
            const date = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
            return date.toISOString().split('T')[0];
        };
        
        let start = new Date();
        let end = new Date();

        if (p.value === 'today') {
            // Current day for both
        } else if (p.value === 'yesterday') {
            start.setDate(start.getDate() - 1);
            end.setDate(end.getDate() - 1);
        } else {
            start.setDate(start.getDate() - p.days);
        }
        
        setPreset(p.value, fmt(start), fmt(end));
    };

    return (
        <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl p-4 mb-6 shadow-sm flex flex-wrap items-center gap-4 transition-all overflow-x-auto no-scrollbar">
            {/* Date Range Section */}
            <div className="flex items-center gap-2 pr-4 border-r border-neutral-100 dark:border-neutral-800">
                <div className="p-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-lg">
                    <CalendarIcon className="w-5 h-5" />
                </div>
                <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
                    {datePresets.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => handleDatePreset(p)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                preset === p.value 
                                ? 'bg-white dark:bg-neutral-700 text-brand-600 dark:text-white shadow-sm' 
                                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                <div className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 ml-2 whitespace-nowrap">
                    {startDate} — {endDate}
                </div>
            </div>

            {/* Device Filter */}
            {showDevice && (
                <div className="flex items-center gap-2 pr-4 border-r border-neutral-100 dark:border-neutral-800">
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg">
                        <FunnelIcon className="w-5 h-5" />
                    </div>
                    <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
                        {[
                            { label: 'All', value: '', icon: FunnelIcon },
                            { label: 'Mobile', value: 'mobile', icon: DevicePhoneMobileIcon },
                            { label: 'Desktop', value: 'desktop', icon: ComputerDesktopIcon },
                            { label: 'Tablet', value: 'tablet', icon: DeviceTabletIcon },
                        ].map((d) => (
                            <button
                                key={d.label}
                                onClick={() => setFilters({ device: d.value })}
                                title={d.label}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                    device === d.value 
                                    ? 'bg-white dark:bg-neutral-700 text-amber-600 dark:text-white shadow-sm' 
                                    : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                                }`}
                            >
                                <d.icon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{d.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Campaign/Channel Filter (Simple Input for now) */}
            {(showCampaign || showChannel) && (
                <div className="flex-1 min-w-[200px] flex items-center gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder={showCampaign ? "Filter by campaign..." : "Filter by channel..."}
                            value={showCampaign ? campaign : channel}
                            onChange={(e) => setFilters(showCampaign ? { campaign: e.target.value } : { channel: e.target.value })}
                            className="w-full pl-4 pr-10 py-2.5 bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl text-xs font-bold text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:ring-2 focus:ring-brand-500 transition-all"
                        />
                        {(campaign || channel) && (
                            <button 
                                onClick={() => resetFilters()}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Reset All */}
            {(device || campaign || channel) && (
                <button
                    onClick={resetFilters}
                    className="px-4 py-2 text-xs font-black text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                >
                    Clear Filters
                </button>
            )}

            {/* Sync Status Section */}
            {(activeGa4PropertyId || activeGscSite || activeGoogleAdsCustomerId || activeFacebookAdAccountId) ? (
                <div className="ml-auto flex items-center gap-3 pl-4 border-l border-neutral-100 dark:border-neutral-800">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                        syncMetadata.syncStatus === 'syncing' 
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800 animate-pulse' 
                        : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
                    }`}>
                        {syncMetadata.syncStatus === 'syncing' ? (
                            <>
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                <span className="text-[11px] font-bold whitespace-nowrap">Syncing historical...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon className="w-4 h-4" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] leading-none font-black uppercase tracking-wider">Data Synced</span>
                                    {syncMetadata.lastDailySyncAt && (
                                        <span className="text-[9px] font-bold opacity-80 whitespace-nowrap mt-0.5">
                                            Last: {new Date(syncMetadata.lastDailySyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <div className="ml-auto pl-4 border-l border-neutral-100 dark:border-neutral-800">
                    <a 
                        href="/connect-accounts"
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-brand-500/20 hover:scale-105 active:scale-95 animate-pulse"
                    >
                        <CloudArrowUpIcon className="w-4 h-4" />
                        <span>Connect Accounts</span>
                    </a>
                </div>
            )}
        </div>
    );
};

export default FilterBar;
