import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    SparklesIcon,
    XMarkIcon,
    PaperAirplaneIcon,
    ArrowPathIcon,
    ChatBubbleLeftRightIcon,
    MinusIcon,
} from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuthStore } from '../../store/authStore';
import { useAccountsStore } from '../../store/accountsStore';
import { getApiUrl } from '../../api';
import { useAiChatStore } from '../../store/aiChatStore';


/* ─── Markdown Component Overrides (Compact for Sidebar/Bubble) ─── */
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

    /* ── Scroll to bottom ── */
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
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
            <div className="fixed bottom-6 right-6 z-[99999]">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 hover:scale-110 active:scale-90 group ${
                        isOpen 
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rotate-[360deg]' 
                        : 'bg-white dark:bg-neutral-800 shadow-[0_20px_50px_rgba(59,130,246,0.25)]'
                    }`}
                >
                    {/* Animated Gradient Border */}
                    {!isOpen && (
                        <div className="absolute -inset-[2px] rounded-full bg-gradient-to-tr from-brand-600 via-blue-500 to-cyan-400 opacity-20 group-hover:opacity-100 transition-opacity duration-500 -z-10 animate-pulse-slow"></div>
                    )}
                    
                    {/* Glass Overlay */}
                    <div className="absolute inset-0 rounded-full border border-neutral-100 dark:border-neutral-700 pointer-events-none"></div>

                    {isOpen ? (
                        <XMarkIcon className="w-8 h-8 relative z-10" />
                    ) : (
                        <div className="relative z-10 w-11 h-11 flex items-center justify-center">
                            <img 
                                src="/favicon.png" 
                                alt="AI" 
                                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" 
                            />
                            {/* AI Badge */}
                            <div className="absolute -bottom-1 -right-1 bg-brand-600 rounded-full p-1 border-2 border-white dark:border-neutral-800 shadow-md transform group-hover:translate-x-1 group-hover:translate-y-1 transition-transform">
                                <SparklesIcon className="w-2.5 h-2.5 text-white fill-white" />
                            </div>
                        </div>
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
                    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-neutral-50/30 dark:bg-neutral-900/10">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                                <div className="w-16 h-16 rounded-3xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/50 dark:border-neutral-700/50 flex items-center justify-center mb-4 rotate-3 group-hover:rotate-0 transition-transform">
                                    <ChatBubbleLeftRightIcon className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                                </div>
                                <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-tight">How can I help today?</h3>
                                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 max-w-[200px] leading-relaxed font-medium">
                                    I can analyze your marketing data, identify SEO gaps, or suggest growth strategies.
                                </p>
                                <div className="mt-8 grid grid-cols-1 gap-2 w-full max-w-[280px]">
                                    {[
                                        "How is my site performing?",
                                        "Top 5 organic keywords?",
                                        "Where is my traffic leaving?",
                                    ].map((q, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => sendMessage(q)}
                                            className="px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-[11px] font-bold text-neutral-500 hover:text-brand-600 hover:border-brand-500 transition-all text-left shadow-sm active:scale-95"
                                        >
                                            {q}
                                        </button>
                                    ))}
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
                                    <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center shadow-sm text-[10px] font-black mt-1 overflow-hidden ${
                                        msg.role === 'user' ? 'bg-neutral-800 text-white' : 'bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700'
                                    }`}>
                                        {msg.role === 'user' ? (user?.name?.charAt(0) || 'U') : <img src="/favicon.png" alt="AI" className="w-5 h-5 object-contain" />}
                                    </div>
                                    <div className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed font-medium ${
                                        msg.role === 'user'
                                        ? 'bg-brand-600 text-white rounded-tr-sm shadow-lg shadow-brand-500/20'
                                        : 'bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700/50 text-neutral-800 dark:text-neutral-100 rounded-tl-sm shadow-sm'
                                    }`}>
                                        {msg.isLoading ? (
                                            <TypingDots />
                                        ) : (
                                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>
                                                {msg.content}
                                            </ReactMarkdown>
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
                                className="flex-1 bg-transparent border-none outline-none text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 resize-none max-h-32 min-h-[22px] py-1 font-medium"
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={!input.trim() || loading}
                                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-500/30 disabled:opacity-50 disabled:shadow-none hover:bg-brand-700 transition-all active:scale-90"
                            >
                                {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PaperAirplaneIcon className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-center text-[9px] text-neutral-400 mt-2.5 font-bold uppercase tracking-widest opacity-60">
                            Powered by Gemini Engine
                        </p>
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
