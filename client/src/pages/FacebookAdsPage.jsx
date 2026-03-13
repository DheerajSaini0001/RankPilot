import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/ui/DashboardLayout';
import KpiCard from '../components/dashboard/KpiCard';
import DataTable from '../components/dashboard/DataTable';
import { useDateRangeStore } from '../store/dateRangeStore';
import { useAccountsStore } from '../store/accountsStore';
import api from '../api';
import {
    CurrencyDollarIcon,
    CursorArrowRaysIcon,
    BanknotesIcon,
    ExclamationTriangleIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import FilterBar from '../components/dashboard/FilterBar';
import { useFilterStore } from '../store/filterStore';

const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 0 });
const formatCurrency = (num) => Number(num).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const FacebookAdsPage = () => {
    const { startDate, endDate } = useDateRangeStore();
    const { device, campaign } = useFilterStore();
    const { connectedSources, activeFacebookAdAccountId, activeSiteId } = useAccountsStore();
    const isConnected = connectedSources.includes('facebook-ads');
    const hasAccount = !!activeFacebookAdAccountId;
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    const [overview, setOverview] = useState(null);
    const [timeseries, setTimeseries] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [adsets, setAdsets] = useState([]);
    const [devices, setDevices] = useState([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                startDate,
                endDate,
                ...(device && { device }),
                ...(campaign && { campaign }),
                ...(activeSiteId && { siteId: activeSiteId })
            }).toString();
            
            const res = await api.get(`/analytics/facebook-ads-summary?${query}`);
            const data = res.data;

            setOverview(data.overview);
            setTimeseries(data.timeseries);
            setCampaigns(data.campaigns);
            setAdsets(data.adsets);
            setDevices(data.devices || []);
        } catch (err) {
            console.error("Facebook Ads fetch err", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isConnected || !hasAccount) return;
        loadData();
    }, [isConnected, hasAccount, startDate, endDate, device, campaign, activeSiteId]);

    // Auto-refresh every 10 minutes
    useEffect(() => {
        if (!isConnected || !hasAccount) return;
        const interval = setInterval(() => {
            console.log('Auto-refreshing Facebook Ads data...');
            loadData();
        }, 10 * 60 * 1000);

        return () => clearInterval(interval);
    }, [isConnected, hasAccount, startDate, endDate, device, campaign, activeSiteId]);


    if (!isConnected) {
        return (
            <DashboardLayout>
                <div className="flex flex-col h-full items-center justify-center">
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700/60 p-8 rounded-2xl flex flex-col items-center text-center max-w-sm">
                        <ExclamationTriangleIcon className="w-12 h-12 text-neutral-400 mb-4" />
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Facebook Ads Not Connected</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 mb-5">Please go to Integrations to connect your Meta/Facebook Ads account.</p>
                        <button onClick={() => navigate('/connect-accounts')} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors">Go to Integrations</button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!hasAccount) {
        return (
            <DashboardLayout>
                <div className="flex flex-col h-full items-center justify-center">
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700/60 p-8 rounded-2xl flex flex-col items-center text-center max-w-sm">
                        <ExclamationTriangleIcon className="w-12 h-12 text-amber-400 mb-4" />
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">No Ad Account Selected</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 mb-5">Your Facebook Ads account is connected, but you haven't picked an ad account yet. Go to Integrations to select one.</p>
                        <button onClick={() => navigate('/connect-accounts')} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors">Select Ad Account</button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const { searchQuery } = useFilterStore();

    const filteredCampaigns = campaigns.filter(c => 
        (c.name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const filteredAdsets = adsets.filter(a => 
        (a.name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const campaignColumns = [
        { header: 'Campaign Name', cell: (row) => <div className="max-w-[200px] truncate" title={row.name}>{row.name}</div> },
        { header: 'Spend', cell: (row) => <span className="font-bold text-blue-600">{formatCurrency(row.spend)}</span> },
        { header: 'Impressions', cell: (row) => formatNumber(row.impressions) },
        { header: 'Conversions', cell: (row) => <span className="font-bold text-emerald-600">{formatNumber(row.conversions)}</span> },
        { header: 'Clicks', cell: (row) => formatNumber(row.clicks) },
    ];

    const adsetColumns = [
        { header: 'Ad Set Name', cell: (row) => <div className="max-w-[200px] truncate" title={row.name}>{row.name}</div> },
        { header: 'Spend', cell: (row) => formatCurrency(row.spend) },
        { header: 'Conversions', cell: (row) => <span className="font-bold text-emerald-600">{formatNumber(row.conversions)}</span> },
        { header: 'Clicks', cell: (row) => formatNumber(row.clicks) },
    ];

    return (
        <DashboardLayout>
            <div className="flex flex-col space-y-8">
                <div className="flex items-center justify-between bg-white dark:bg-dark-card p-6 rounded-[2rem] border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-blue-500/10 transition-colors duration-700"></div>
                     <div className="relative z-10">
                        <h1 className="text-2xl lg:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">Facebook Ads Performance</h1>
                        <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400 mt-1">Social media advertising metrics</p>
                     </div>
                     <div className="relative z-10 p-2 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                        <ChartBarIcon className="w-6 h-6 text-blue-500" />
                     </div>
                </div>

                <FilterBar 
                    showCampaign 
                    onRefresh={loadData}
                    loading={loading}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard
                        title="Meta Capital"
                        value={overview ? formatCurrency(overview.spend || 0) : '0'}
                        loading={loading}
                        Icon={BanknotesIcon}
                        change={14.2}
                        isPositive={true}
                        changeText="budget velocity"
                        chartData={timeseries.map(d => d.spend).slice(-10)}
                    />
                    <KpiCard
                        title="Social Resonance"
                        value={overview ? formatNumber(overview.impressions || 0) : '0'}
                        loading={loading}
                        Icon={CursorArrowRaysIcon}
                        change={22.8}
                        isPositive={true}
                        changeText="viral amplitude"
                        chartData={timeseries.map(d => d.spend).slice(-10)}
                    />
                    <KpiCard
                        title="Click Resonance"
                        value={overview ? `${(overview.ctr || 0).toFixed(2)}%` : '0%'}
                        loading={loading}
                        Icon={ChartBarIcon}
                        change={3.1}
                        isPositive={true}
                        changeText="intent surge"
                    />
                    <KpiCard
                        title="Unit Efficiency"
                        value={overview ? formatCurrency(overview.cpc || 0) : '0'}
                        loading={loading}
                        Icon={CurrencyDollarIcon}
                        change={-1.8}
                        isPositive={true}
                        changeText="cost optimization"
                    />
                </div>

                {/* Timeseries Chart */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col min-h-[450px] group">
                    <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-blue-500/5">
                        <div>
                            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Social Engagement Resonance</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-1">Daily expenditure and click liquidity analysis</p>
                        </div>
                        <div className="p-2 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                            <ChartBarIcon className="w-5 h-5 text-blue-500" />
                        </div>
                    </div>
                    <div className="flex-1 p-8 min-h-[350px]">
                        {loading ? (
                            <div className="w-full h-full animate-pulse bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-800/50 rounded-xl"></div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={timeseries} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#1877F2" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#1877F2" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
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
                                    <Area type="monotone" dataKey="spend" stroke="#1877F2" strokeWidth={4} fillOpacity={1} fill="url(#colorSpend)" name="Spend ($)" strokeLinecap="round" />
                                    <Area type="monotone" dataKey="clicks" stroke="#8B5CF6" strokeWidth={4} fillOpacity={1} fill="url(#colorClicks)" name="Clicks" strokeLinecap="round" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Top Campaigns</h3>
                        </div>
                        <div className="p-0">
                            <DataTable columns={campaignColumns} data={filteredCampaigns} loading={loading} />
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Top Ad Sets</h3>
                        </div>
                        <div className="p-0">
                            <DataTable columns={adsetColumns} data={filteredAdsets} loading={loading} />
                        </div>
                    </div>
                </div>

                {/* Facebook Ads Device Breakdown */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-[2.5rem] p-8 shadow-sm group">
                    <div className="mb-6">
                        <h3 className="text-lg font-black text-neutral-900 dark:text-white">Social Apparatus Mix</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Ad spend distribution by hardware category</p>
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
                                            <Cell key={index} fill={['#1877F2', '#8B5CF6', '#10B981'][index % 3]} />
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
                                <div key={i} className="flex items-center justify-between p-4 rounded-3xl bg-neutral-50 dark:bg-dark-surface/30 border border-transparent hover:border-blue-500/20 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#1877F2', '#8B5CF6', '#10B981'][i % 3] }}></div>
                                        <div>
                                            <p className="text-xs font-black capitalize text-neutral-600 dark:text-neutral-400">{d.name}</p>
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">Total Spend</p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-black text-neutral-900 dark:text-white">{formatCurrency(d.value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default FacebookAdsPage;
