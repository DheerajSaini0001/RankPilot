import React, { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

const SearchableSelect = ({ 
    options = [], 
    value, 
    onChange, 
    placeholder = "Select...", 
    searchPlaceholder = "Search...",
    disabled = false,
    className = "",
    footerAction = null // { label: string, onClick: function }
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    const filteredOptions = options.filter(option => 
        option.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        option.value?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
        if (!isOpen) {
            setSearchQuery('');
        }
    }, [isOpen]);

    const handleSelect = (optionValue) => {
        onChange({ target: { value: optionValue } });
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div 
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`
                    w-full text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 
                    bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-3 
                    outline-none flex items-center justify-between cursor-pointer transition-all shadow-sm
                    ${disabled ? 'opacity-70 cursor-not-allowed bg-neutral-50 dark:bg-neutral-900/50' : 'hover:border-brand-500'}
                    ${isOpen ? 'ring-2 ring-brand-500 border-transparent' : ''}
                `}
            >
                <span className={`truncate ${!selectedOption ? 'text-neutral-400' : ''}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDownIcon className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-[100] mt-2 w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
                        <MagnifyingGlassIcon className="w-4 h-4 text-neutral-400" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full bg-transparent border-none focus:ring-0 text-sm py-1 text-neutral-900 dark:text-white placeholder:text-neutral-500"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
                                <XMarkIcon className="w-3 h-3 text-neutral-400" />
                            </button>
                        )}
                    </div>
                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                        {filteredOptions.length === 0 ? (
                            <div className="p-4 text-center text-xs text-neutral-500">No results found</div>
                        ) : (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    onClick={() => handleSelect(option.value)}
                                    className={`
                                        px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between
                                        ${value === option.value 
                                            ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-bold' 
                                            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}
                                    `}
                                >
                                    <span className="truncate flex-1">{option.label}</span>
                                    {value === option.value && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                    {footerAction && (
                        <div 
                            onClick={() => { footerAction.onClick(); setIsOpen(false); }}
                            className="p-2 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-center text-xs font-bold text-brand-600 dark:text-brand-400"
                        >
                            {footerAction.label}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
