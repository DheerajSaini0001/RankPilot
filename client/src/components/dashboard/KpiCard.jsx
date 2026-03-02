import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import Skeleton from '../ui/Skeleton';

const KpiCard = ({ title, value, change, changeText, valueSuffix, isPositive, Icon, loading = false }) => {
    if (loading) return <Skeleton type="kpi" />;

    return (
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm dark:bg-dark-card dark:border-neutral-700">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-1">{title}</p>
                    <h3 className="text-3xl font-bold text-neutral-900 dark:text-white mt-3 tabular-nums">
                        {value}{valueSuffix}
                    </h3>
                </div>
                {Icon && (
                    <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    </div>
                )}
            </div>

            {change !== undefined && (
                <div className="mt-4 flex items-center">
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${isPositive
                        ? 'text-semantic-success bg-green-50 dark:bg-green-900 dark:text-green-400'
                        : 'text-semantic-error bg-red-50 dark:bg-red-900 dark:text-red-400'
                        }`}>
                        {isPositive ? <ArrowUpIcon className="w-3 h-3 mr-1" /> : <ArrowDownIcon className="w-3 h-3 mr-1" />}
                        {change}%
                    </span>
                    {changeText && <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-2">{changeText}</span>}
                </div>
            )}
        </div>
    );
};

export default KpiCard;
