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
    ExclamationTriangleIcon,
    SparklesIcon,
    GlobeAltIcon
} from '@heroicons/react/24/outline';
import { 
    ResponsiveContainer, 
    AreaChart, Area, 
    LineChart, Line,
    BarChart, Bar,
    XAxis, YAxis, 
    Tooltip, CartesianGrid,
    PieChart, Pie, Cell
} from 'recharts';
import FilterBar from '../components/dashboard/FilterBar';
import { useFilterStore } from '../store/filterStore';

const formatNumber = (num) => Number(num || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

const EmptyState = ({ message='No data for this period', sub='Try selecting a wider date range' }) => (
  <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
    <div className="text-4xl mb-3">📭</div>
    <p className="text-sm font-semibold">{message}</p>
    <p className="text-xs mt-1">{sub}</p>
  </div>
);

const GscPage = () => {
    const { startDate, endDate } = useDateRangeStore();
    const { device } = useFilterStore();
    const { activeGscSite, connectedSources, activeSiteId } = useAccountsStore();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    const [overview, setOverview] = useState(null);
    const [priorOverview, setPriorOverview] = useState(null);
    const [timeseries, setTimeseries] = useState([]);
    const [queries, setQueries] = useState([]);
    const [pages, setPages] = useState([]);
    const [devices, setDevices] = useState([]);
    const [countries, setCountries] = useState([]);

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
            setPriorOverview(data.priorOverview);
            setTimeseries(data.timeseries || []);
            setQueries(data.queries || []);
            setPages(data.pages || []);
            setDevices(data.devices || []);
            setCountries(data.countries || []);
            
            console.log('GSC timeseries:', data.timeseries);
        } catch (err) {
            console.error("GSC fetch err", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [activeGscSite, startDate, endDate, device, activeSiteId]);

    useEffect(() => {
        const interval = setInterval(() => {
            console.log('Auto-refreshing GSC data...');
            loadData();
        }, 12 * 60 * 60 * 1000);

        return () => clearInterval(interval);
    }, [activeGscSite, startDate, endDate, device, activeSiteId]);


    if (!connectedSources.includes('ga4') && !connectedSources.includes('gsc')) {
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

    // Derived Data
    const avgCTR = overview ? (overview.ctr * 100).toFixed(2) : '0';
    const totalQueries = queries ? queries.length : 0;
    const topPosition = queries && queries.length > 0
      ? Math.min(...queries.map(q => q.position || 100)).toFixed(1)
      : '—';

    const ctrTrend = timeseries.map(d => ({
        date: d.date,
        ctr: d.ctr ? parseFloat((d.ctr * 100).toFixed(2)) : 0
    }));

    const positionTrend = timeseries.map((d) => ({
        date: d.date,
        position: d.position ? parseFloat(d.position.toFixed(1)) : 0
    }));

    const opportunities = queries
      ? queries
          .filter(q => q.impressions > 50 && q.ctr < 0.05)
          .sort((a,b) => b.impressions - a.impressions)
          .slice(0, 5)
      : [];

    const nearPageOne = queries
      ? queries
          .filter(q => (q.position || 0) >= 8 && (q.position || 0) <= 20)
          .sort((a,b) => a.position - b.position)
          .slice(0, 5)
      : [];

    const calculateChange = (curr, prior) => {
        if (!prior || prior === 0) return 0;
        return parseFloat(((curr - prior) / prior * 100).toFixed(1));
    };

    const comparison = (overview && priorOverview) ? [
        { metric:'🖱️ Clicks',       current: overview.clicks,                           prior: priorOverview.clicks,             change: calculateChange(overview.clicks, priorOverview.clicks), up: overview.clicks >= priorOverview.clicks },
        { metric:'👁️ Impressions',  current: overview.impressions,                      prior: priorOverview.impressions,        change: calculateChange(overview.impressions, priorOverview.impressions), up: overview.impressions >= priorOverview.impressions },
        { metric:'🎯 CTR',          current: `${(overview.ctr*100).toFixed(2)}%`,        prior: `${(priorOverview.ctr*100).toFixed(2)}%`,       change: calculateChange(overview.ctr, priorOverview.ctr),  up: overview.ctr >= priorOverview.ctr },
        { metric:'📍 Avg Position',  current: `#${overview.position?.toFixed(1)}`,    prior: `#${priorOverview.position?.toFixed(1)}`,   change: calculateChange(priorOverview.position, overview.position), up: overview.position <= priorOverview.position },
    ] : [];

    return (
        <DashboardLayout>
            <div className="flex flex-col space-y-8">
                {/* Header */}
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

                <FilterBar onRefresh={loadData} loading={loading} />

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard
                        title="Search Clicks"
                        value={overview ? formatNumber(overview.clicks || 0) : '0'}
                        loading={loading}
                        Icon={CursorArrowRaysIcon}
                        change={calculateChange(overview?.clicks, priorOverview?.clicks)}
                        isPositive={overview?.clicks >= priorOverview?.clicks}
                        changeText="last 28 days"
                        chartData={timeseries.map(d => d.clicks).slice(-10)}
                    />
                    <KpiCard
                        title="Impressions"
                        value={overview ? formatNumber(overview.impressions || 0) : '0'}
                        loading={loading}
                        Icon={MagnifyingGlassIcon}
                        change={calculateChange(overview?.impressions, priorOverview?.impressions)}
                        isPositive={overview?.impressions >= priorOverview?.impressions}
                        changeText="visibility surge"
                        chartData={timeseries.map(d => d.impressions).slice(-10)}
                    />
                    <KpiCard
                        title="CTR Node"
                        value={overview ? `${((overview.ctr || 0) * 100).toFixed(2)}%` : '0%'}
                        loading={loading}
                        Icon={ChartBarIcon}
                        change={calculateChange(overview?.ctr, priorOverview?.ctr)}
                        isPositive={overview?.ctr >= priorOverview?.ctr}
                        changeText="click efficiency"
                    />
                    <KpiCard
                        title="Avg. Position"
                        value={overview ? (overview.position || 0).toFixed(1) : '0.0'}
                        loading={loading}
                        Icon={InformationCircleIcon}
                        change={calculateChange(priorOverview?.position, overview?.position)}
                        isPositive={overview?.position <= priorOverview?.position}
                        changeText="rank delta"
                    />
                </div>

                {/* ADD 2 — Summary Strip */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {[
                    { label:'Average CTR',    value:`${avgCTR}%`,      icon:'🎯' },
                    { label:'Total Queries',  value:totalQueries,       icon:'🔍' },
                    { label:'Best Position',  value:`#${topPosition}`,  icon:'🏆' },
                  ].map((item,i) => (
                    <div key={i} className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                      <div className="w-12 h-12 flex items-center justify-center bg-neutral-50 dark:bg-neutral-800 rounded-xl text-2xl">{item.icon}</div>
                      <div>
                        <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums">
                          {loading ? <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"/> : item.value}
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">{item.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* FIX 1 — Neural Traffic Resonance Chart */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col min-h-[450px] group">
                    <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-brand-500/5">
                        <div>
                            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Neural Traffic Resonance</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-1">Cross-axial click and impression mapping</p>
                        </div>
                        <div className="w-10 h-10 flex items-center justify-center bg-brand-500/10 rounded-xl border border-brand-500/20">
                            <ChartBarIcon className="w-5 h-5 text-brand-500" />
                        </div>
                    </div>
                    
                    <div className="flex-1 p-8 min-h-[350px]">
                        {loading ? (
                            <div className="w-full h-full animate-pulse bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-800/50 rounded-xl"></div>
                        ) : timeseries.length === 0 ? (
                            <EmptyState />
                        ) : (
                            <>
                            <ResponsiveContainer width="100%" height={350}>
                                <AreaChart data={timeseries} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800" opacity={0.5} />
                                    <XAxis 
                                        dataKey="date" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} 
                                        dy={10} 
                                    />
                                    <YAxis 
                                        yAxisId="left"
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fill: '#3B82F6', fontWeight: 'bold' }} 
                                        tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} 
                                    />
                                    <YAxis 
                                        yAxisId="right"
                                        orientation="right"
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fill: '#10B981', fontWeight: 'bold' }} 
                                        tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} 
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            borderRadius: '16px', 
                                            border: 'none', 
                                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                            background: 'rgba(255, 255, 255, 0.95)',
                                            padding: '12px'
                                        }} 
                                        itemStyle={{ fontWeight: '900', fontSize: '12px' }} 
                                    />
                                    <Area yAxisId="left" type="monotone" dataKey="clicks" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorClicks)" name="Clicks" strokeLinecap="round" />
                                    <Area yAxisId="right" type="monotone" dataKey="impressions" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorImpressions)" name="Impressions" strokeLinecap="round" strokeDasharray="5 3" />
                                </AreaChart>
                            </ResponsiveContainer>
                            <div className="flex items-center gap-6 mt-3 px-2">
                                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
                                    <div className="w-3 h-3 rounded-full bg-blue-500"/>Clicks
                                </div>
                                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
                                    <div className="w-3 h-3 rounded-sm bg-green-500 border border-green-200 border-dashed"/>Impressions
                                </div>
                            </div>
                            </>
                        )}
                    </div>
                </div>

                {/* ADD 3 — CTR Trend + Position Trend charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* CTR Trend */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-black text-neutral-900 dark:text-white mb-1">CTR Trend</h3>
                        <p className="text-xs text-neutral-400 mb-4">Click-through rate over time</p>
                        {loading ? (
                            <div className="h-48 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"/>
                        ) : ctrTrend.length === 0 ? (
                            <EmptyState />
                        ) : (
                            <ResponsiveContainer width="100%" height={190}>
                                <AreaChart data={ctrTrend} margin={{top:5, right:10, left:-20, bottom:0}}>
                                    <defs>
                                        <linearGradient id="ctrGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#8B5CF6" stopOpacity={0.15}/>
                                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" className="dark:stroke-neutral-800/20"/>
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#9CA3AF'}}/>
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#9CA3AF'}} tickFormatter={v=>`${v}%`}/>
                                    <Tooltip formatter={v=>[`${v}%`, 'CTR']} contentStyle={{borderRadius:'12px', border:'none', fontSize:'12px'}}/>
                                    <Area type="monotone" dataKey="ctr" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#ctrGrad)" name="CTR %" dot={false}/>
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Position Trend */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-black text-neutral-900 dark:text-white">Position Trend</h3>
                            <span className="text-xs font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full border border-amber-100 dark:border-amber-800">Lower = Better</span>
                        </div>
                        <p className="text-xs text-neutral-400 mb-4">Average ranking position over time</p>
                        {loading ? (
                            <div className="h-48 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"/>
                        ) : positionTrend.length === 0 ? (
                            <EmptyState />
                        ) : (
                            <ResponsiveContainer width="100%" height={190}>
                                <LineChart data={positionTrend} margin={{top:5, right:10, left:-20, bottom:0}}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" className="dark:stroke-neutral-800/20"/>
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#9CA3AF'}}/>
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#9CA3AF'}} reversed={true} domain={[1, 'auto']}/>
                                    <Tooltip formatter={v=>[`#${v}`, 'Position']} contentStyle={{borderRadius:'12px', border:'none', fontSize:'12px'}}/>
                                    <Line type="monotone" dataKey="position" stroke="#F59E0B" strokeWidth={2.5} dot={false} name="Avg Position"/>
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* ADD 4 — Keyword Opportunities Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Low CTR Opportunities */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-black text-neutral-900 dark:text-white">💡 CTR Opportunities</h3>
                        </div>
                        <p className="text-xs text-neutral-400 mb-4">High impressions but low CTR — improve your title & meta description</p>
                        {loading ? (
                            <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"/>)}</div>
                        ) : opportunities.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                                <div className="text-3xl mb-2">🎉</div>
                                <p className="text-xs font-semibold">No low-CTR keywords found</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {opportunities.map((q,i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-neutral-800 dark:text-white truncate">{q.query}</div>
                                            <div className="text-[11px] text-neutral-400 mt-0.5">{formatNumber(q.impressions)} impressions • pos #{q.position?.toFixed(1)}</div>
                                        </div>
                                        <div className="text-right ml-3">
                                            <div className="text-xs font-black text-amber-600 dark:text-amber-400">{(q.ctr * 100).toFixed(1)}% CTR</div>
                                            <div className="text-[11px] text-neutral-400">{q.clicks} clicks</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Near Page 1 */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-black text-neutral-900 dark:text-white">🚀 Close to Page 1</h3>
                        </div>
                        <p className="text-xs text-neutral-400 mb-4">Keywords ranking 8–20 — small push could reach page 1</p>
                        {loading ? (
                            <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"/>)}</div>
                        ) : nearPageOne.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                                <div className="text-3xl mb-2">🎯</div>
                                <p className="text-xs font-semibold">No near-page-1 keywords</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {nearPageOne.map((q,i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-800/30">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-neutral-800 dark:text-white truncate">{q.query}</div>
                                            <div className="text-[11px] text-neutral-400 mt-0.5">{formatNumber(q.impressions)} impressions • {q.clicks} clicks</div>
                                        </div>
                                        <div className="text-right ml-3">
                                            <div className="text-xs font-black text-green-600 dark:text-green-400">Pos #{q.position?.toFixed(1)}</div>
                                            <div className="text-[11px] text-neutral-400">{(q.ctr * 100).toFixed(1)}% CTR</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sub-Reports (Queries & Pages) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50 flex items-center gap-2">
                            <SparklesIcon className="w-4 h-4 text-brand-500" />
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Top Queries</h3>
                        </div>
                        <div className="p-0">
                            <DataTable columns={queryColumns} data={filteredQueries} loading={loading} initialLimit={5} />
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50 flex items-center gap-2">
                             <GlobeAltIcon className="w-4 h-4 text-brand-500" />
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Top Landing Pages</h3>
                        </div>
                        <div className="p-0">
                            <DataTable columns={pageColumns} data={filteredPages} loading={loading} initialLimit={5} />
                        </div>
                    </div>
                </div>

                {/* ADD 7 — Impressions Breakdown Bar Chart */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-[2.5rem] p-8 shadow-sm group">
                    <div className="mb-6">
                        <h3 className="text-lg font-black text-neutral-900 dark:text-white">Daily Impression Volume</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Search visibility density per interval</p>
                    </div>
                    <div className="h-[250px]">
                        {loading ? (
                            <div className="w-full h-full animate-pulse bg-neutral-100 dark:bg-neutral-800 rounded-3xl"></div>
                        ) : (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={timeseries}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800" opacity={0.5} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#9CA3AF', fontWeight:'bold'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#9CA3AF', fontWeight:'bold'}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v} />
                                    <Tooltip cursor={{fill: 'rgba(59, 130, 246, 0.05)'}} contentStyle={{borderRadius:'15px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                                    <Bar dataKey="impressions" fill="#3B82F6" radius={[6,6,0,0]} name="Impressions" fillOpacity={0.8} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Device Breakdown */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-[2.5rem] p-8 shadow-sm group">
                        <div className="mb-6">
                            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Apparatus Analysis</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Search volume by device category</p>
                        </div>
                        <div className="flex flex-col md:flex-row items-center gap-12">
                            <div className="w-[200px] h-[200px]">
                                {loading ? (
                                    <div className="w-full h-full rounded-full bg-neutral-100 dark:bg-neutral-800 animate-pulse"></div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <PieChart>
                                            <Pie
                                                data={devices}
                                                innerRadius={60}
                                                outerRadius={80}
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
                                )}
                            </div>
                            <div className="flex-1 space-y-4 w-full">
                                {devices.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-dark-surface/30 group-hover:bg-brand-500/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#3B8ED4', '#8B5CF6', '#10B981'][i % 3] }}></div>
                                            <span className="text-xs font-black capitalize text-neutral-600 dark:text-neutral-400">{d.name}</span>
                                        </div>
                                        <span className="text-xs font-black text-neutral-900 dark:text-white">{formatNumber(d.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Geography Breakdown */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-[2.5rem] p-8 shadow-sm group">
                        <div className="mb-6">
                            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Geographical Reach</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Top conversion landscapes</p>
                        </div>
                        <div className="space-y-4">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <div key={i} className="h-10 w-full bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"></div>
                                ))
                            ) : countries.map((loc, i) => {
                                const maxVal = Math.max(...countries.map(l => l.value));
                                const width = (loc.value / maxVal) * 100;
                                return (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-black text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                                                <span className="w-5 h-5 flex items-center justify-center bg-neutral-100 dark:bg-dark-surface rounded-md text-[10px] font-bold">{i+1}</span>
                                                {loc.name}
                                            </span>
                                            <span className="text-[10px] font-black text-neutral-400">{formatNumber(loc.value)} CLICKS</span>
                                        </div>
                                        <div className="h-2 w-full bg-neutral-100 dark:bg-dark-surface rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-brand-500 to-blue-400 rounded-full transition-all duration-1000"
                                                style={{ width: `${width}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ADD 5 — Period Comparison Table */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-sm font-black text-neutral-900 dark:text-white">Period Comparison</h3>
                      <p className="text-xs text-neutral-400 mt-0.5">This period vs last period — all key metrics</p>
                    </div>
                    <span className="text-xs font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full border border-purple-100 dark:border-purple-800">
                      vs Last Period
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b border-neutral-100 dark:border-neutral-800">
                          <tr>
                            {['Metric', 'This Period', 'Last Period', 'Change'].map(h => (
                                <th key={h} className="pb-3 text-left text-[11px] font-black uppercase tracking-wider text-neutral-400 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            Array(4).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={4} className="py-3"><div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg"></div></td>
                                </tr>
                            ))
                          ) : (
                            comparison.map((row, i) => (
                                <tr key={i} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                                  <td className="py-3 text-xs font-bold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">{row.metric}</td>
                                  <td className="py-3 text-xs font-black text-neutral-900 dark:text-white tabular-nums">
                                    {typeof row.current === 'number' ? row.current.toLocaleString() : row.current}
                                  </td>
                                  <td className="py-3 text-xs text-neutral-400 tabular-nums">
                                    {typeof row.prior === 'number' ? row.prior.toLocaleString() : row.prior}
                                  </td>
                                  <td className="py-3">
                                    <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full ${
                                      row.up
                                        ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                        : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                                    }`}>
                                      {row.up ? '▲' : '▼'} {Math.abs(row.change)}%
                                    </span>
                                  </td>
                                </tr>
                            ))
                          )}
                        </tbody>
                    </table>
                  </div>
                </div>

            </div>
        </DashboardLayout>
    );
};

export default GscPage;
