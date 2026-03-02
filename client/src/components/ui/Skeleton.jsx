import React from 'react';

const Skeleton = ({ className = '', type = 'bar' }) => {
    let base = 'animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded';
    if (type === 'card') {
        base += ' h-24 w-full';
    } else if (type === 'kpi') {
        return (
            <div className={`bg-white rounded-xl border border-neutral-200 p-5 shadow-sm dark:bg-dark-card dark:border-neutral-700 ${className}`}>
                <div className="flex flex-col gap-2">
                    <div className="animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded h-4 w-1/4"></div>
                    <div className="animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded h-8 w-1/2"></div>
                    <div className="animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded h-4 w-1/3"></div>
                </div>
            </div>
        );
    } else if (type === 'table') {
        return (
            <div className={`w-full ${className}`}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded h-10 w-full mb-2"></div>
                ))}
            </div>
        );
    } else if (type === 'chart') {
        return <div className={`animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded-xl h-48 w-full ${className}`}></div>;
    }

    return <div className={`${base} ${className}`}></div>;
};

export default Skeleton;
