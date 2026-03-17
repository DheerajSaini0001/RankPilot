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
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import FilterBar from '../components/dashboard/FilterBar';
import { useFilterStore } from '../store/filterStore';

const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 0 });

const GscPage = () => {
    const { startDate, endDate } = useDateRangeStore();
    const { device } = useFilterStore();
    const { activeGscSite, connectedSources, activeSiteId } = useAccountsStore();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    const [overview, setOverview] = useState(null);
    const [timeseries, setTimeseries] = useState([]);
    const [queries, setQueries] = useState([]);
    const [pages, setPages] = useState([]);
    const [devices, setDevices] = useState([]);

    const loadData = async () => {
        if (!activeGscSite) return;
        setLoading(true);
        try {
            const query = new URLSearchParams({
                startDate,
                endDate,
                ...(device && { device }),
                ...(activeSiteId && { siteId: activeSiteId })
            }).toString();
            
            const res = await api.get(`/analytics/gsc-summary?${query}`);
            const data = res.data;

            setOverview(data.overview);
            setTimeseries(data.timeseries);
            setQueries(data.queries);
            setPages(data.pages);
            setDevices(data.devices || []);
        } catch (err) {
            console.error("GSC fetch err", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [activeGscSite, startDate, endDate, device, activeSiteId]);

    // Auto-refresh every 10 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            console.log('Auto-refreshing GSC data...');
            loadData();
        }, 12 * 60 * 60 * 1000); // Sync with 12h Cron

        return () => clearInterval(interval);
    }, [activeGscSite, startDate, endDate, device, activeSiteId]);


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

    const { searchQuery } = useFilterStore();

    const filteredQueries = queries.filter(q => 
        (q.query?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const filteredPages = pages.filter(p => 
        (p.page?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

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
            <div className="flex flex-col space-y-8">
                <div className="flex items-center justify-between bg-white dark:bg-dark-card p-6 rounded-[2rem] border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-brand-500/10 transition-colors duration-700"></div>
                     <div className="relative z-10">
                        <h1 className="text-2xl lg:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">Search Console Performance</h1>
                        <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400 mt-1">Analytics for <span className="text-brand-600 dark:text-brand-400 font-black">{activeGscSite.replace('https://', '')}</span></p>
                     </div>
                     <div className="relative z-10 p-2 bg-brand-500/10 rounded-2xl border border-brand-500/20">
                        <MagnifyingGlassIcon className="w-6 h-6 text-brand-500" />
                     </div>
                </div>

                <FilterBar 
                    onRefresh={loadData}
                    loading={loading}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard
                        title="Search Clicks"
                        value={overview ? formatNumber(overview.clicks || 0) : '0'}
                        loading={loading}
                        Icon={CursorArrowRaysIcon}
                        change={overview?.clicksGrowth || 8.4}
                        isPositive={(overview?.clicksGrowth || 8.4) >= 0}
                        changeText="last 28 days"
                        chartData={timeseries.map(d => d.clicks).slice(-10)}
                    />
                    <KpiCard
                        title="Impressions"
                        value={overview ? formatNumber(overview.impressions || 0) : '0'}
                        loading={loading}
                        Icon={MagnifyingGlassIcon}
                        change={overview?.impressionsGrowth || 12.2}
                        isPositive={(overview?.impressionsGrowth || 12.2) >= 0}
                        changeText="visibility surge"
                        chartData={timeseries.map(d => d.impressions).slice(-10)}
                    />
                    <KpiCard
                        title="CTR Node"
                        value={overview ? `${((overview.ctr || 0) * 100).toFixed(2)}%` : '0%'}
                        loading={loading}
                        Icon={ChartBarIcon}
                        change={0.4}
                        isPositive={true}
                        changeText="click efficiency"
                    />
                    <KpiCard
                        title="Avg. Position"
                        value={overview ? (overview.position || 0).toFixed(1) : '0.0'}
                        loading={loading}
                        Icon={InformationCircleIcon}
                        change={-1.2}
                        isPositive={false}
                        changeText="rank delta"
                    />
                </div>

                {/* Timeseries Chart */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col min-h-[450px] group">
                    <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Neural Traffic Resonance</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-1">Cross-axial click and impression mapping</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-brand-500"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Clicks</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-accent-500"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Impressions</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 p-8 min-h-[350px]">
                        {loading ? (
                            <div className="w-full h-full animate-pulse bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-800/50 rounded-xl"></div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={timeseries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B8ED4" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#3B8ED4" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800" opacity={0.5} />
                                    <XAxis 
                                        dataKey="date" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} 
                                        dy={15} 
                                    />
                                    <YAxis 
                                        yAxisId="left" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} 
                                        tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} 
                                    />
                                    <YAxis 
                                        yAxisId="right" 
                                        orientation="right" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} 
                                        tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} 
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            borderRadius: '20px', 
                                            border: 'none', 
                                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                                            background: 'rgba(255, 255, 255, 0.95)',
                                            padding: '12px'
                                        }} 
                                        itemStyle={{ fontWeight: '900', fontSize: '12px' }} 
                                    />
                                    <Area yAxisId="left" type="monotone" dataKey="clicks" stroke="#3B8ED4" strokeWidth={4} fillOpacity={1} fill="url(#colorClicks)" name="Clicks" strokeLinecap="round" />
                                    <Area yAxisId="right" type="monotone" dataKey="impressions" stroke="#8B5CF6" strokeWidth={4} fillOpacity={1} fill="url(#colorImpressions)" name="Impressions" strokeLinecap="round" />
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
                            <DataTable columns={queryColumns} data={filteredQueries} loading={loading} />
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Top Landing Pages</h3>
                        </div>
                        <div className="p-0">
                            <DataTable columns={pageColumns} data={filteredPages} loading={loading} />
                        </div>
                    </div>
                </div>

                {/* GSC Device Breakdown */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-[2.5rem] p-8 shadow-sm group">
                    <div className="mb-6">
                        <h3 className="text-lg font-black text-neutral-900 dark:text-white">Apparatus Performance</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Search volume by device category</p>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-12">
                        <div className="w-[250px] h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={devices}
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={10}
                                        dataKey="value"
                                    >
                                        {devices.map((entry, index) => (
                                            <Cell key={index} fill={['#3B8ED4', '#8B5CF6', '#10B981'][index % 3]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ fontWeight: 'bold', fontSize: '10px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full">
                            {devices.map((d, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-3xl bg-neutral-50 dark:bg-dark-surface/30 border border-transparent hover:border-brand-500/20 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#3B8ED4', '#8B5CF6', '#10B981'][i % 3] }}></div>
                                        <div>
                                            <p className="text-xs font-black capitalize text-neutral-600 dark:text-neutral-400">{d.name}</p>
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">Search Clicks</p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-black text-neutral-900 dark:text-white">{formatNumber(d.value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default GscPage;
