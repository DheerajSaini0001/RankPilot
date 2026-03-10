import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/ui/DashboardLayout';
import KpiCard from '../components/dashboard/KpiCard';
import DataTable from '../components/dashboard/DataTable';
import { useDateRangeStore } from '../store/dateRangeStore';
import { useAccountsStore } from '../store/accountsStore';
import api from '../api';
import {
    CursorArrowRaysIcon,
    MagnifyingGlassIcon,
    ChartBarIcon,
    InformationCircleIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 0 });

const GscPage = () => {
    const { startDate, endDate } = useDateRangeStore();
    const { activeGscSite, connectedSources } = useAccountsStore();
    const isConnected = connectedSources.includes('gsc');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    const [overview, setOverview] = useState(null);
    const [timeseries, setTimeseries] = useState([]);
    const [queries, setQueries] = useState([]);
    const [pages, setPages] = useState([]);

    useEffect(() => {
        if (!activeGscSite) return;
        
        const loadData = async () => {
            setLoading(true);
            try {
                const [overviewRes, timeseriesRes, queriesRes, pagesRes] = await Promise.all([
                    api.get(`/gsc/overview?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: null })),
                    api.get(`/gsc/timeseries?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: { rows: [] } })),
                    api.get(`/gsc/queries?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: { rows: [] } })),
                    api.get(`/gsc/pages?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: { rows: [] } })),
                ]);

                if (overviewRes.data && overviewRes.data.rows && overviewRes.data.rows[0]) {
                    setOverview(overviewRes.data.rows[0]);
                } else {
                    setOverview({ clicks: 0, impressions: 0, ctr: 0, position: 0 });
                }

                if (timeseriesRes.data && timeseriesRes.data.rows) {
                    const formattedChart = timeseriesRes.data.rows.map(row => ({
                        date: row.keys[0],
                        clicks: row.clicks,
                        impressions: row.impressions
                    })).sort((a, b) => new Date(a.date) - new Date(b.date));
                    setTimeseries(formattedChart);
                } else {
                    setTimeseries([]);
                }

                if (queriesRes.data && queriesRes.data.rows) {
                    setQueries(queriesRes.data.rows.slice(0, 10).map(r => ({ ...r, query: r.keys[0] })));
                } else {
                    setQueries([]);
                }

                if (pagesRes.data && pagesRes.data.rows) {
                    setPages(pagesRes.data.rows.slice(0, 10).map(r => ({ ...r, page: r.keys[0] })));
                } else {
                    setPages([]);
                }
            } catch (err) {
                console.error("GSC fetch err", err);
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, [activeGscSite, startDate, endDate]);

    if (!connectedSources.includes('ga4')) {
        return (
            <DashboardLayout>
                <div className="flex flex-col h-full items-center justify-center">
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700/60 p-8 rounded-2xl flex flex-col items-center text-center max-w-sm">
                        <ExclamationTriangleIcon className="w-12 h-12 text-neutral-400 mb-4" />
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Google Not Connected</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 mb-5">Please go to Integrations to connect your Google account to enable Search Console data.</p>
                        <button onClick={() => navigate('/connect-accounts')} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors">Go to Integrations</button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!activeGscSite) {
        return (
            <DashboardLayout>
                <div className="flex flex-col h-full items-center justify-center">
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700/60 p-8 rounded-2xl flex flex-col items-center text-center max-w-sm">
                        <MagnifyingGlassIcon className="w-12 h-12 text-amber-400 mb-4" />
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">No Site Selected</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 mb-5">Google is connected, but no Search Console site has been selected. Pick one from the sidebar dropdown or go to Integrations.</p>
                        <button onClick={() => navigate('/connect-accounts')} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors">Select a Site</button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const queryColumns = [
        { header: 'Query', accessor: 'query' },
        { header: 'Clicks', cell: (row) => formatNumber(row.clicks) },
        { header: 'Impressions', cell: (row) => formatNumber(row.impressions) },
        { header: 'CTR', cell: (row) => `${(row.ctr * 100).toFixed(2)}%` },
        { header: 'Avg. Position', cell: (row) => row.position.toFixed(1) },
    ];

    const pageColumns = [
        { header: 'Page URL', cell: (row) => <div className="max-w-[300px] truncate" title={row.page}>{row.page.replace('https://', '').replace('http://', '')}</div> },
        { header: 'Clicks', cell: (row) => formatNumber(row.clicks) },
        { header: 'Impressions', cell: (row) => formatNumber(row.impressions) },
    ];

    return (
        <DashboardLayout>
            <div className="flex flex-col space-y-6">
                <div>
                    <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">Search Console Performance</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Analytics for <span className="font-bold text-brand-600 dark:text-brand-400">{activeGscSite.replace('https://', '')}</span></p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard
                        title="Total Clicks"
                        value={overview ? formatNumber(overview.clicks || 0) : '0'}
                        loading={loading}
                        Icon={CursorArrowRaysIcon}
                    />
                    <KpiCard
                        title="Total Impressions"
                        value={overview ? formatNumber(overview.impressions || 0) : '0'}
                        loading={loading}
                        Icon={MagnifyingGlassIcon}
                    />
                    <KpiCard
                        title="Average CTR"
                        value={overview ? `${((overview.ctr || 0) * 100).toFixed(2)}%` : '0%'}
                        loading={loading}
                        Icon={ChartBarIcon}
                    />
                    <KpiCard
                        title="Average Position"
                        value={overview ? (overview.position || 0).toFixed(1) : '0.0'}
                        loading={loading}
                        Icon={InformationCircleIcon}
                    />
                </div>

                {/* Timeseries Chart */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                    <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50">
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Clicks & Impressions Trend</h3>
                    </div>
                    <div className="flex-1 p-5 min-h-[300px]">
                        {loading ? (
                            <div className="w-full h-full animate-pulse bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-800/50 rounded-xl"></div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B8ED4" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3B8ED4" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} />
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontWeight: 'bold' }} />
                                    <Area yAxisId="left" type="monotone" dataKey="clicks" stroke="#3B8ED4" strokeWidth={3} fillOpacity={1} fill="url(#colorClicks)" name="Clicks" />
                                    <Area yAxisId="right" type="monotone" dataKey="impressions" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorImpressions)" name="Impressions" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Top Queries</h3>
                        </div>
                        <div className="p-0">
                            <DataTable columns={queryColumns} data={queries} loading={loading} />
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Top Landing Pages</h3>
                        </div>
                        <div className="p-0">
                            <DataTable columns={pageColumns} data={pages} loading={loading} />
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default GscPage;
