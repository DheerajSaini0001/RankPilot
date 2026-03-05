import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import Skeleton from '../ui/Skeleton';

const KpiCard = ({ title, value, change, changeText, valueSuffix, isPositive, Icon, loading = false }) => {
    if (loading) return <Skeleton type="kpi" />;

    return (
        <div className="group relative bg-white dark:bg-dark-card rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 p-6 shadow-sm hover:shadow-xl hover:shadow-brand-500/10 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
            {/* Glossy gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-white to-neutral-50 dark:from-dark-card dark:to-neutral-900/50 opacity-100 transition-opacity duration-300 group-hover:opacity-0 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-brand-50/50 to-white dark:from-brand-900/10 dark:to-dark-card opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"></div>

            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <p className="text-sm font-semibold tracking-wide text-neutral-500 dark:text-neutral-400 mt-1 uppercase">{title}</p>
                    <h3 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-300 mt-3 tabular-nums drop-shadow-sm">
                        {value}{valueSuffix}
                    </h3>
                </div>
                {Icon && (
                    <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800/50 flex items-center justify-center transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm">
                        <Icon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                    </div>
                )}
            </div>

            {change !== undefined && (
                <div className="relative z-10 mt-5 flex items-center">
                    <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full shadow-sm ${isPositive
                        ? 'text-green-700 bg-green-100 border border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800/50'
                        : 'text-red-700 bg-red-100 border border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/50'
                        }`}>
                        {isPositive ? <ArrowUpIcon className="w-3.5 h-3.5 mr-1 stroke-2" /> : <ArrowDownIcon className="w-3.5 h-3.5 mr-1 stroke-2" />}
                        {change}%
                    </span>
                    {changeText && <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 ml-2.5">{changeText}</span>}
                </div>
            )}
        </div>
    );
};

export default KpiCard;
