import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const Input = ({ label, type = 'text', error, disabled, className = '', ...props }) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    let baseStyles = 'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors';

    let stateStyles = 'bg-white border-neutral-300 text-neutral-900 focus:ring-brand-400 focus:border-brand-400 dark:bg-dark-card dark:border-neutral-600 dark:text-white dark:placeholder-neutral-500';

    if (error) {
        stateStyles = 'bg-white border-semantic-error text-neutral-900 focus:ring-semantic-error dark:border-red-500 dark:bg-dark-card dark:text-white';
    }

    if (disabled) {
        stateStyles = 'bg-neutral-100 text-neutral-400 cursor-not-allowed opacity-60 border-neutral-300 dark:bg-dark-surface dark:text-neutral-600 dark:border-neutral-700';
    }

    return (
        <div className={`mb-4 w-full ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
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
                        className="absolute right-3 top-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
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
