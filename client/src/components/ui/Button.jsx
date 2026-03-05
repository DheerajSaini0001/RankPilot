import React from 'react';

const Button = ({ variant = 'primary', children, className = '', disabled = false, loading = false, ...props }) => {
    let baseStyles = 'rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300 focus:outline-none focus:ring-offset-2 flex justify-center items-center shadow-sm disabled:shadow-none transform active:scale-[0.98] tracking-wide';

    if (disabled || loading) {
        baseStyles += ' opacity-50 cursor-not-allowed pointer-events-none';
    }

    let variantStyles = '';
    switch (variant) {
        case 'primary':
            variantStyles = 'bg-brand-600 text-white hover:bg-brand-700 hover:shadow-brand-500/20 hover:shadow-lg focus:ring-2 focus:ring-brand-400 dark:bg-brand-500 dark:hover:bg-brand-600';
            break;
        case 'secondary':
            variantStyles = 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 dark:bg-dark-card dark:text-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600 dark:hover:bg-dark-surface';
            break;
        case 'danger':
            variantStyles = 'bg-red-600 text-white hover:bg-red-700 hover:shadow-red-500/20 hover:shadow-lg focus:ring-2 focus:ring-red-400 dark:bg-red-700 dark:hover:bg-red-800';
            break;
        case 'ghost':
            variantStyles = 'bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 focus:ring-2 focus:ring-neutral-200 dark:text-neutral-400 dark:hover:bg-dark-surface shadow-none';
            break;
        case 'icon-only':
            variantStyles = 'p-2.5 rounded-xl text-neutral-600 hover:bg-neutral-100 focus:ring-2 focus:ring-brand-400 dark:text-neutral-400 dark:hover:bg-dark-surface shadow-none';
            break;
        default:
            break;
    }

    return (
        <button
            disabled={disabled || loading}
            className={`${baseStyles} ${variantStyles} ${className}`}
            {...props}
        >
            {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : null}
            {children}
        </button>
    );
};

export default Button;
