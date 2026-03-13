import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/ui/DashboardLayout';
import KpiCard from '../components/dashboard/KpiCard';
import { useDateRangeStore } from '../store/dateRangeStore';
import { useAccountsStore } from '../store/accountsStore';
import {
    UsersIcon,
    CursorArrowRaysIcon,
    ChatBubbleLeftRightIcon,
    CheckCircleIcon,
    BanknotesIcon,
    MagnifyingGlassIcon,
    CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import api from '../api';
import FilterBar from '../components/dashboard/FilterBar';
import { useFilterStore } from '../store/filterStore';

const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 0 });
const formatCurrency = (num) => Number(num).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const DashboardPage = () => {
    const { preset, startDate, endDate } = useDateRangeStore();
    const { device, campaign, channel } = useFilterStore();
    const { connectedSources, activeGscSite, syncMetadata, setAccounts } = useAccountsStore();
    const [loading, setLoading] = useState(true);
    const [overviewData, setOverviewData] = useState({ ga4: null, gAds: null, fbAds: null, gsc: null });
    const [timeseriesData, setTimeseriesData] = useState([]);

    // AI Panel
    const [aiQuery, setAiQuery] = useState('');
    const [aiResponse, setAiResponse] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await api.get('/accounts/active');
                const data = res.data || {};
                setAccounts({
                    activeGscSite: data.gscSiteUrl || '',
                    activeGa4PropertyId: data.ga4PropertyId || '',
                    activeGoogleAdsCustomerId: data.googleAdsCustomerId || '',
                    activeFacebookAdAccountId: data.facebookAdAccountId || '',
                    syncMetadata: {
                        isHistoricalSyncComplete: data.isHistoricalSyncComplete || false,
                        lastDailySyncAt: data.lastDailySyncAt || null,
                        syncStatus: data.syncStatus || 'idle'
                    }
                });
            } catch (err) {
                console.error('Failed to fetch initial sync status', err);
            }
        };
        fetchStatus();
        loadDashboardData();
        loadSuggestions();
    }, [startDate, endDate, connectedSources, activeGscSite, device, campaign, channel]);

    // Poll sync status if syncing
    useEffect(() => {
        let interval;
        if (syncMetadata.syncStatus === 'syncing') {
            interval = setInterval(async () => {
                try {
                    const res = await api.get('/accounts/active');
                    const data = res.data || {};
                    setAccounts({
                        activeGscSite: data.gscSiteUrl || '',
                        activeGa4PropertyId: data.ga4PropertyId || '',
                        activeGoogleAdsCustomerId: data.googleAdsCustomerId || '',
                        activeFacebookAdAccountId: data.facebookAdAccountId || '',
                        syncMetadata: {
                            isHistoricalSyncComplete: data.isHistoricalSyncComplete || false,
                            lastDailySyncAt: data.lastDailySyncAt || null,
                            syncStatus: data.syncStatus || 'idle'
                        }
                    });
                    if (data.syncStatus !== 'syncing') {
                        clearInterval(interval);
                        loadDashboardData(); // Reload data once sync is finished
                    }
                } catch (err) {
                    console.error('Failed to poll sync status', err);
                }
            }, 5000); // Poll every 5 seconds
        }
        return () => clearInterval(interval);
    }, [syncMetadata.syncStatus]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                startDate,
                endDate,
                ...(device && { device }),
                ...(campaign && { campaign }),
                ...(channel && { channel })
            }).toString();

            const res = await api.get(`/analytics/dashboard-summary?${query}`);
            const data = res.data;

            setOverviewData({
                ga4: data.ga4,
                gsc: data.gsc,
                gAds: {
                    cost: data.googleAds.spend,
                    impressions: data.googleAds.impressions,
                    clicks: data.googleAds.clicks,
                    conversions: data.googleAds.conversions
                },
                fbAds: data.facebookAds
            });

            if (data.timeseries) {
                setTimeseriesData(data.timeseries);
            } else {
                setTimeseriesData([]);
            }

        } catch (err) {
            console.error('Failed to load unified dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadSuggestions = async () => {
        setSuggestionsLoading(true);
        try {
            const res = await api.post('/ai/suggested-questions', { dateRangeStart: startDate, dateRangeEnd: endDate });
            setSuggestions(res.data.questions);
        } catch (err) {
            setSuggestions([
                "How is my overall traffic doing?",
                "Compare my ad spend to conversions",
                "What are my top performing pages?"
            ]);
        } finally {
            setSuggestionsLoading(false);
        }
    };

    const handleAskAi = async (e) => {
        e.preventDefault();
        if (!aiQuery) return;
        setAiLoading(true);
        setAiResponse(null);
        try {
            const res = await api.post('/ai/ask', {
                question: aiQuery,
                dateRangeStart: startDate,
                dateRangeEnd: endDate,
                activeSources: connectedSources,
                data: overviewData
            });
            setAiResponse(res.data.answer);
            setAiQuery('');
        } catch (err) {
            console.error(err);
        } finally {
            setAiLoading(false);
        }
    };

    // Calculate aggregated metrics
    const totalTraffic = (overviewData.ga4?.sessions || 0);
    const searchClicks = (overviewData.gsc?.clicks || 0);
    const totalAdSpend = (overviewData.fbAds?.spend || 0) + (overviewData.gAds?.cost || 0);
    const totalAdImpressions = (overviewData.fbAds?.impressions || 0) + (overviewData.gAds?.impressions || 0);
    const totalAdClicks = (overviewData.fbAds?.clicks || 0) + (overviewData.gAds?.clicks || 0);
    const totalConversions = (overviewData.gAds?.conversions || 0);

    // Provide a generic shape if we don't have GA4 yet to preview the UI elegantly
    const chartDataToUse = timeseriesData.length > 0 ? timeseriesData : [
        { date: 'Fetching data...', traffic: 0 }
    ];

    const isDataEmpty = totalTraffic === 0 && searchClicks === 0 && totalAdSpend === 0;

    return (
        <DashboardLayout>
            <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-4rem)] items-start">

                {/* Main Content */}
                <div className="flex-1 flex flex-col space-y-6 min-w-0">

                    <FilterBar />

                    {isDataEmpty && !loading && (preset === 'today' || preset === 'yesterday') && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                            <CloudArrowUpIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100">Historical Data is Syncing</h4>
                                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                    We are currently fetching your last 5 years of data. Analytics platforms like GSC and Ads can also have a 24-48h processing delay.
                                    <button onClick={() => useDateRangeStore.getState().setPreset('28d', '', '')} className="ml-2 underline font-bold">Try selecting 'Last 28 Days'</button> to see recent activity.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 shrink-0">
                        <KpiCard
                            title="Total Traffic (GA4)"
                            value={formatNumber(totalTraffic)}
                            loading={loading}
                            Icon={UsersIcon}
                        />
                        <KpiCard
                            title="Total Ad Spend"
                            value={formatCurrency(totalAdSpend)}
                            loading={loading}
                            Icon={BanknotesIcon}
                        />
                        <KpiCard
                            title="Paid Ad Impressions"
                            value={formatNumber(totalAdImpressions)}
                            loading={loading}
                            Icon={CursorArrowRaysIcon}
                        />
                        <KpiCard
                            title="Paid Ad Clicks"
                            value={formatNumber(totalAdClicks)}
                            loading={loading}
                            Icon={CursorArrowRaysIcon}
                        />
                        <KpiCard
                            title="Organic Search Clicks"
                            value={formatNumber(searchClicks)}
                            loading={loading}
                            Icon={MagnifyingGlassIcon}
                        />
                        <KpiCard
                            title="Ad Conversions"
                            value={formatNumber(totalConversions)}
                            loading={loading}
                            Icon={CheckCircleIcon}
                        />
                    </div>

                    {/* Chart area */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col flex-1 min-h-[350px]">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50/50 dark:bg-dark-surface/50">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Overall Traffic Trend</h3>
                            <div className="flex items-center gap-3">
                                {connectedSources.includes('ga4') && (
                                    <div className="px-2.5 py-1 bg-brand-100/50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-[10px] font-bold uppercase tracking-wider rounded-md border border-brand-200 dark:border-brand-800/50">
                                        Live GA4 Data
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 p-5 flex flex-col min-h-0">
                            {loading ? (
                                <div className="flex-1 animate-pulse bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-800/50 rounded-xl"></div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartDataToUse} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3B8ED4" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3B8ED4" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ fontWeight: 'bold' }}
                                        />
                                        <Area type="monotone" dataKey="traffic" stroke="#3B8ED4" strokeWidth={3} fillOpacity={1} fill="url(#colorTraffic)" name="Sessions" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* AI Panel Right Sidebar Placeholder (keeps main content spaced properly) */}
                <div className="hidden lg:block lg:w-[400px] shrink-0 pointer-events-none"></div>

                {/* AI Panel Right Sidebar (Fixed to viewport) */}
                <div className="w-full lg:w-[400px] shrink-0 lg:fixed lg:right-8 lg:top-[106px] z-10 transition-all duration-300">
                    <div className="bg-white/90 dark:bg-dark-card/90 backdrop-blur-xl border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl flex flex-col shadow-xl shadow-brand-500/5 overflow-hidden h-[calc(100vh-8rem)] lg:max-h-[850px]">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center bg-gradient-to-r from-brand-50 to-white dark:from-brand-900/20 dark:to-dark-card shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-md mr-3 drop-shadow-sm">
                                <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-neutral-900 dark:text-white leading-tight">AI Analyst</h3>
                            </div>
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto space-y-4 text-sm min-h-0">
                            {/* Suggestions */}
                            {!aiResponse && suggestionsLoading && (
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <svg className="animate-spin h-3.5 w-3.5 text-brand-500" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <p className="font-medium text-brand-600 dark:text-brand-400 text-xs uppercase tracking-wider">Generating Ideas...</p>
                                    </div>
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="w-full h-[46px] bg-neutral-100 dark:bg-neutral-800/80 animate-pulse rounded-lg border border-transparent"></div>
                                    ))}
                                </div>
                            )}

                            {!aiResponse && !suggestionsLoading && suggestions.length > 0 && (
                                <div className="space-y-2">
                                    <p className="font-medium text-neutral-600 dark:text-neutral-400 text-xs uppercase tracking-wider mb-2">Suggested Questions</p>
                                    {suggestions.map((q, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setAiQuery(q)}
                                            className="w-full text-left p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-dark-surface dark:hover:border-brand-700 transition-colors text-neutral-700 dark:text-neutral-300"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Response */}
                            {aiLoading && (
                                <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Analyzing data...</span>
                                </div>
                            )}

                            {aiResponse && (
                                <div className="prose prose-sm dark:prose-invert prose-brand max-w-none bg-neutral-50 dark:bg-dark-surface p-4 rounded-lg border border-neutral-100 dark:border-neutral-800 whitespace-pre-wrap">
                                    {aiResponse}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/80 dark:bg-dark-surface/80 shrink-0">
                            <form onSubmit={handleAskAi} className="relative flex items-center shadow-sm rounded-xl overflow-hidden bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 focus-within:border-brand-400 focus-within:ring-1 focus-within:ring-brand-400 transition-all duration-300">
                                <input
                                    type="text"
                                    value={aiQuery}
                                    onChange={e => setAiQuery(e.target.value)}
                                    placeholder="Ask about your metrics..."
                                    className="w-full bg-transparent py-3.5 pl-4 pr-12 text-sm text-neutral-900 dark:text-white outline-none placeholder:text-neutral-400"
                                    disabled={aiLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={aiLoading || !aiQuery}
                                    className="absolute right-1.5 p-2 bg-brand-600 hover:bg-brand-700 rounded-lg text-white disabled:opacity-50 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 transition-colors shadow-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
};

export default DashboardPage;
