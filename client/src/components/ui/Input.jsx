import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const Input = ({ label, type = 'text', error, disabled, className = '', ...props }) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    let baseStyles = 'w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all duration-300 placeholder:text-neutral-400 font-medium';

    let stateStyles = 'bg-white/50 border-neutral-200 text-neutral-900 focus:ring-brand-400 focus:bg-white focus:border-brand-400 dark:bg-dark-surface/50 dark:border-neutral-700 dark:text-white dark:placeholder-neutral-500 shadow-sm focus:shadow-md focus:shadow-brand-500/10 hover:border-neutral-300 dark:hover:border-neutral-600';

    if (error) {
        stateStyles = 'bg-red-50/50 border-red-300 text-neutral-900 focus:ring-red-400 dark:border-red-500/50 dark:bg-red-900/10 dark:text-white dark:focus:border-red-500';
    }

    if (disabled) {
        stateStyles = 'bg-neutral-100 text-neutral-400 cursor-not-allowed opacity-70 border-neutral-200 dark:bg-dark-surface dark:text-neutral-500 dark:border-neutral-800 shadow-none';
    }

    return (
        <div className={`mb-5 w-full ${className}`}>
            {label && (
                <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-2 tracking-wide uppercase">
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    type={inputType}
                    disabled={disabled}
                    className={`${baseStyles} ${stateStyles} ${isPassword ? 'pr-10' : ''}`}
                    {...props}
                />
                {isPassword && !disabled && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-brand-500 dark:text-neutral-500 dark:hover:text-brand-400 transition-colors p-1"
                    >
                        {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                )}
            </div>
            {error && <p className="mt-1 text-xs text-semantic-error dark:text-red-400">{error}</p>}
        </div>
    );
};

export default Input;
