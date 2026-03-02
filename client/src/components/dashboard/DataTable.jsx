import React from 'react';
import Skeleton from '../ui/Skeleton';

const DataTable = ({ columns, data, loading = false, className = '' }) => {
    if (loading) return <Skeleton type="table" />;

    return (
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
                    {data && data.length > 0 ? (
                        data.map((row, idx) => (
                            <tr key={idx} className={`transition-colors border-b border-neutral-100 dark:border-neutral-700 ${idx % 2 === 0
                                    ? 'bg-white hover:bg-brand-50 dark:bg-dark-card dark:hover:bg-dark-surface'
                                    : 'bg-neutral-50 hover:bg-brand-50 dark:bg-dark-surface dark:hover:bg-neutral-700'
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
    );
};

export default DataTable;
