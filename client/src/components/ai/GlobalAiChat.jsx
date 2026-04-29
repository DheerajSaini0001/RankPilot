import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    SparklesIcon,
    XMarkIcon,
    PaperAirplaneIcon,
    ArrowPathIcon,
    ChatBubbleLeftRightIcon,
    MinusIcon,
    ExclamationTriangleIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChartRenderer from './ChartRenderer';
import { useAuthStore } from '../../store/authStore';
import { useAccountsStore } from '../../store/accountsStore';
import { getApiUrl } from '../../api';
import { getSuggestedQuestions } from '../../api/aiApi';
import { useAiChatStore } from '../../store/aiChatStore';


/* ─── Markdown Component Overrides (Compact for Sidebar/Bubble) ─── */
const MD = {
    p: ({ children }) => <p className="leading-relaxed text-[13px] text-neutral-700 dark:text-neutral-200 mb-2 last:mb-0 break-words [word-break:break-word]">{children}</p>,
    strong: ({ children }) => <strong className="font-extrabold text-neutral-900 dark:text-white break-words [word-break:break-word]">{children}</strong>,
    ul: ({ children }) => <ul className="space-y-2 mb-3 pl-4 list-disc marker:text-brand-500 marker:font-black">{children}</ul>,
    ol: ({ children }) => <ol className="space-y-2 mb-3 pl-4 list-decimal marker:text-brand-500 marker:font-black">{children}</ol>,
    li: ({ children }) => <li className="text-[13px] text-neutral-700 dark:text-neutral-200 break-words [word-break:break-word] pl-1">{children}</li>,
    h1: ({ children }) => <h1 className="text-sm font-black text-neutral-900 dark:text-white mb-2 uppercase tracking-tight">{children}</h1>,
    h2: ({ children }) => <h2 className="text-sm font-black text-neutral-900 dark:text-white mb-2 tracking-tight">{children}</h2>,
    h3: ({ children }) => <h3 className="text-xs font-black text-neutral-800 dark:text-neutral-50 mb-1.5">{children}</h3>,
    a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 font-bold underline decoration-brand-500/30 underline-offset-2 hover:decoration-brand-500 transition-all">{children}</a>,
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
                // Fallback to normal code block on error
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
 * GlobalAiChat — Floating bubble chat for the entire project
 */
const GlobalAiChat = () => {
    const { user, token } = useAuthStore();
    const { activeSiteId } = useAccountsStore();

    const { isOpen, setIsOpen, initialQuestion, clearInitialQuestion } = useAiChatStore();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const panelRef = useRef(null);

    /* ── Core send function ── */
    const sendMessage = useCallback(async (text) => {
        const question = (typeof text === 'string' ? text : input).trim();
        if (!question || loading) return;

        setInput('');
        setMessages(prev => [
            ...prev,
            { role: 'user', content: question },
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
                    question,
                    conversationId: conversationId || undefined,
                    siteId: activeSiteId || undefined,
                    history: messages
                        .filter(m => !m.isLoading)
                        .map(m => ({ role: m.role, content: m.content })),
                }),
            });

            if (!response.ok) throw new Error('Failed to fetch');

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

                        if (data.conversationId && !conversationId) {
                            setConversationId(data.conversationId);
                        }

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

                        if (data.error) {
                            setMessages(prev => {
                                const updated = [...prev];
                                const last = updated[updated.length - 1];
                                if (last?.role === 'assistant') {
                                    updated[updated.length - 1] = {
                                        ...last,
                                        content: data.error,
                                        isLoading: false,
                                        isError: true
                                    };
                                }
                                return updated;
                            });
                            break;
                        }
                    } catch { }
                }
            }
        } catch (err) {
            setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') {
                    updated[updated.length - 1] = {
                        ...last,
                        content: "Sorry, I'm having trouble connecting right now. Please try again.",
                        isLoading: false,
                        isError: true,
                    };
                }
                return updated;
            });
        } finally {
            setLoading(false);
        }
    }, [input, loading, token, activeSiteId, messages, conversationId]);

    const loadSuggestions = useCallback(async () => {
        if (!activeSiteId) return;
        setSuggestionsLoading(true);
        try {
            const res = await getSuggestedQuestions(activeSiteId);
            if (res.data && res.data.questions) {
                setSuggestions(res.data.questions);
            }
        } catch (err) {
            console.error("Failed to load suggestions:", err);
            setSuggestions([
                "How is my site performing?",
                "Top 5 organic keywords?",
                "Where is my traffic leaving?",
            ]);
        } finally {
            setSuggestionsLoading(false);
        }
    }, [activeSiteId]);

    useEffect(() => {
        if (isOpen && suggestions.length === 0) {
            loadSuggestions();
        }
    }, [isOpen, suggestions.length, loadSuggestions]);

    useEffect(() => {
        setSuggestions([]); // Reset when site changes to force re-fetch
    }, [activeSiteId]);

    /* ── Scroll to bottom ── */
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                if (messages.length > 0) {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }
            }, 60);
        }
    }, [messages, isOpen]);

    /* ── Handle initial question from store ── */
    useEffect(() => {
        if (initialQuestion) {
            sendMessage(initialQuestion);
            clearInitialQuestion();
        }
    }, [initialQuestion, sendMessage, clearInitialQuestion]);

    /* ── Focus input ── */
    useEffect(() => {
        if (isOpen && !loading) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen, loading]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleReset = () => {
        setMessages([]);
        setConversationId(null);
        setInput('');
    };

    // Don't render if not logged in
    if (!user) return null;

    return (
        <>
            {/* Floating Bubble */}
            <div className="fixed bottom-6 right-6 z-[99999] group">
                {/* Tooltip */}
                {!isOpen && (
                    <div className="absolute bottom-full right-0 mb-4 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none translate-y-2 group-hover:translate-y-0">
                        <div className="relative bg-neutral-900 text-white text-[11px] font-black px-4 py-2 rounded-xl whitespace-nowrap shadow-2xl uppercase tracking-widest border border-white/10">
                            ✨ Ask AI about your data
                            <div className="absolute -bottom-1 right-8 w-2 h-2 bg-neutral-900 rotate-45 border-r border-b border-white/10"></div>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`relative flex items-center gap-2.5 px-6 py-4 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl overflow-hidden ${
                        isOpen 
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' 
                        : 'bg-brand-600 text-white shadow-brand-500/40'
                    }`}
                >
                    {/* Shine/Shimmer Effect */}
                    {!isOpen && (
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
                    )}

                    {isOpen ? (
                        <>
                            <XMarkIcon className="w-5 h-5 relative z-10" strokeWidth={2.5} />
                            <span className="text-sm font-black tracking-wide relative z-10">Close</span>
                        </>
                    ) : (
                        <>
                            <SparklesIcon className="w-5 h-5 animate-pulse relative z-10" strokeWidth={2.5} />
                            <span className="text-sm font-black tracking-wide relative z-10">Ask AI</span>
                            {/* Live Dot */}
                            <div className="relative flex h-2 w-2 ml-1 relative z-10">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                            </div>
                        </>
                    )}
                </button>
            </div>

            {/* Chat Panel */}
            {isOpen && (
                <div
                    className="fixed bottom-24 right-6 z-[99998] w-[calc(100vw-48px)] sm:w-[400px] h-[550px] max-h-[calc(100vh-120px)] bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/60 rounded-[2rem] shadow-[0_32px_80px_-12px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden transition-all duration-300"
                    style={{ animation: 'slideIn 0.3s cubic-bezier(0.22,1,0.36,1)' }}
                >
                    {/* Header */}
                    <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 flex items-center justify-center shadow-lg flex-shrink-0 animate-pulse p-1">
                                <img src="/favicon.png" alt="RankPilot AI" className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-neutral-900 dark:text-white leading-tight">RankPilot AI</p>
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">
                                    Intelligent Analytics Pilot
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleReset}
                                title="Reset Chat"
                                className="w-8 h-8 flex items-center justify-center rounded-xl text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all font-black"
                            >
                                <ArrowPathIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
                            >
                                <MinusIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 flex flex-col overflow-y-auto px-4 py-5 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-neutral-50/30 dark:bg-dark-bg/40">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center pt-2 pb-6 text-center min-h-min">
                                <div className="shrink-0 w-16 h-16 rounded-3xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/50 dark:border-neutral-700/50 flex items-center justify-center mb-4 rotate-3 group-hover:rotate-0 transition-transform">
                                    <ChatBubbleLeftRightIcon className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                                </div>
                                <h3 className="shrink-0 text-sm font-black text-neutral-900 dark:text-white uppercase tracking-tight">How can I help today?</h3>
                                <p className="shrink-0 text-xs text-neutral-400 dark:text-neutral-500 mt-2 max-w-[240px] leading-relaxed font-medium">
                                    I can analyze your marketing data, identify SEO gaps, or suggest growth strategies.
                                </p>
                                <div className="shrink-0 mt-6 grid grid-cols-1 gap-2.5 w-full max-w-[320px]">
                                    {suggestionsLoading ? (
                                        [1, 2, 3].map(i => (
                                            <div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded-2xl animate-pulse" />
                                        ))
                                    ) : (
                                        (suggestions.length > 0 ? suggestions : [
                                            "How is my site performing?",
                                            "Top 5 organic keywords?",
                                            "Where is my traffic leaving?",
                                        ]).map((q, i) => (
                                            <button
                                                key={i}
                                                onClick={() => sendMessage(q)}
                                                className="px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/50 rounded-2xl text-[11px] font-bold text-neutral-500 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-500 transition-all text-left shadow-sm active:scale-95"
                                            >
                                                {q}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                style={{ animation: 'fadeIn 0.2s ease-out' }}
                            >
                                <div className={`flex items-start gap-2.5 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center shadow-sm text-[10px] font-black mt-1 overflow-hidden ${msg.role === 'user' ? 'bg-neutral-800 text-white' : 'bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700'
                                        }`}>
                                        {msg.role === 'user' ? (
                                            user?.avatar ? (
                                                <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
                                            ) : (
                                                user?.name?.charAt(0)?.toUpperCase() || 'U'
                                            )
                                        ) : (
                                            <img src="/favicon.png" alt="AI" className="w-5 h-5 object-contain" />
                                        )}
                                    </div>
                                    <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-brand-600 text-white rounded-2xl rounded-tr-sm shadow-lg shadow-brand-500/20 px-4 py-3' : 'bg-transparent'}`}>
                                        {msg.isLoading ? (
                                            <div className="bg-white dark:bg-neutral-800/80 border border-neutral-100 dark:border-neutral-700/50 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm backdrop-blur-sm">
                                                <TypingIndicator />
                                            </div>
                                        ) : msg.isError ? (
                                            <div className="flex items-center gap-3.5 p-3.5 bg-red-50/50 dark:bg-red-900/10 border border-red-100/50 dark:border-red-900/30 rounded-2xl shadow-sm animate-in fade-in zoom-in duration-300">
                                                <div className="shrink-0 w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                                    <ExclamationTriangleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-red-500/60 dark:text-red-400/40">AI Exception</span>
                                                    <p className="text-[12px] font-bold text-red-700 dark:text-red-300 leading-snug">
                                                        {msg.content}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-white dark:bg-dark-card/60 border border-neutral-100 dark:border-neutral-700/40 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm text-neutral-800 dark:text-neutral-100 text-[13px] leading-relaxed font-medium backdrop-blur-xl">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="shrink-0 p-4 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        <div className="relative flex items-end gap-2 bg-neutral-100 dark:bg-neutral-800 border-none rounded-2xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                            <textarea
                                ref={inputRef}
                                rows={1}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={loading}
                                placeholder="Type a message..."
                                className="flex-1 bg-transparent border-none outline-none text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 resize-none max-h-32 min-h-[22px] py-2 leading-normal font-medium"
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={!input.trim() || loading}
                                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-500/30 disabled:opacity-50 disabled:shadow-none hover:bg-brand-700 transition-all active:scale-90"
                            >
                                {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PaperAirplaneIcon className="w-4 h-4" />}
                            </button>
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-2.5 opacity-40 select-none">
                            <SparklesIcon className="w-2.5 h-2.5 text-brand-500" />
                            <p className="text-[9px] text-neutral-400 font-black uppercase tracking-[0.2em]">
                                Powered by <span className="text-brand-600 dark:text-brand-400">RankPilot Intelligence</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes shimmer {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite ease-in-out;
                }
                .animate-bounce-subtle {
                    animation: bounceSubtle 3s infinite ease-in-out;
                }
                @keyframes bounceSubtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
            `}</style>
        </>
    );
};

export default GlobalAiChat;
