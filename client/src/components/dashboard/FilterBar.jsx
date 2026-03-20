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

const FilterBar = ({ showDevice = true, showCampaign = false, showChannel = false, onRefresh, loading }) => {
    const { preset, setPreset, startDate, endDate } = useDateRangeStore();
    const { device, campaign, channel, setFilters, resetFilters } = useFilterStore();
    const [showPicker, setShowPicker] = React.useState(false);
    const [tempDates, setTempDates] = React.useState({ start: startDate, end: endDate });

    const { 
        syncMetadata, 
        activeGa4PropertyId,
        activeGscSite,
        activeGoogleAdsCustomerId,
        activeFacebookAdAccountId
    } = useAccountsStore();

    // Sync temp dates when store changes or picker opens
    React.useEffect(() => {
        if (showPicker) {
            setTempDates({ start: startDate, end: endDate });
        }
    }, [showPicker, startDate, endDate]);

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
            // Current day
        } else if (p.value === 'yesterday') {
            start.setDate(start.getDate() - 1);
            end.setDate(end.getDate() - 1);
        } else {
            start.setDate(start.getDate() - p.days);
        }
        
        const startStr = fmt(start);
        const endStr = fmt(end);
        setPreset(p.value, startStr, endStr);
        setTempDates({ start: startStr, end: endStr });
        setShowPicker(false);
    };

    const handleApplyCustomRange = () => {
        setPreset('custom', tempDates.start, tempDates.end);
        setShowPicker(false);
    };

    return (
        <div className="relative mb-6">
            <div className="bg-white dark:bg-dark-card border border-neutral-200/70 dark:border-neutral-700/50 rounded-2xl px-4 py-2.5 shadow-sm flex items-center gap-3 overflow-x-auto no-scrollbar transition-all hover:shadow-md">
                
                {/* Date Presets */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => setShowPicker(!showPicker)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                            showPicker
                                ? 'bg-brand-600 text-white shadow-md'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600'
                        }`}
                    >
                        <CalendarIcon className="w-4 h-4" />
                    </button>

                    <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl p-0.5 gap-0.5">
                        {datePresets.map((p) => (
                            <button
                                key={p.value}
                                onClick={() => handleDatePreset(p)}
                                className={`px-2.5 py-1.5 text-[11px] font-black rounded-lg transition-all ${
                                    preset === p.value
                                        ? 'bg-white dark:bg-neutral-700 text-brand-600 dark:text-brand-400 shadow-sm'
                                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setShowPicker(!showPicker)}
                        className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 hover:text-brand-500 transition-colors whitespace-nowrap hidden md:block"
                    >
                        {startDate} — {endDate}
                    </button>
                </div>

                <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700 shrink-0 hidden sm:block"/>

                {/* Device Filter */}
                {showDevice && (
                    <>
                        <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700 shrink-0 hidden sm:block"/>
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                                <FunnelIcon className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400"/>
                            </div>
                            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl p-0.5 gap-0.5">
                                {[
                                    { label: 'All',     value: '',        icon: FunnelIcon },
                                    { label: 'Mobile',  value: 'mobile',  icon: DevicePhoneMobileIcon },
                                    { label: 'Desktop', value: 'desktop', icon: ComputerDesktopIcon },
                                    { label: 'Tablet',  value: 'tablet',  icon: DeviceTabletIcon },
                                ].map((d) => (
                                    <button
                                        key={d.value}
                                        onClick={() => setFilters({ device: d.value })}
                                        title={d.label}
                                        className={`px-2.5 py-1.5 text-[11px] font-black rounded-lg transition-all flex items-center gap-1 ${
                                            device === d.value
                                                ? 'bg-white dark:bg-neutral-700 text-amber-600 dark:text-amber-400 shadow-sm'
                                                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                                        }`}
                                    >
                                        <d.icon className="w-3 h-3"/>
                                        <span className="hidden lg:inline">{d.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Campaign/Channel Filter */}
                {(showCampaign || showChannel) && (
                    <>
                        <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700 shrink-0 hidden sm:block"/>
                        <div className="flex-1 min-w-[160px] max-w-[260px] relative">
                            <input
                                type="text"
                                placeholder={showCampaign ? 'Filter campaign...' : 'Filter channel...'}
                                value={showCampaign ? campaign : channel}
                                onChange={(e) => setFilters(showCampaign ? { campaign: e.target.value } : { channel: e.target.value })}
                                className="w-full pl-3 pr-8 py-2 bg-neutral-100 dark:bg-neutral-800 border border-transparent rounded-xl text-[11px] font-bold text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                            />
                            {(campaign || channel) && (
                                <button
                                    onClick={resetFilters}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-red-500 transition-colors"
                                >
                                    <XMarkIcon className="w-3.5 h-3.5"/>
                                </button>
                            )}
                        </div>
                    </>
                )}

                {/* Clear Filters */}
                {(device || campaign || channel) && (
                    <button
                        onClick={resetFilters}
                        className="text-[11px] font-black text-red-500 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-all shrink-0"
                    >
                        Clear
                    </button>
                )}

                {/* Right Side - Refresh + Sync */}
                <div className="ml-auto flex items-center gap-2 shrink-0 pl-3 border-l border-neutral-200 dark:border-neutral-700">
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            disabled={loading}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                loading
                                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600 dark:hover:text-brand-400 active:scale-90'
                            }`}
                            title="Refresh data"
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/>
                        </button>
                    )}

                    {(activeGa4PropertyId || activeGscSite || activeGoogleAdsCustomerId || activeFacebookAdAccountId) ? (
                        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-black transition-all ${
                            syncMetadata.syncStatus === 'syncing'
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800 animate-pulse'
                                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
                        }`}>
                            {syncMetadata.syncStatus === 'syncing'
                                ? <ArrowPathIcon className="w-3 h-3 animate-spin"/>
                                : <CheckCircleIcon className="w-3 h-3"/>
                            }
                            <span className="hidden sm:inline uppercase tracking-wide">
                                {syncMetadata.syncStatus === 'syncing' ? 'Syncing' : 'Synced'}
                            </span>
                        </div>
                    ) : (
                        <a
                            href="/connect-accounts"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-[10px] font-black transition-all hover:scale-105 active:scale-95 shadow-sm shadow-brand-500/20"
                        >
                            <CloudArrowUpIcon className="w-3.5 h-3.5"/>
                            <span className="hidden sm:inline">Connect</span>
                        </a>
                    )}

                    {syncMetadata.lastDailySyncAt && syncMetadata.syncStatus !== 'syncing' && !loading && (
                        <div className="hidden xl:flex flex-col items-end pl-3 border-l border-neutral-200 dark:border-neutral-700">
                            <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400 leading-none">Last Sync</span>
                            <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300 mt-0.5">
                                {new Date(syncMetadata.lastDailySyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Date Picker Dropdown */}
            {showPicker && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-xl p-5 flex flex-col sm:flex-row items-end gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Start Date</label>
                        <input
                            type="date"
                            value={tempDates.start}
                            onChange={(e) => setTempDates(prev => ({ ...prev, start: e.target.value }))}
                            className="bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                        />
                    </div>
                    <div className="w-6 h-px bg-neutral-300 dark:bg-neutral-700 hidden sm:block mb-4"/>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">End Date</label>
                        <input
                            type="date"
                            value={tempDates.end}
                            onChange={(e) => setTempDates(prev => ({ ...prev, end: e.target.value }))}
                            className="bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={handleApplyCustomRange}
                        className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-black rounded-xl shadow-lg shadow-brand-500/20 transition-all hover:-translate-y-0.5 active:scale-95 uppercase tracking-wider whitespace-nowrap"
                    >
                        Apply Range
                    </button>
                    <button
                        onClick={() => setShowPicker(false)}
                        className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                    >
                        <XMarkIcon className="w-4 h-4"/>
                    </button>
                </div>
            )}
        </div>
    );
};

export default FilterBar;
