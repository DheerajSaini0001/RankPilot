import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import Skeleton from '../ui/Skeleton';

const KpiCard = ({ title, value, change, changeText, valueSuffix, isPositive, Icon, loading = false, sentiment, chartData = [] }) => {
    if (loading) return (
        <div className="w-full h-44 rounded-3xl bg-neutral-100 dark:bg-neutral-800 animate-pulse relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
        </div>
    );

    // Generate dynamic sparkline path
    const generatePath = () => {
        if (!chartData || chartData.length < 2) {
            return isPositive ? "M0 35 Q 25 35, 40 20 T 70 25 T 100 5" : "M0 5 Q 25 5, 40 20 T 70 15 T 100 35";
        }

        const max = Math.max(...chartData, 1);
        const min = Math.min(...chartData);
        const range = max - min || 1;
        const width = 100;
        const height = 30; // restricted height for sparkline
        const step = width / (chartData.length - 1);
        
        return chartData.map((val, i) => {
            const x = i * step;
            const y = height - ((val - min) / range) * height + 5; // 5px offset
            return (i === 0 ? 'M' : 'L') + `${x.toFixed(1)} ${y.toFixed(1)}`;
        }).join(' ');
    };

    return (
        <div className="group relative glass-card rounded-3xl p-6 overflow-hidden flex flex-col justify-between h-full min-h-[180px]">
            {/* Background Decorative Element */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl group-hover:bg-brand-500/10 transition-all duration-700"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-accent-500/5 rounded-full blur-3xl group-hover:bg-accent-500/10 transition-all duration-700"></div>

            <div className="relative z-10 flex justify-between items-start mb-2">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500 leading-none mb-2">
                        {title}
                    </span>
                    <div className="flex items-baseline gap-1.5">
                        <h3 className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                            {value}
                        </h3>
                        {valueSuffix && <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500">{valueSuffix}</span>}
                    </div>
                </div>
                
                {Icon && (
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-dark-surface shadow-md border border-neutral-100 dark:border-neutral-800 flex items-center justify-center transform transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6 group-hover:shadow-brand-500/20 group-hover:bg-brand-600 group-hover:text-white">
                        <Icon className="w-6 h-6 text-brand-500 dark:text-brand-400 group-hover:text-white transition-colors" />
                    </div>
                )}
            </div>

            {/* Sparkline Visual */}
            <div className="relative h-12 w-full mt-2 mb-4 opacity-40 group-hover:opacity-100 transition-opacity duration-700">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
                    <path
                        d={generatePath()}
                        fill="none"
                        stroke={isPositive ? "#10B981" : "#EF4444"}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeJoin="round"
                        className="animate-[dash_2s_ease-in-out]"
                    />
                </svg>
            </div>

            <div className="relative z-10 flex items-center justify-between gap-3 pt-4 border-t border-neutral-100/50 dark:border-neutral-800/50">
                {change !== undefined ? (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black shadow-sm ${
                        isPositive 
                        ? 'bg-semantic-green-50 text-semantic-green-600 border border-semantic-green-500/10 dark:bg-semantic-green-500/10 dark:text-semantic-green-500' 
                        : 'bg-semantic-rose-50 text-semantic-rose-600 border border-semantic-rose-500/10 dark:bg-semantic-rose-500/10 dark:text-semantic-rose-500'
                    }`}>
                        {isPositive ? <ArrowUpIcon className="w-3 h-3 stroke-[3]" /> : <ArrowDownIcon className="w-3 h-3 stroke-[3]" />}
                        <span>{Math.abs(parseFloat(change)).toFixed(1)}%</span>
                    </div>
                ) : (
                    <div className="h-6 w-16 bg-neutral-100 dark:bg-neutral-800 rounded-full animate-pulse border border-transparent"></div>
                )}
                
                {changeText && (
                    <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 whitespace-nowrap italic tracking-tight">
                        {changeText}
                    </span>
                 )}
            </div>

            {/* Subtle Progress Bar */}
            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div 
                    className={`h-full animate-[progress_1s_ease-out_forwards] ${isPositive ? 'bg-semantic-green-500' : 'bg-semantic-rose-500'}`}
                    style={{ width: `${Math.min(100, Math.abs(change || 50) + 20)}%` }}
                ></div>
            </div>
        </div>
    );
};

export default KpiCard;
