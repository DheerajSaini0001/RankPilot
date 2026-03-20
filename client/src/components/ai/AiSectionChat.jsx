import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    SparklesIcon,
    XMarkIcon,
    PaperAirplaneIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuthStore } from '../../store/authStore';
import { useAccountsStore } from '../../store/accountsStore';
import { getApiUrl } from '../../api';

/* ─── Markdown Component Overrides ─── */
const MD = {
    p: ({ children }) => <p className="leading-relaxed text-[13px] text-neutral-700 dark:text-neutral-300 mb-2 last:mb-0">{children}</p>,
    strong: ({ children }) => <strong className="font-bold text-neutral-900 dark:text-white">{children}</strong>,
    ul: ({ children }) => <ul className="space-y-1 mb-2 pl-4 list-disc marker:text-brand-500">{children}</ul>,
    ol: ({ children }) => <ol className="space-y-1 mb-2 pl-4 list-decimal marker:text-brand-500">{children}</ol>,
    li: ({ children }) => <li className="text-[13px] text-neutral-700 dark:text-neutral-300">{children}</li>,
    h1: ({ children }) => <h1 className="text-sm font-black text-neutral-900 dark:text-white mb-1">{children}</h1>,
    h2: ({ children }) => <h2 className="text-sm font-bold text-neutral-900 dark:text-white mb-1">{children}</h2>,
    h3: ({ children }) => <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">{children}</h3>,
    code: ({ inline, children }) =>
        inline
            ? <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-[11px] font-mono text-brand-600 dark:text-brand-400">{children}</code>
            : <pre className="bg-neutral-900 text-neutral-100 p-2 rounded-lg text-[11px] overflow-x-auto my-2 border border-neutral-800 tracking-tight font-mono">{children}</pre>,
};

const TypingDots = () => (
    <div className="flex items-center gap-1.5 py-2">
        {[0, 150, 300].map(delay => (
            <span
                key={delay}
                className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
            />
        ))}
    </div>
);

/**
 * AiSectionChat — Reusable AI sparkle button + slide-up chat panel
 */
const AiSectionChat = ({
    sectionTitle = 'This Section',
    contextPrompt,
    activeSources = [],
    iconSize = 'sm',
    label,
}) => {
    const { user, token } = useAuthStore();
    const { activeSiteId } = useAccountsStore();

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [autoAsked, setAutoAsked] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const panelRef = useRef(null);

    /* ── Scroll to bottom whenever messages update ── */
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
        }
    }, [messages, isOpen]);

    /* ── Focus input when panel opens ── */
    useEffect(() => {
        if (isOpen && !loading) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen, loading]);

    /* ── Reset state when prompt changes ── */
    useEffect(() => {
        setAutoAsked(false);
        setMessages([]);
    }, [contextPrompt]);

    /* ── Auto-ask logic ── */
    useEffect(() => {
        if (isOpen && !autoAsked && contextPrompt) {
            setAutoAsked(true);
            sendMessage(contextPrompt);
        }
        if (!isOpen) {
            setAutoAsked(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    /* ── Click outside ── */
    useEffect(() => {
        const handler = (e) => {
            if (isOpen && panelRef.current && !panelRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    /* ── Escape key ── */
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') setIsOpen(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    /* ── Core send function ── */
    const sendMessage = useCallback(async (text, displayLabel) => {
        const question = (typeof text === 'string' ? text : input).trim();
        if (!question || loading) return;
        
        const showText = displayLabel || question;
        setInput('');

        setMessages(prev => [
            ...prev,
            { role: 'user', content: showText },
            { role: 'assistant', content: '', isLoading: true }
        ]);
        setLoading(true);

        try {
            const url = getApiUrl('/ai/ask');
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    question, // Original full technical prompt
                    activeSources: activeSources.length > 0
                        ? activeSources
                        : ['gsc', 'ga4', 'google-ads', 'facebook-ads'],
                    siteId: activeSiteId || undefined,
                    history: messages
                        .filter(m => !m.isLoading)
                        .map(m => ({ role: m.role, content: m.content })),
                }),
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                for (const line of chunk.split('\n')) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.chunk) {
                            accumulated += data.chunk;
                            setMessages(prev => {
                                const updated = [...prev];
                                const last = updated[updated.length - 1];
                                if (last?.role === 'assistant') {
                                    updated[updated.length - 1] = {
                                        ...last,
                                        content: accumulated,
                                        isLoading: false,
                                    };
                                }
                                return updated;
                            });
                        }
                        if (data.error) throw new Error(data.error);
                    } catch { }
                }
            }
        } catch {
            const friendlyMsg = 'Something went wrong while processing your request. Please check your connection or try again in a moment.';
            const errorType = 'generic';
            const failedQuestion = (typeof text === 'string' ? text : input) || question;

            setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') {
                    updated[updated.length - 1] = {
                        ...last,
                        content: friendlyMsg,
                        isLoading: false,
                        isError: true,
                        errorType,
                        retryQuestion: failedQuestion,
                    };
                }
                return updated;
            });
        } finally {
            setLoading(false);
            // Ensure any assistant message that didn't get a chunk is also marked as not loading
            setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant' && last.isLoading) {
                    updated[updated.length - 1] = { ...last, isLoading: false };
                }
                return updated;
            });
        }
    }, [input, loading, token, activeSources, activeSiteId, messages]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleReset = () => {
        setMessages([]);
        setAutoAsked(false);
        setInput('');
    };

    const iconClass = iconSize === 'md' ? 'w-8 h-8' : 'w-6 h-6';
    const sparkleClass = iconSize === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                title={label || `Ask AI about ${sectionTitle}`}
                className={`relative flex items-center justify-center ${label ? 'px-4 py-2.5 gap-2 w-full sm:w-auto' : iconClass} rounded-xl bg-gradient-to-br from-brand-500/10 to-purple-500/10 border border-brand-500/20 dark:border-brand-500/30 text-brand-600 dark:text-brand-400 hover:from-brand-500/20 hover:to-purple-500/20 hover:border-brand-500/40 hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm hover:shadow-brand-500/20 hover:shadow-lg group overflow-hidden`}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <SparklesIcon className={`${sparkleClass} group-hover:animate-pulse shrink-0`} />
                {label && <span className="text-xs font-black uppercase tracking-wider whitespace-nowrap">{label}</span>}
            </button>

            {isOpen && createPortal(
                <div className="fixed inset-0 z-[999999] bg-neutral-900/60 backdrop-blur-md animate-fade-in flex items-center justify-center p-4">
                    <div
                        ref={panelRef}
                        className="pointer-events-auto w-full max-w-2xl bg-white dark:bg-[#111] border border-neutral-200/80 dark:border-neutral-700/80 rounded-[2rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col max-h-[85vh] overflow-hidden"
                        style={{ animation: 'slideUp 0.28s cubic-bezier(0.22,1,0.36,1)' }}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg">
                                    <SparklesIcon className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-neutral-900 dark:text-white leading-none">RankPilot AI</p>
                                    <p className="text-[10px] text-neutral-400 mt-1 font-bold tracking-wide uppercase">{sectionTitle}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handleReset} title="Reset conversation" className="p-2 rounded-xl text-neutral-400 hover:text-brand-600 hover:bg-brand-50 transition-all">
                                    <ArrowPathIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => setIsOpen(false)} className="p-2 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-all">
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scroll-smooth custom-scrollbar">
                            {messages.length === 0 && !loading && (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-neutral-400 py-12">
                                    <div className="w-16 h-16 rounded-3xl bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-center border border-neutral-100 dark:border-neutral-800">
                                        <SparklesIcon className="w-8 h-8 opacity-20" />
                                    </div>
                                    <p className="text-xs font-bold uppercase tracking-widest opacity-60">Ready to analyze {sectionTitle}</p>
                                </div>
                            )}

                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                                >
                                    <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-4`}>
                                        <div className="shrink-0 mt-1">
                                            {msg.role === 'user' ? (
                                                <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center text-xs font-black border border-neutral-700 shadow-xl">
                                                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-xl bg-white dark:bg-neutral-800 flex items-center justify-center shadow-md border border-neutral-100 dark:border-neutral-700">
                                                    <SparklesIcon className="w-4 h-4 text-brand-600" />
                                                </div>
                                            )}
                                        </div>

                                        <div
                                            className={`px-4 py-3 leading-relaxed shadow-sm ${
                                                msg.role === 'user'
                                                    ? 'bg-brand-600 text-white rounded-[1.25rem] rounded-tr-sm font-bold text-sm shadow-brand-500/20'
                                                    : msg.isError
                                                        ? 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/20 rounded-[1.25rem] rounded-tl-sm text-sm'
                                                        : 'text-neutral-800 dark:text-neutral-200 prose prose-neutral dark:prose-invert max-w-none text-sm'
                                            }`}
                                        >
                                            {msg.role === 'assistant'
                                                ? msg.isLoading
                                                    ? <TypingDots />
                                                    : msg.content 
                                                        ? (
                                                            <>
                                                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>
                                                                    {msg.content}
                                                                </ReactMarkdown>
                                                                {msg.isError && msg.retryQuestion && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setMessages(prev => prev.slice(0, -2));
                                                                            setTimeout(() => sendMessage(msg.retryQuestion), 50);
                                                                        }}
                                                                        className="mt-3 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-red-100/50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all border border-red-200/50 dark:border-red-800/30"
                                                                    >
                                                                        🔄 Try Again
                                                                    </button>
                                                                )}
                                                            </>
                                                        )
                                                        : (
                                                            <div className="flex items-center gap-2 text-neutral-400 italic text-xs">
                                                                <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-pulse" />
                                                                No response generated. Please check your connection.
                                                            </div>
                                                        )
                                                : msg.content
                                            }
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-6 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                            <div className="relative flex items-center gap-2 bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-2xl px-4 py-2 shadow-sm focus-within:ring-2 ring-brand-500/20 transition-all">
                                <textarea
                                    ref={inputRef}
                                    rows={1}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={loading}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-transparent border-none outline-none text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 resize-none max-h-32 min-h-[24px] leading-6"
                                />
                                <button
                                    onClick={() => sendMessage()}
                                    disabled={!input.trim() || loading}
                                    className="p-2 rounded-xl bg-brand-600 text-white disabled:opacity-40 hover:bg-brand-700 transition-all shadow-lg active:scale-95 shrink-0"
                                >
                                    {loading
                                        ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                        : <PaperAirplaneIcon className="w-4 h-4 -rotate-45" />
                                    }
                                </button>
                            </div>
                            <p className="text-[10px] text-neutral-400 text-center mt-3 font-bold uppercase tracking-widest opacity-60">
                                AI Pulse · Press <kbd className="bg-neutral-200 dark:bg-neutral-800 px-1 rounded text-neutral-600">Enter</kbd> to send
                            </p>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(32px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes shimmer {
                    from { transform: translateX(-100%); }
                    to   { transform: translateX(100%); }
                }
                .group:hover .group-hover:animate-shimmer {
                    animation: shimmer 1s infinite linear;
                }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; }
            `}</style>
        </>
    );
};

export default AiSectionChat;
