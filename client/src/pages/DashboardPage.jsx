import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/ui/DashboardLayout';
import KpiCard from '../components/dashboard/KpiCard';
import DataTable from '../components/dashboard/DataTable';
import Button from '../components/ui/Button';
import { useDateRangeStore } from '../store/dateRangeStore';
import { useAccountsStore } from '../store/accountsStore';
import {
    UsersIcon,
    CursorArrowRaysIcon,
    CurrencyDollarIcon,
    ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import api from '../api';

const DashboardPage = () => {
    const { startDate, endDate, setPreset } = useDateRangeStore();
    const { connectedSources } = useAccountsStore();
    const [loading, setLoading] = useState(true);
    const [overviewData, setOverviewData] = useState({ ga4: null, gAds: null, fbAds: null, gsc: null });

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
            <div className="flex flex-col lg:flex-row gap-6">

                {/* Main Content */}
                <div className="flex-1 space-y-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Performance Overview</h1>
                        <div className="flex border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden text-sm">
                            {['7d', '14d', '28d', '90d'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPreset(p, '2023-01-01', '2023-01-28')} // Replace with actual date logic
                                    className={`px-3 py-1.5 transition-colors ${p === '28d' // Hardcoded for view
                                            ? 'bg-brand-50 text-brand-600 dark:bg-dark-card dark:text-brand-400 font-medium'
                                            : 'bg-white text-neutral-600 hover:bg-neutral-50 dark:bg-dark-surface dark:text-neutral-400 dark:hover:bg-neutral-800'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <KpiCard
                            title="Total Traffic"
                            value={overviewData.ga4?.rows?.[0]?.metricValues?.[1]?.value || '0'}
                            loading={loading}
                            Icon={UsersIcon}
                        />
                        <KpiCard
                            title="Total Ad Spend"
                            value={`$${(parseFloat(overviewData.fbAds?.spend || 0) + parseFloat(overviewData.gAds?.cost_micros || 0) / 1000000).toFixed(2)}`}
                            loading={loading}
                            Icon={CurrencyDollarIcon}
                        />
                        <KpiCard
                            title="Impressions"
                            value={(parseFloat(overviewData.fbAds?.impressions || 0) + parseFloat(overviewData.gAds?.impressions || 0)).toString()}
                            loading={loading}
                            Icon={CursorArrowRaysIcon}
                        />
                    </div>

                    {/* Chart area placeholder */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 shadow-sm h-80 flex flex-col">
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">Traffic & Conversions</h3>
                        {loading ? (
                            <div className="flex-1 animate-pulse bg-neutral-100 dark:bg-neutral-800 rounded"></div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-neutral-400">
                                Chart visualization goes here based on Recharts AreaChart
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Panel Right Sidebar */}
                <div className="w-full lg:w-96 flex flex-col gap-6">
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-xl flex flex-col h-[calc(100vh-8rem)]">
                        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center bg-brand-50/50 dark:bg-brand-900/20 rounded-t-xl">
                            <ChatBubbleLeftRightIcon className="w-5 h-5 text-brand-600 dark:text-brand-400 mr-2" />
                            <h3 className="font-semibold text-brand-900 dark:text-brand-100">AI Analyst</h3>
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto space-y-4 text-sm">
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

                        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800">
                            <form onSubmit={handleAskAi} className="relative">
                                <input
                                    type="text"
                                    value={aiQuery}
                                    onChange={e => setAiQuery(e.target.value)}
                                    placeholder="Ask about your metrics..."
                                    className="w-full bg-neutral-100 dark:bg-dark-surface border-transparent focus:border-brand-400 focus:bg-white dark:focus:bg-dark-card rounded-lg py-3 pl-4 pr-12 text-sm text-neutral-900 dark:text-white transition-colors outline-none ring-0"
                                    disabled={aiLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={aiLoading || !aiQuery}
                                    className="absolute right-2 top-2 p-1 bg-brand-600 hover:bg-brand-700 rounded-md text-white disabled:opacity-50 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
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
