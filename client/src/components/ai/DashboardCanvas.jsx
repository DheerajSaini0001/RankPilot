import React from 'react';
import ChartRenderer from './ChartRenderer';
import {
    XMarkIcon, BeakerIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, SparklesIcon,
    ArrowsPointingOutIcon, ArrowsPointingInIcon, ChartBarIcon, UsersIcon, ClockIcon,
    CursorArrowRaysIcon, EyeIcon, ArrowPathIcon, MagnifyingGlassIcon, TrophyIcon,
    HashtagIcon, ShareIcon, HeartIcon, ChatBubbleLeftEllipsisIcon, CurrencyDollarIcon,
    ShoppingCartIcon, BanknotesIcon, BoltIcon, RocketLaunchIcon, GlobeAltIcon,
    MapPinIcon, ExclamationTriangleIcon, IdentificationIcon, FireIcon, PresentationChartLineIcon,
    TableCellsIcon, DocumentTextIcon, Squares2X2Icon, ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { exportToPdf } from '../../utils/reportExport';

const DashboardCanvas = ({ data, onClose, isFullscreen, onToggleFullscreen }) => {
    const getIconForLabel = (label) => {
        const l = (label || '').toLowerCase();

        // Traffic & Users
        if (l.includes('user') || l.includes('visitor') || l.includes('customer')) return <UsersIcon className="w-4 h-4" />;
        if (l.includes('session') || l.includes('duration') || l.includes('time') || l.includes('stay')) return <ClockIcon className="w-4 h-4" />;
        if (l.includes('page') || l.includes('view') || l.includes('impression')) return <EyeIcon className="w-4 h-4" />;

        // Engagement & Actions
        if (l.includes('click') || l.includes('ctr') || l.includes('rate') || l.includes('engagement')) return <CursorArrowRaysIcon className="w-4 h-4" />;
        if (l.includes('bounce') || l.includes('exit') || l.includes('leave')) return <ArrowPathIcon className="w-4 h-4" />;
        if (l.includes('lead') || l.includes('signup') || l.includes('conversion') || l.includes('register')) return <IdentificationIcon className="w-4 h-4" />;
        if (l.includes('hot') || l.includes('trending') || l.includes('popular')) return <FireIcon className="w-4 h-4" />;

        // SEO & Search
        if (l.includes('keyword') || l.includes('search') || l.includes('query')) return <MagnifyingGlassIcon className="w-4 h-4" />;
        if (l.includes('rank') || l.includes('position') || l.includes('top') || l.includes('winner')) return <TrophyIcon className="w-4 h-4" />;
        if (l.includes('tag') || l.includes('hashtag') || l.includes('topic')) return <HashtagIcon className="w-4 h-4" />;
        if (l.includes('backlink') || l.includes('referral') || l.includes('link')) return <ShareIcon className="w-4 h-4" />;

        // Revenue & Sales
        if (l.includes('revenue') || l.includes('profit') || l.includes('income') || l.includes('earning')) return <CurrencyDollarIcon className="w-4 h-4" />;
        if (l.includes('sale') || l.includes('order') || l.includes('purchase') || l.includes('transaction')) return <ShoppingCartIcon className="w-4 h-4" />;
        if (l.includes('cost') || l.includes('spend') || l.includes('price') || l.includes('budget')) return <BanknotesIcon className="w-4 h-4" />;

        // Performance & Tech
        if (l.includes('speed') || l.includes('load') || l.includes('time') || l.includes('latency')) return <BoltIcon className="w-4 h-4" />;
        if (l.includes('rocket') || l.includes('launch') || l.includes('growth') || l.includes('boost')) return <RocketLaunchIcon className="w-4 h-4" />;
        if (l.includes('error') || l.includes('warning') || l.includes('issue') || l.includes('fail')) return <ExclamationTriangleIcon className="w-4 h-4" />;

        // Social & Content
        if (l.includes('share') || l.includes('social')) return <ShareIcon className="w-4 h-4" />;
        if (l.includes('like') || l.includes('love') || l.includes('favorite')) return <HeartIcon className="w-4 h-4" />;
        if (l.includes('comment') || l.includes('message') || l.includes('feedback')) return <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />;
        if (l.includes('content') || l.includes('post') || l.includes('article') || l.includes('blog')) return <DocumentTextIcon className="w-4 h-4" />;

        // Geography & General
        if (l.includes('country') || l.includes('global') || l.includes('world') || l.includes('region')) return <GlobeAltIcon className="w-4 h-4" />;
        if (l.includes('city') || l.includes('location') || l.includes('map')) return <MapPinIcon className="w-4 h-4" />;
        if (l.includes('table') || l.includes('grid') || l.includes('data')) return <TableCellsIcon className="w-4 h-4" />;
        if (l.includes('chart') || l.includes('graph') || l.includes('analysis')) return <PresentationChartLineIcon className="w-4 h-4" />;
        if (l.includes('category') || l.includes('group') || l.includes('section')) return <Squares2X2Icon className="w-4 h-4" />;

        return <ChartBarIcon className="w-4 h-4" />;
    };


    if (!data) return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md transition-all duration-500">
            <BeakerIcon className="w-10 h-10 text-indigo-500 animate-pulse mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest text-neutral-800 dark:text-neutral-200">
                Synthesizing intelligence
            </p>
            <p className="text-[10px] font-medium text-neutral-500 mt-1 uppercase tracking-widest">
                Preparing data canvas
            </p>
        </div>
    );

    return (
        <div
            id="ai-dashboard-canvas"
            className={`w-full max-w-7xl mx-auto flex flex-col bg-white dark:bg-neutral-900 overflow-y-auto custom-scrollbar transition-all duration-500 relative ${isFullscreen ? 'h-screen p-6 sm:p-10 pb-10' : 'max-h-[85vh] rounded-[2rem] p-5 sm:p-8 pb-10 shadow-2xl shadow-neutral-200 dark:shadow-black border border-neutral-100 dark:border-neutral-800'}`}
        >
            {/* Ambient Background Accents */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="flex justify-between items-center mb-8 shrink-0 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
                        <SparklesIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">{data.title || 'AI Intelligence Dashboard'}</h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-500 opacity-80">Generated by RankPilot Intelligence</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => exportToPdf('ai-dashboard-canvas', `RankPilot-AI-Report-${new Date().getTime()}`)}
                        className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-brand-500 hover:text-white transition-all duration-300 group/btn flex items-center gap-2 shadow-sm active:scale-95"
                        title="Download PDF Report"
                    >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block">Download PDF</span>
                    </button>
                    <button
                        onClick={onToggleFullscreen}
                        className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all duration-300 shadow-sm active:scale-95"
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    >
                        {isFullscreen ? <ArrowsPointingInIcon className="w-5 h-5" /> : <ArrowsPointingOutIcon className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-all duration-300 shadow-sm active:scale-95"
                        title="Close"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {data.metrics && data.metrics.length > 0 && (
                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {data.metrics.map((m, i) => (
                        <div 
                            key={i} 
                            className="relative p-4 sm:p-5 bg-white/70 dark:bg-neutral-900/50 backdrop-blur-2xl border border-white dark:border-neutral-700/50 rounded-[1.25rem] shadow-xl shadow-neutral-200/30 dark:shadow-black/40 hover:shadow-2xl hover:shadow-brand-500/10 hover:-translate-y-0.5 transition-all duration-500 overflow-hidden group"
                            style={{ animation: `fadeInUp 0.5s ease-out ${i * 0.1}s both` }}
                        >
                            <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            
                            <div className="relative z-10">
                                <div className="flex flex-col gap-2 mb-3">
                                    <div className="flex justify-between items-center">
                                        <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 group-hover:bg-brand-500 group-hover:text-white transition-all duration-300 shrink-0 shadow-inner">
                                            {getIconForLabel(m.label)}
                                        </div>
                                        {m.trend !== undefined && m.trend !== null && (
                                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black tracking-wider shadow-sm shrink-0 ${
                                                m.trend > 0 
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                            }`}>
                                                {m.trend > 0 ? <ArrowTrendingUpIcon className="w-3 h-3" strokeWidth={3} /> : <ArrowTrendingDownIcon className="w-3 h-3" strokeWidth={3} />}
                                                <span>{Math.abs(m.trend)}%</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.15em] truncate">{m.label}</p>
                                </div>
                                <p className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-neutral-200 dark:to-neutral-500 truncate tracking-tighter drop-shadow-sm">
                                    {m.value}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {data.charts && data.charts.length > 0 && (
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {data.charts.map((chart, i) => (
                        <div
                            key={i}
                            className={data.charts.length % 2 !== 0 && i === 0 ? "lg:col-span-2" : ""}
                            style={{ animation: `fadeInUp 0.5s ease-out ${(data.metrics?.length || 0) * 0.1 + i * 0.1}s both` }}
                        >
                            <ChartRenderer type={chart.chartType || 'line'} data={{ ...chart, title: chart.title || `Visualization ${i + 1}` }} />
                        </div>
                    ))}
                </div>
            )}

            {data.tables && data.tables.length > 0 && (
                <div className="relative z-10 grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                    {data.tables.map((table, i) => (
                        <div
                            key={i}
                            className={`${data.tables.length % 2 !== 0 && i === data.tables.length - 1 ? "xl:col-span-2" : ""} bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl border border-white/50 dark:border-neutral-800/50 rounded-[1.25rem] overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150`}
                        >
                            {table.title && (
                                <div className="px-5 py-4 border-b border-neutral-200/50 dark:border-neutral-800/50 bg-neutral-50/50 dark:bg-neutral-800/30">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                                        {table.title}
                                    </h3>
                                </div>
                            )}
                            <div className="overflow-y-auto max-h-[450px] custom-scrollbar pb-2">
                                <table className="w-full text-left border-collapse relative">
                                    <thead className="sticky top-0 z-20 bg-neutral-50/95 dark:bg-neutral-800/95 backdrop-blur-md shadow-sm">
                                        <tr className="border-b border-neutral-200/50 dark:border-neutral-800/50">
                                            {table.headers?.map((header, hi) => (
                                                <th key={hi} className="px-5 py-3 text-[9px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                                                    {header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                                        {table.rows?.map((row, ri) => (
                                            <tr key={ri} className="hover:bg-brand-500/5 dark:hover:bg-brand-500/10 transition-colors group">
                                                {row.map((cell, ci) => (
                                                    <td key={ci} className="px-5 py-3 text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {(!data.charts || data.charts.length === 0) && data.layout !== 'dashboard' && (
                <div className="relative z-10" style={{ animation: 'fadeInUp 0.5s ease-out both' }}>
                    <ChartRenderer type={data.chartType || 'line'} data={data} />
                </div>
            )}

            {/* Adaptive Bottom Spacer for consistent breathing room */}
            <div className={`${isFullscreen ? 'h-32' : 'h-10'} w-full shrink-0 relative z-0`} />

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(156, 163, 175, 0.4);
                    border-radius: 20px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(75, 85, 99, 0.4);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(156, 163, 175, 0.6);
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(75, 85, 99, 0.6);
                }
            `}</style>
        </div>
    );
};

export default DashboardCanvas;
