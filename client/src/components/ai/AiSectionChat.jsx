import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    SparklesIcon,
    XMarkIcon,
    PaperAirplaneIcon,
    ArrowPathIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChartRenderer from './ChartRenderer';
import { useAuthStore } from '../../store/authStore';
import { useAccountsStore } from '../../store/accountsStore';
import { getApiUrl } from '../../api';

/* ─── Markdown Component Overrides ─── */
const MD = {
    p: ({ children }) => <p className="leading-relaxed text-[13px] text-neutral-700 dark:text-neutral-100 mb-2 last:mb-0 break-words [word-break:break-word]">{children}</p>,
    strong: ({ children }) => <strong className="font-extrabold text-neutral-900 dark:text-white break-words [word-break:break-word]">{children}</strong>,
    ul: ({ children }) => <ul className="space-y-2 mb-3 pl-4 list-disc marker:text-brand-500 marker:font-black">{children}</ul>,
    ol: ({ children }) => <ol className="space-y-2 mb-3 pl-4 list-decimal marker:text-brand-500 marker:font-black">{children}</ol>,
    li: ({ children }) => <li className="text-[13px] text-neutral-700 dark:text-neutral-100 break-words [word-break:break-word] pl-1">{children}</li>,
    h1: ({ children }) => <h1 className="text-sm font-black text-neutral-900 dark:text-white mb-2 uppercase tracking-tight">{children}</h1>,
    h2: ({ children }) => <h2 className="text-sm font-black text-neutral-900 dark:text-white mb-2 tracking-tight">{children}</h2>,
    h3: ({ children }) => <h3 className="text-xs font-black text-neutral-800 dark:text-neutral-50 mb-1.5">{children}</h3>,
    code: ({ inline, className, children, ...props }) => {
        const match = /language-json-chart-(\w+)/.exec(className || '');
        const isJson = /language-json/.test(className || '');
        const text = String(children).trim();

        if (!inline && (match || isJson)) {
            try {
                const cleanedJson = text
                    .replace(/\/\/.*/g, '') 
                    .replace(/\/\*[\s\S]*?\*\//g, '') 
                    .replace(/\n$/g, '') 
                    .trim();

                const chartData = JSON.parse(cleanedJson);
                
                const hasChartKeys = (obj) => {
                    const keys = ['labels', 'label', 'datasets', 'dataset', 'chartType', 'series', 'categories', 'xAxis', 'yAxis'];
                    const rootKeys = Object.keys(obj || {});
                    const nestedKeys = (obj?.data && !Array.isArray(obj.data)) ? Object.keys(obj.data) : [];
                    const isDataArray = Array.isArray(obj?.data);
                    return keys.some(k => rootKeys.includes(k) || nestedKeys.includes(k)) || (isDataArray && rootKeys.includes('series'));
                };

                if (!match && isJson && !hasChartKeys(chartData)) {
                    return (
                        <div className="my-3 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-sm bg-neutral-900 p-3">
                            <div className="flex items-center gap-2 mb-2 pb-1 border-b border-white/5">
                                <DocumentTextIcon className="w-3 h-3 text-neutral-400" />
                                <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Raw Data</span>
                            </div>
                            <code className="text-[11px] font-mono text-neutral-300 block whitespace-pre overflow-x-auto" {...props}>{children}</code>
                        </div>
                    );
                }
                
                const finalType = match ? match[1] : (chartData.chartType || 'line');

                return (
                    <div className="my-4 w-full overflow-hidden scale-90 -mx-4 origin-left">
                        <ChartRenderer type={finalType} data={chartData} />
                    </div>
                );
            } catch (err) {
                // Fallback
            }
        }

        return inline
            ? <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-[11px] font-mono text-brand-600 dark:text-brand-400">{children}</code>
            : <pre className="bg-neutral-900 text-neutral-100 p-2 rounded-lg text-[11px] overflow-x-auto my-2 border border-neutral-800 tracking-tight font-mono">{children}</pre>;
    },
};

const TypingIndicator = () => {
    const [phrase, setPhrase] = useState("Thinking");
    const phrases = ["Thinking", "Analyzing Data", "Drafting Response", "Refining Insights"];

    useEffect(() => {
        let i = 0;
        const interval = setInterval(() => {
            i = (i + 1) % phrases.length;
            setPhrase(phrases[i]);
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-3 py-1">
            <div className="flex items-center gap-1">
                {[0, 150, 300].map(delay => (
                    <span
                        key={delay}
                        className="w-1 h-1 rounded-full bg-brand-500 animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                    />
                ))}
            </div>
            <span className="text-[10px] font-black text-brand-600/80 dark:text-brand-400 uppercase tracking-[0.15em] animate-pulse">
                {phrase}
            </span>
        </div>
    );
};

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
                className={`relative flex items-center justify-center ${
                    label
                    ? 'px-3.5 py-2 gap-1.5 w-full sm:w-auto'
                    : iconClass
                } rounded-xl bg-brand-600/10 dark:bg-brand-500/10 border border-brand-500/20 dark:border-brand-500/25 text-brand-600 dark:text-brand-400 hover:bg-brand-600/15 dark:hover:bg-brand-500/15 hover:border-brand-500/35 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 shadow-sm hover:shadow-brand-500/15 hover:shadow-md group`}
                >
                <SparklesIcon className={`${sparkleClass} flex-shrink-0 group-hover:rotate-12 transition-transform duration-300`}/>
                {label && (
                    <span className="text-[11px] font-black uppercase tracking-wide whitespace-nowrap">{label}</span>
                )}
            </button>

            {isOpen && createPortal(
            <div className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6">

                {/* Backdrop */}
                <div
                className="absolute inset-0 bg-neutral-950/50 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
                style={{ animation: 'fadeIn 0.2s ease-out' }}
                />

                {/* Panel */}
                <div
                ref={panelRef}
                className="relative w-full sm:max-w-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/60 rounded-t-3xl sm:rounded-3xl shadow-[0_32px_80px_-12px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden max-h-[90vh] sm:max-h-[85vh]"
                style={{
                    animation: 'slideUp 0.25s cubic-bezier(0.22,1,0.36,1)'
                }}
                >

                {/* Header */}
                <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30 flex-shrink-0">
                        <SparklesIcon className="w-4.5 h-4.5 text-white" style={{width:'18px',height:'18px'}}/>
                    </div>
                    <div>
                        <p className="text-sm font-black text-neutral-900 dark:text-white leading-tight">RankPilot AI</p>
                        <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mt-0.5">{sectionTitle}</p>
                    </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                    <button
                        onClick={handleReset}
                        title="Reset conversation"
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all"
                    >
                        <ArrowPathIcon className="w-4 h-4"/>
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    >
                        <XMarkIcon className="w-4 h-4"/>
                    </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-5 md:px-6 py-4 sm:py-5 md:py-6 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                    {/* Empty state */}
                    {messages.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 flex items-center justify-center mb-4">
                        <SparklesIcon className="w-7 h-7 text-neutral-300 dark:text-neutral-600"/>
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                        Ready to analyze
                        </p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 font-medium">{sectionTitle}</p>
                    </div>
                    )}

                    {/* Messages */}
                    {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        style={{ animation: 'fadeIn 0.2s ease-out' }}
                    >
                        <div className={`flex items-start gap-2.5 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                        {/* Avatar */}
                        <div className="flex-shrink-0 mt-0.5">
                            {msg.role === 'user' ? (
                            <div className="w-7 h-7 rounded-full bg-neutral-800 dark:bg-neutral-700 text-white flex items-center justify-center text-[10px] font-black overflow-hidden border border-neutral-100 dark:border-neutral-700">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    user?.name?.charAt(0)?.toUpperCase() || 'U'
                                )}
                            </div>
                            ) : (
                            <div className="w-7 h-7 rounded-full bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 flex items-center justify-center shadow-sm p-1">
                                <img src="/favicon.png" alt="AI" className="w-full h-full object-contain" />
                            </div>
                            )}
                        </div>

                        {/* Bubble */}
                        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            msg.role === 'user'
                            ? 'bg-brand-600 text-white font-medium rounded-tr-sm shadow-md shadow-brand-500/20'
                            : msg.isError
                            ? 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/30 rounded-tl-sm'
                            : 'bg-neutral-50 dark:bg-dark-card/60 border border-neutral-100 dark:border-neutral-700/40 rounded-tl-sm backdrop-blur-xl'
                        }`}>
                            {msg.role === 'assistant' ? (
                            msg.isLoading ? (
                                <TypingIndicator/>
                            ) : msg.content ? (
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
                                    className="mt-2 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-red-100/60 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all border border-red-200/50 dark:border-red-800/30"
                                    >
                                    🔄 Try Again
                                    </button>
                                )}
                                </>
                            ) : (
                                <div className="flex items-center gap-2 text-xs text-neutral-400 italic">
                                <span className="w-1 h-1 rounded-full bg-neutral-400 animate-pulse"/>
                                No response. Please check your connection.
                                </div>
                            )
                            ) : msg.content}
                        </div>
                        </div>
                    </div>
                    ))}
                    <div ref={messagesEndRef}/>
                </div>

                {/* Input area */}
                <div className="shrink-0 px-4 sm:px-5 md:px-6 py-3 sm:py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                    <div className="flex items-end gap-2 bg-white dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-4 py-3 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/10 transition-all">
                    <textarea
                        ref={inputRef}
                        rows={1}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={loading}
                        placeholder="Ask a follow-up question..."
                        className="flex-1 bg-transparent border-none outline-none text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 resize-none max-h-28 min-h-[22px] py-2 leading-normal font-medium"
                    />
                    <button
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || loading}
                        className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:bg-neutral-200 dark:disabled:bg-neutral-700 disabled:text-neutral-400 transition-all shadow-md shadow-brand-500/20 active:scale-95"
                    >
                        {loading
                        ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin"/>
                        : <PaperAirplaneIcon className="w-3.5 h-3.5"/>
                        }
                    </button>
                    </div>
                    <p className="text-center text-[10px] text-neutral-400 dark:text-neutral-500 mt-2.5 font-medium">
                    Press <kbd className="px-1.5 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 text-[9px] font-black">Enter</kbd> to send · <kbd className="px-1.5 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 text-[9px] font-black">Esc</kbd> to close
                    </p>
                </div>
                </div>
            </div>,
            document.body
            )}

            <style>{`
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(24px) scale(0.98); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to   { opacity: 1; }
            }
            `}</style>
        </>
    );
};

export default AiSectionChat;
