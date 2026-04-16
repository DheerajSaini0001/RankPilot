import React from 'react';
import Skeleton from '../ui/Skeleton';

const DataTable = ({ columns, data, loading = false, className = '', initialLimit }) => {
    const [expanded, setExpanded] = React.useState(false);
    
    if (loading) return <Skeleton type="table" />;

    const hasLimit = initialLimit && data && data.length > initialLimit;
    const displayData = (hasLimit && !expanded) ? data.slice(0, initialLimit) : data;

    return (
        <div className="flex flex-col w-full">
            <div className={`w-full overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700 ${className}`}>
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-neutral-100 text-neutral-600 text-xs font-semibold uppercase tracking-wider dark:bg-dark-surface dark:text-neutral-400">
                        <tr>
                            {columns.map((col, idx) => (
                                <th key={idx} className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 select-none">
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayData && displayData.length > 0 ? (
                            displayData.map((row, idx) => (
                                <tr key={idx} className={`transition-all border-b border-neutral-100/50 dark:border-neutral-800/50 ${idx % 2 === 0
                                        ? 'bg-white hover:bg-neutral-50 dark:bg-dark-card dark:hover:bg-neutral-800/50'
                                        : 'bg-neutral-50/50 hover:bg-neutral-50 dark:bg-dark-surface dark:hover:bg-neutral-800/50'
                                    }`}>
                                    {columns.map((col, colIdx) => (
                                        <td key={colIdx} className="px-4 py-3 text-neutral-800 dark:text-neutral-200">
                                            {col.cell ? col.cell(row) : row[col.accessor]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400">
                                    No data available for this period.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {hasLimit && (
                <div className="flex justify-center mt-6 mb-2">
                    <button 
                        onClick={() => setExpanded(!expanded)}
                        className="text-xs font-black py-2.5 px-6 bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-full text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-95"
                    >
                        {expanded ? (
                            <>Show Less</>
                        ) : (
                            <>View all ({data.length - initialLimit} remaining)</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default DataTable;
