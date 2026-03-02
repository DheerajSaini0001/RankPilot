import React from 'react';

const Badge = ({ children, variant = 'neutral', className = '' }) => {
    let styles = 'text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center';

    switch (variant) {
        case 'success':
            styles += ' bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            break;
        case 'error':
            styles += ' bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            break;
        case 'warning':
            styles += ' bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
            break;
        case 'neutral':
        case 'info':
        default:
            styles += ' bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-300';
            break;
    }

    return (
        <span className={`${styles} ${className}`}>
            {children}
        </span>
    );
};

export default Badge;
