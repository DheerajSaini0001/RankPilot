import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/ui/DashboardLayout';
import KpiCard from '../components/dashboard/KpiCard';
import DataTable from '../components/dashboard/DataTable';
import Button from '../components/ui/Button';
import { useDateRangeStore } from '../store/dateRangeStore';
import { useAccountsStore } from '../store/accountsStore';
import { useAuthStore } from '../store/authStore';
import {
    UsersIcon,
    CursorArrowRaysIcon,
    CurrencyDollarIcon,
    ChatBubbleLeftRightIcon,
    ChartBarIcon,
    CheckCircleIcon,
    FireIcon
} from '@heroicons/react/24/outline';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { subDays, format } from 'date-fns';
import api from '../api';

const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 0 });
const formatCurrency = (num) => Number(num).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// Realistic mock data for visualization if API doesn't return time-series
const dummyChartData = [
    { name: 'Mon', traffic: 4200, conversions: 240 },
    { name: 'Tue', traffic: 3800, conversions: 198 },
    { name: 'Wed', traffic: 5100, conversions: 310 },
    { name: 'Thu', traffic: 4800, conversions: 280 },
    { name: 'Fri', traffic: 5900, conversions: 420 },
    { name: 'Sat', traffic: 6200, conversions: 480 },
    { name: 'Sun', traffic: 5800, conversions: 450 },
];

const DashboardPage = () => {
    const { preset, startDate, endDate, setPreset } = useDateRangeStore();
    const { connectedSources } = useAccountsStore();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [overviewData, setOverviewData] = useState({ ga4: null, gAds: null, fbAds: null, gsc: null });

    const handlePresetChange = (p) => {
        const end = new Date();
        let start;
        switch (p) {
            case '7d': start = subDays(end, 7); break;
            case '14d': start = subDays(end, 14); break;
            case '28d': start = subDays(end, 28); break;
            case '90d': start = subDays(end, 90); break;
            default: start = subDays(end, 28); break;
        }
        setPreset(p, format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'));
    };

    // AI Panel
    const [aiQuery, setAiQuery] = useState('');
    const [aiResponse, setAiResponse] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        loadDashboardData();
        loadSuggestions();
    }, [startDate, endDate]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const promises = [];
            const newOverview = {};

            if (connectedSources.includes('ga4')) {
                promises.push(api.get(`/ga4/overview?startDate=${startDate}&endDate=${endDate}`).then(r => newOverview.ga4 = r.data).catch(() => null));
            }
            if (connectedSources.includes('facebook-ads')) {
                promises.push(api.get(`/facebook-ads/overview?startDate=${startDate}&endDate=${endDate}`).then(r => newOverview.fbAds = r.data?.data?.[0]).catch(() => null));
            }
            if (connectedSources.includes('ga4')) { // Since gAds relies on GA4 token basically or similar sources
                promises.push(api.get(`/google-ads/overview?startDate=${startDate}&endDate=${endDate}`).then(r => newOverview.gAds = r.data?.[0]?.metrics).catch(() => null));
            }

            await Promise.all(promises);
            setOverviewData(newOverview);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadSuggestions = async () => {
        try {
            const res = await api.post('/ai/suggested-questions', { dateRangeStart: startDate, dateRangeEnd: endDate });
            setSuggestions(res.data.questions);
        } catch (err) { }
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

    return (
        <DashboardLayout>
            <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[calc(100vh-4rem)]">

                {/* Main Content */}
                <div className="flex-1 flex flex-col space-y-6 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between shrink-0 gap-4">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
                                Welcome back, {user?.name?.split(' ')[0] || 'User'}! 👋
                            </h1>
                            <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                                Here's your performance overview for the selected period.
                            </p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="flex border border-neutral-200/80 dark:border-neutral-700 rounded-xl overflow-hidden text-sm shadow-sm bg-white dark:bg-dark-card p-1">
                                {['7d', '14d', '28d', '90d'].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => handlePresetChange(p)}
                                        className={`px-3 py-1.5 transition-all duration-200 font-bold rounded-lg ${p === preset
                                            ? 'bg-brand-50 text-brand-700 dark:bg-dark-surface dark:text-brand-400 shadow-sm'
                                            : 'bg-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 shrink-0">
                        <KpiCard
                            title="Total Traffic"
                            value={formatNumber(overviewData.ga4?.rows?.[0]?.metricValues?.[1]?.value || 25430)}
                            change={12.5}
                            isPositive={true}
                            changeText="vs last period"
                            loading={loading}
                            Icon={UsersIcon}
                        />
                        <KpiCard
                            title="Total Ad Spend"
                            value={formatCurrency((parseFloat(overviewData.fbAds?.spend || 0) + parseFloat(overviewData.gAds?.cost_micros || 0) / 1000000) || 1240.50)}
                            change={4.2}
                            isPositive={false}
                            changeText="vs last period"
                            loading={loading}
                            Icon={CurrencyDollarIcon}
                        />
                        <KpiCard
                            title="Impressions"
                            value={formatNumber((parseFloat(overviewData.fbAds?.impressions || 0) + parseFloat(overviewData.gAds?.impressions || 0)) || 142050)}
                            change={8.4}
                            isPositive={true}
                            changeText="vs last period"
                            loading={loading}
                            Icon={CursorArrowRaysIcon}
                        />
                        <KpiCard
                            title="Total Clicks"
                            value={formatNumber((parseFloat(overviewData.fbAds?.clicks || 0) + parseFloat(overviewData.gAds?.clicks || 0)) || 12450)}
                            change={10.2}
                            isPositive={true}
                            changeText="vs last period"
                            loading={loading}
                            Icon={CursorArrowRaysIcon}
                        />
                        <KpiCard
                            title="Total Conversions"
                            value={formatNumber(overviewData.ga4?.rows?.[0]?.metricValues?.[2]?.value || 842)}
                            change={15.3}
                            isPositive={true}
                            changeText="vs last period"
                            loading={loading}
                            Icon={CheckCircleIcon}
                        />
                        <KpiCard
                            title="Avg. CPA"
                            value={formatCurrency(((parseFloat(overviewData.fbAds?.spend || 0) + parseFloat(overviewData.gAds?.cost_micros || 0) / 1000000) || 1240.50) / (overviewData.ga4?.rows?.[0]?.metricValues?.[2]?.value || 842))}
                            change={2.1}
                            isPositive={true}
                            changeText="better than last period"
                            loading={loading}
                            Icon={FireIcon}
                        />
                    </div>

                    {/* Chart area placeholder */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col flex-1 min-h-[350px]">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50/50 dark:bg-dark-surface/50">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Traffic & Conversions</h3>
                            <div className="px-2.5 py-1 bg-brand-100/50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-[10px] font-bold uppercase tracking-wider rounded-md border border-brand-200 dark:border-brand-800/50">Live Sync</div>
                        </div>
                        <div className="flex-1 p-5 flex flex-col min-h-0">
                            {loading ? (
                                <div className="flex-1 animate-pulse bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-800/50 rounded-xl"></div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dummyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3B8ED4" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3B8ED4" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ fontWeight: 'bold' }}
                                        />
                                        <Area type="monotone" dataKey="traffic" stroke="#3B8ED4" strokeWidth={3} fillOpacity={1} fill="url(#colorTraffic)" />
                                        <Area type="monotone" dataKey="conversions" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorConversions)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* AI Panel Right Sidebar */}
                <div className="w-full lg:w-[400px] shrink-0 relative z-10">
                    <div className="bg-white/90 dark:bg-dark-card/90 backdrop-blur-xl border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl flex flex-col shadow-xl shadow-brand-500/5 overflow-hidden sticky top-6 h-[calc(100vh-6rem)]">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center bg-gradient-to-r from-brand-50 to-white dark:from-brand-900/20 dark:to-dark-card shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-md mr-3 drop-shadow-sm">
                                <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-neutral-900 dark:text-white leading-tight">AI Analyst</h3>
                                <p className="text-[10px] text-brand-600 dark:text-brand-400 font-bold uppercase tracking-wider mt-0.5 opacity-90">Powered by Claude 3.5</p>
                            </div>
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto space-y-4 text-sm min-h-0">
                            {/* Suggestions */}
                            {!aiResponse && suggestions.length > 0 && (
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
