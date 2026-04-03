import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/ui/DashboardLayout';
import { useAccountsStore } from '../store/accountsStore';
import { useAuthStore } from '../store/authStore';
import {
    PaperAirplaneIcon,
    SparklesIcon,
    ChatBubbleLeftRightIcon,
    TrashIcon,
    PlusIcon,
    ChartBarIcon,
    ArrowPathIcon,
    ChevronDownIcon,
    DocumentTextIcon,
    CursorArrowRaysIcon,
    InboxStackIcon,
    SpeakerWaveIcon,
    MagnifyingGlassIcon,
    ArrowTrendingUpIcon,
    LinkIcon,
    GlobeAltIcon,
} from '@heroicons/react/24/outline';
import {
    getConversations,
    getConversation,
    deleteConversation,
    getWeeklyInsight,
    refreshWeeklyInsight,
    getSuggestedQuestions,
} from '../api/aiApi';
import { getApiUrl } from '../api/index';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChartRenderer from '../components/ai/ChartRenderer';

const MarkdownComponents = {
    code({ inline, className, children, ...props }) {
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
                    const keys = ['labels', 'label', 'datasets', 'dataset', 'chartType', 'series', 'categories'];
                    const rootKeys = Object.keys(obj || {});
                    const nestedKeys = (obj?.data) ? Object.keys(obj.data) : [];
                    return keys.some(k => rootKeys.includes(k) || nestedKeys.includes(k));
                };

                if (!match && isJson && !hasChartKeys(chartData)) {
                    return (
                        <div className="my-6 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-sm bg-neutral-900 dark:bg-black/40 p-4">
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                                <DocumentTextIcon className="w-3.5 h-3.5 text-neutral-400" />
                                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Raw Data / JSON</span>
                            </div>
                            <code className="text-[12px] font-mono text-neutral-300 block whitespace-pre overflow-x-auto" {...props}>{children}</code>
                        </div>
                    );
                }
                
                const finalType = match ? match[1] : (chartData.chartType || 'line');

                return (
                    <div className="my-10 w-full overflow-hidden">
                        <ChartRenderer type={finalType} data={chartData} />
                    </div>
                );
            } catch (err) {
                if (match || (isJson && text.length > 20)) {
                    return (
                        <div className="my-6 p-8 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl flex flex-col items-center justify-center bg-neutral-50/50 dark:bg-neutral-800/20 backdrop-blur-sm">
                            <div className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-ping mb-4" />
                            <span className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.2em] leading-none">
                                {text.endsWith('}') ? 'Rendering Visualisation...' : `Generating ${match ? match[1] : 'Advanced Analytics'}...`}
                            </span>
                        </div>
                    );
                }
            }
        }
        return (
            <code className="px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-brand-600 dark:text-brand-400 font-bold text-[13px]" {...props}>
                {children}
            </code>
        );
    },
    ul: ({ children }) => <ul className="!list-none !p-0 !m-0 !pl-0 space-y-3 mb-8">{children}</ul>,
    ol: ({ children }) => <ol className="!list-decimal !p-0 !m-0 !pl-6 mb-8 space-y-3 marker:text-brand-600 dark:marker:text-brand-400 marker:font-black">{children}</ol>,
    li: ({ children, ordered }) => {
        if (ordered) {
            return (
                <li className="list-item text-[15.5px] leading-relaxed text-neutral-700 dark:text-neutral-100/90 mb-2 !ml-0 font-medium">
                    {children}
                </li>
            );
        }
        return (
            <li className="!list-none !p-0 !m-0 relative !pl-6 text-[15.5px] leading-relaxed text-neutral-750 dark:text-neutral-100 group mb-3 font-medium">
                <span className="absolute left-0 top-[10px] h-2 w-2 rounded-full bg-brand-500 shadow-[0_0_12px_rgba(59,130,246,0.4)] group-hover:scale-125 transition-transform" />
                <div className="!m-0 !p-0 inline-block w-full">{children}</div>
            </li>
        );
    },
    p: ({ children }) => <p className="mb-6 leading-relaxed text-[15.5px] text-neutral-800 dark:text-neutral-200 font-medium">{children}</p>,
    h1: ({ children }) => <h1 className="text-3xl font-black !m-0 !mb-8 tracking-tight text-neutral-900 dark:text-white border-b-4 border-brand-500/10 pb-4">{children}</h1>,
    h2: ({ children }) => <h2 className="text-xl font-extrabold !m-0 !mb-5 mt-10 tracking-tight text-neutral-800 dark:text-neutral-100 flex items-center gap-3">
        <span className="w-1.5 h-6 bg-brand-500 rounded-full" />
        {children}
    </h2>,
    h3: ({ children }) => <h3 className="text-lg font-bold !m-0 !mb-4 mt-8 text-neutral-800 dark:text-neutral-100 border-l-4 border-neutral-200 dark:border-neutral-700 pl-4">{children}</h3>,
    strong: ({ children }) => <strong className="font-bold text-neutral-900 dark:text-white bg-brand-500/5 px-1 rounded">{children}</strong>,
    table: ({ children }) => (
        <div className="my-10 w-full overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-xl">
            <table className="w-full text-left border-collapse min-w-[600px]">
                {children}
            </table>
        </div>
    ),
    thead: ({ children }) => <thead className="bg-neutral-50 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50 bg-white dark:bg-dark-card">{children}</tbody>,
    tr: ({ children }) => <tr className="hover:bg-brand-50/30 dark:hover:bg-brand-900/5 transition-colors">{children}</tr>,
    th: ({ children }) => <th className="px-6 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">{children}</th>,
    td: ({ children }) => <td className="px-6 py-5 text-[14px] text-neutral-700 dark:text-neutral-100 font-bold">{children}</td>
};

const ChatMessage = React.memo(({ msg, userName }) => {
    const isUser = msg.role === 'user';

    if (isUser) {
        return (
            <div className="flex justify-end">
                <div className="flex items-end gap-2.5 flex-row-reverse max-w-[90%] sm:max-w-[85%]">
                    <div className="w-7 h-7 rounded-full bg-neutral-800 dark:bg-neutral-600 text-white flex items-center justify-center text-[10px] font-black flex-shrink-0">
                        {userName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="px-4 py-3 bg-neutral-100 dark:bg-neutral-800 rounded-2xl rounded-br-sm text-sm font-medium text-neutral-900 dark:text-white leading-relaxed max-w-full">
                        {msg.content}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-start">
            <div className="flex items-start gap-3 max-w-[99%] sm:max-w-[96%]">
                <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                    <SparklesIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    {msg.isError ? (
                        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 rounded-xl text-sm text-red-600 dark:text-red-400">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                components={MarkdownComponents}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                        </div>
                    ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
                            {msg.content ? (
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={MarkdownComponents}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            ) : msg.isLoading ? (
                                <div className="flex items-center space-x-2 py-2">
                                    <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            ) : (
                                <div className="py-2 text-neutral-400 font-medium italic text-[14px] flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 animate-pulse" />
                                    No response generated by the server.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

const AIChatPage = () => {
    const { connectedSources, activeSiteId } = useAccountsStore();
    const { user } = useAuthStore();

    const [messages, setMessages] = useState([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const [conversations, setConversations] = useState([]);
    const [activeConversationId, setActiveConversationId] = useState(null);

    const [weeklyInsight, setWeeklyInsight] = useState(null);
    const [insightLoading, setInsightLoading] = useState(false);

    const [suggestions, setSuggestions] = useState([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);

    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isInsightOpen, setIsInsightOpen] = useState(false);
    const [chatToDelete, setChatToDelete] = useState(null);
    const messagesEndRef = useRef(null);
    const sourceMenuRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
        }
    }, [query]);



    useEffect(() => {
        loadConversations();
        loadWeeklyInsight();
        loadSuggestions();
    }, [activeSiteId]);

    const loadConversations = async () => {
        try {
            const res = await getConversations(activeSiteId);
            setConversations(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const loadConversationDetails = async (id) => {
        try {
            const res = await getConversation(id);
            setMessages(res.data.messages);
            setActiveConversationId(res.data._id);
        } catch (err) {
            console.error(err);
        }
    };

    const handleNewChat = () => {
        setActiveConversationId(null);
        setMessages([]);
    };

    const handleDeleteConversation = (id, e) => {
        e.stopPropagation();
        setChatToDelete(id);
    };

    const confirmDelete = async () => {
        if (!chatToDelete) return;
        try {
            await deleteConversation(chatToDelete);
            if (activeConversationId === chatToDelete) {
                handleNewChat();
            }
            setChatToDelete(null);
            loadConversations();
        } catch (err) {
            console.error(err);
        }
    };

    const loadWeeklyInsight = async () => {
        setInsightLoading(true);
        try {
            const res = await getWeeklyInsight(activeSiteId);
            if (res.data) setWeeklyInsight(res.data.content);
        } catch (err) {
            console.error(err);
            setWeeklyInsight(null);
        } finally {
            setInsightLoading(false);
        }
    };

    const handleRefreshInsight = async () => {
        setInsightLoading(true);
        try {
            const res = await refreshWeeklyInsight(activeSiteId);
            setWeeklyInsight(res.data.content);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to refresh insights.");
        } finally {
            setInsightLoading(false);
        }
    };

    const loadSuggestions = async () => {
        setSuggestionsLoading(true);
        try {
            const res = await getSuggestedQuestions(activeSiteId);
            setSuggestions(res.data.questions);
        } catch (err) {
            console.error(err);
            setSuggestions([
                "Find keywords with high impressions but low CTR.",
                "Identify GA4 conversion leaks in my funnel.",
                "Which Google Ads campaigns have highest ROI?",
                "Compare ROAS across Meta Ads audiences."
            ]);
        } finally {
            setSuggestionsLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!query.trim() || loading) return;

        const currentQuery = query.trim();
        setQuery('');

        const newMessages = [...messages, { role: 'user', content: currentQuery }];
        setMessages([...newMessages, { role: 'assistant', content: '', isLoading: true }]);
        setLoading(true);

        const scrollToEnd = () => {
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 50);
        };
        scrollToEnd();

        try {
            const token = useAuthStore.getState().token;
            const url = getApiUrl('/ai/ask');
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    question: currentQuery,
                    conversationId: activeConversationId,
                    siteId: activeSiteId,
                    history: messages.slice(-5).map(m => ({ role: m.role, content: m.content }))
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            if (data.error) {
                                // Sync conversation ID even on error to prevent duplicates
                                if (!activeConversationId && data.conversationId) {
                                    setActiveConversationId(data.conversationId);
                                    loadConversations();
                                }

                                setMessages(prev => {
                                    const updated = [...prev];
                                    const lastMsg = updated[updated.length - 1];
                                    if (lastMsg && lastMsg.role === 'assistant') {
                                        updated[updated.length - 1] = { 
                                            ...lastMsg, 
                                            content: data.error, 
                                            isLoading: false,
                                            isError: true 
                                        };
                                    }
                                    return updated;
                                });
                                break; 
                            }

                            if (data.chunk) {
                                accumulatedContent += data.chunk;
                                setMessages(prev => {
                                    const updated = [...prev];
                                    const lastMsg = updated[updated.length - 1];
                                    if (lastMsg && lastMsg.role === 'assistant') {
                                        updated[updated.length - 1] = { ...lastMsg, content: accumulatedContent, isLoading: false };
                                    }
                                    return updated;
                                });
                                scrollToEnd();
                            }

                            if (data.done) {
                                if (!activeConversationId && data.conversationId) {
                                    setActiveConversationId(data.conversationId);
                                    loadConversations();
                                }
                            }
                        } catch (e) {
                            // Only skip JSON parse errors in chunks
                            console.error("SSE JSON Parse Error:", e);
                        }
                    }
                }
            }
        } catch (err) {
            console.error("AI Error:", err);
            const getFriendlyError = (msg) => {
                if (msg.includes('API_KEY_INVALID')) return "There's a configuration issue with the AI connection.";
                if (msg.includes('QuotaFailure') || msg.includes('limit') || msg.includes('429')) return "High volume of requests. Please wait a minute.";
                if (msg.includes('Network') || msg.includes('fetch')) return "Trouble connecting to the analytics server.";
                if (msg.includes('safety')) return "Falls outside safety guidelines.";
                return "Unexpected error while analyzing your data.";
            };

            const friendlyMsg = getFriendlyError(err.message || "");
            const rawError = err.message || "Unknown error";

            setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    role: 'assistant',
                    content: `${friendlyMsg}\n\n---\n*Technical details: ${rawError}*`,
                    isLoading: false,
                    isError: true
                };
                return updated;
            });
        } finally {
            setLoading(false);
            setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                    updated[lastIdx] = {
                        ...updated[lastIdx],
                        isLoading: false
                    };
                }
                return updated;
            });
        }
    };

    const toggleSource = (source) => {
        setSelectedSources(prev =>
            prev.includes(source)
                ? prev.filter(s => s !== source)
                : [...prev, source]
        );
    };

    const getTimeGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    const sourceLabels = {
        'gsc': 'Google Search Console',
        'ga4': 'Google Analytics 4',
        'google-ads': 'Google Ads',
        'facebook-ads': 'Facebook Ads'
    };

    return (
        <DashboardLayout noScroll>
            <div className="flex-1 flex flex-col min-h-0 h-full w-full overflow-hidden bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700/60 rounded-2xl shadow-sm relative">

                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-24 bg-brand-500/10 blur-[60px] pointer-events-none z-0" />

                {/* 2. MOBILE HEADER — shrink-0 */}
                <div className="lg:hidden shrink-0 flex items-center justify-between px-4 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-dark-card w-full z-[60]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center shadow-md shadow-brand-500/30">
                            <SparklesIcon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-black text-neutral-900 dark:text-white">RankPilot AI</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button type="button" title="Weekly Insight"
                            onClick={() => { setIsInsightOpen(!isInsightOpen); setIsHistoryOpen(false); if (!isInsightOpen && !weeklyInsight) loadWeeklyInsight(); }}
                            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${isInsightOpen ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'text-neutral-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20'}`}>
                            <InboxStackIcon className={`w-4 h-4 ${insightLoading ? 'animate-pulse' : ''}`} />
                        </button>
                        <button type="button" title="Chat History"
                            onClick={() => { setIsHistoryOpen(!isHistoryOpen); setIsInsightOpen(false); }}
                            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${isHistoryOpen ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'text-neutral-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20'}`}>
                            <ChatBubbleLeftRightIcon className="w-4 h-4" />
                        </button>
                        <button type="button" title="New Chat"
                            onClick={() => { handleNewChat(); setIsHistoryOpen(false); setIsInsightOpen(false); }}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 transition-all active:scale-95">
                            <PlusIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* 3. HISTORY DRAWER — absolute overlay */}
                {isHistoryOpen && (
                    <div className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-white dark:bg-dark-card animate-in slide-in-from-left duration-300">
                        {/* Header */}
                        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                                    <ChatBubbleLeftRightIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-neutral-900 dark:text-white">Chat History</h2>
                                    <p className="text-[10px] text-neutral-400 font-medium">{conversations.length} conversations</p>
                                </div>
                            </div>
                            <button onClick={() => setIsHistoryOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-all">
                                <PlusIcon className="w-4 h-4 rotate-45" />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-3">
                            {conversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                    <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                                        <ChatBubbleLeftRightIcon className="w-7 h-7 text-neutral-300 dark:text-neutral-600" />
                                    </div>
                                    <p className="text-sm font-black text-neutral-500 dark:text-neutral-400">No chats yet</p>
                                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 font-medium">Start a new conversation</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {conversations.map(conv => (
                                        <div key={conv._id}
                                            onClick={() => { loadConversationDetails(conv._id); setIsHistoryOpen(false); }}
                                            className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activeConversationId === conv._id
                                                ? 'bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800'
                                                : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border border-transparent'
                                                }`}>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${activeConversationId === conv._id
                                                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                                                    }`}>
                                                    <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">{conv.title || 'New Chat'}</p>
                                                    {conv.updatedAt && (
                                                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                                                            {new Date(conv.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <button onClick={e => handleDeleteConversation(conv._id, e)}
                                                className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 text-neutral-400 transition-all flex-shrink-0 ml-2">
                                                <TrashIcon className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="shrink-0 p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20">
                            <button onClick={() => { handleNewChat(); setIsHistoryOpen(false); }}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-xs font-black transition-all hover:opacity-90 active:scale-95 shadow-lg">
                                <PlusIcon className="w-4 h-4" />
                                Start New Conversation
                            </button>
                        </div>
                    </div>
                )}

                {/* 4. INSIGHT DRAWER — absolute overlay */}
                {isInsightOpen && (
                    <div className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-white dark:bg-dark-card animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                                    <InboxStackIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-neutral-900 dark:text-white">Weekly Insight</h2>
                                    <p className="text-[10px] text-neutral-400 font-medium">AI-powered performance report</p>
                                </div>
                            </div>
                            <button onClick={() => setIsInsightOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-all">
                                <PlusIcon className="w-4 h-4 rotate-45" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-5">
                            {insightLoading ? (
                                <div className="flex flex-col items-center justify-center h-full gap-5">
                                    <div className="relative">
                                        <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                                            <SparklesIcon className="w-7 h-7 text-brand-600 dark:text-brand-400" />
                                        </div>
                                        <div className="absolute -inset-1 rounded-2xl border-2 border-brand-500/30 animate-ping" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-black text-neutral-700 dark:text-neutral-300 mb-1">Analyzing your data...</p>
                                        <p className="text-xs text-neutral-400 font-medium animate-pulse">Running advanced analytics across all sources</p>
                                    </div>
                                </div>
                            ) : weeklyInsight ? (
                                <div className="max-w-2xl mx-auto">
                                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Weekly Report</span>
                                        <span className="text-neutral-300 dark:text-neutral-700">·</span>
                                        <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400">AI Generated</span>
                                    </div>
                                    <div className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 blur-[120px] pointer-events-none group-hover:bg-brand-500/10 transition-all duration-1000" />
                                        <div className="prose prose-md dark:prose-invert max-w-none prose-headings:tracking-tighter prose-p:text-neutral-700 dark:prose-p:text-neutral-300">
                                            <ReactMarkdown 
                                                remarkPlugins={[remarkGfm]}
                                                components={MarkdownComponents}
                                            >
                                                {weeklyInsight}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                    <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                                        <InboxStackIcon className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                                    </div>
                                    <p className="text-sm font-black text-neutral-600 dark:text-neutral-400 mb-2">No insights yet</p>
                                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-6 max-w-xs leading-relaxed">Generate your first weekly performance report powered by AI analysis of all your connected platforms.</p>
                                    <button onClick={handleRefreshInsight}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-xs font-black rounded-xl hover:bg-brand-700 transition-all shadow-md shadow-brand-500/25 active:scale-95">
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        Generate Report
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="shrink-0 p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20">
                            <button onClick={handleRefreshInsight} disabled={insightLoading}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-xs font-black transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 shadow-lg">
                                <ArrowPathIcon className={`w-4 h-4 ${insightLoading ? 'animate-spin' : ''}`} />
                                {insightLoading ? 'Generating...' : 'Refresh Weekly Summary'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex-1 min-h-0 flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {messages.length === 0 ? (
                        /* 5. EMPTY STATE — centered, compact */
                        <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 py-10 sm:p-10">
                            {/* AI Icon with glow */}
                            <div className="relative mb-5 shrink-0">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-brand-600 flex items-center justify-center shadow-2xl shadow-brand-500/40 relative z-10 transition-transform hover:scale-105 duration-300">
                                    <SparklesIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                                </div>
                                <div className="absolute -inset-2 rounded-2xl bg-brand-400/15 animate-pulse blur-xl" />
                            </div>

                            {/* Greeting */}
                            <h1 className="text-xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-2 text-center shrink-0">
                                {getTimeGreeting()}, {user?.name?.split(' ')[0] || 'Explorer'}
                            </h1>
                            <p className="text-[13px] sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium mb-6 sm:mb-8 text-center max-w-xs sm:max-w-sm leading-relaxed shrink-0">
                                Ask anything about your marketing data. I have access to all your connected platforms.
                            </p>

                            {/* Suggestions — moved here from footer */}
                            <div className="w-full max-w-2xl mx-auto">
                                {/* Loading skeleton */}
                                {suggestionsLoading && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="h-[72px] bg-neutral-100 dark:bg-neutral-800 rounded-2xl animate-pulse" />
                                        ))}
                                    </div>
                                )}

                                {/* Suggestion cards */}
                                {!suggestionsLoading && suggestions.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
                                        {suggestions.slice(0, 4).map((q, i) => (
                                            <button key={i} onClick={() => setQuery(q)}
                                                className="px-4 py-3.5 sm:px-5 sm:py-4 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-brand-50 dark:hover:bg-brand-900/20 border border-neutral-200 dark:border-neutral-700 hover:border-brand-300 dark:hover:border-brand-700 rounded-2xl text-[11px] sm:text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 transition-all text-left leading-relaxed active:scale-[0.98] shadow-sm">
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Quick action pills */}
                                <div className="flex flex-wrap justify-center gap-2 mb-8">
                                    {[
                                        { label: 'Search Console', icon: GlobeAltIcon, prompt: 'Analyze my Google Search Console performance and identify top-ranking keywords.' },
                                        { label: 'GA4 Analytics', icon: ChartBarIcon, prompt: 'Deep dive into my GA4 data to understand user behavior and conversions.' },
                                        { label: 'Google Ads', icon: CursorArrowRaysIcon, prompt: 'Evaluate my Google Ads campaign efficiency including CTR, CPC, and ROAS.' },
                                        { label: 'Facebook Ads', icon: ArrowTrendingUpIcon, prompt: 'Review my Meta Ads reach and engagement metrics.' },
                                    ].map((item, i) => (
                                        <button key={i} onClick={() => setQuery(item.prompt)}
                                            className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-[10px] sm:text-[11px] font-bold text-neutral-500 dark:text-neutral-400 hover:border-brand-400 dark:hover:border-brand-600 hover:text-brand-600 dark:hover:text-brand-400 transition-all active:scale-95 group shadow-sm">
                                            <item.icon className="w-3.5 h-3.5 group-hover:text-brand-500 transition-colors" strokeWidth={2.5} />
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                        </div>
                    ) : (
                        /* 6. MESSAGES AREA — hidden scrollbar */
                        <div className="px-3 sm:px-5 md:px-8 py-5 sm:py-8">
                            <div className="max-w-3xl mx-auto w-full space-y-6 pb-4">
                                {messages.map((msg, idx) => (
                                    <ChatMessage key={idx} msg={msg} userName={user?.name} />
                                ))}
                                <div ref={messagesEndRef} className="h-4" />
                            </div>
                        </div>
                    )}
                </div>

                {/* 7. BOTTOM INPUT BAR — shrink-0, always at bottom */}
                <div className="shrink-0 border-t border-neutral-100 dark:border-neutral-800 px-3 sm:px-4 py-4 bg-white dark:bg-dark-card w-full">


                    {/* Input form */}
                    <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
                        <div className="flex items-end gap-2 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-2.5 sm:px-3 py-2 sm:py-2.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/10 transition-all shadow-sm">
                            {/* Left action buttons */}
                            <div className="flex items-center gap-0.5 flex-shrink-0 pb-0.5">
                                <button type="button" onClick={handleNewChat} title="New Chat"
                                    className="hidden sm:flex w-8 h-8 items-center justify-center rounded-xl text-neutral-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all">
                                    <PlusIcon className="w-4 h-4" />
                                </button>
                                <button type="button" title="Weekly Insight"
                                    onClick={() => { setIsInsightOpen(!isInsightOpen); if (!isInsightOpen) { setIsHistoryOpen(false); if (!weeklyInsight) loadWeeklyInsight(); } }}
                                    className={`hidden sm:flex w-8 h-8 items-center justify-center rounded-xl transition-all ${isInsightOpen ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'text-neutral-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20'}`}>
                                    <InboxStackIcon className={`w-4 h-4 ${insightLoading ? 'animate-pulse' : ''}`} />
                                </button>
                                <button type="button" title="Chat History"
                                    onClick={() => { setIsHistoryOpen(!isHistoryOpen); if (!isHistoryOpen) setIsInsightOpen(false); }}
                                    className={`hidden sm:flex w-8 h-8 items-center justify-center rounded-xl transition-all ${isHistoryOpen ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'text-neutral-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20'}`}>
                                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 flex-shrink-0 mb-2" />

                            {/* Text input */}
                            <textarea
                                ref={textareaRef}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                placeholder="Message RankPilot AI..."
                                disabled={loading}
                                rows={1}
                                className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 py-1.5 sm:py-2 min-w-0 resize-none max-h-40 leading-relaxed [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                            />

                            {/* Right: Send */}
                            <div className="flex items-end gap-1.5 flex-shrink-0 pb-0.5">
                                {/* Send button */}
                                <button type="submit" disabled={!query.trim() || loading}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:bg-neutral-200 dark:disabled:bg-neutral-700 disabled:text-neutral-400 transition-all shadow-md shadow-brand-500/20 active:scale-95">
                                    {loading
                                        ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                        : <PaperAirplaneIcon className="w-4 h-4" />
                                    }
                                </button>
                            </div>
                        </div>

                        <p className="text-center text-[10px] text-neutral-400 dark:text-neutral-500 mt-2 font-medium">
                            RankPilot AI can make mistakes. Always verify critical metrics before making decisions.
                        </p>
                    </form>
                </div>

                {/* 8. DELETE MODAL — absolute overlay */}
                {chatToDelete && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm" onClick={() => setChatToDelete(null)} />
                        <div className="relative w-full max-w-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
                            <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                                <TrashIcon className="w-5 h-5 text-red-500" />
                            </div>
                            <h3 className="text-base font-black text-neutral-900 dark:text-white mb-1.5">Delete this chat?</h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5 leading-relaxed">
                                This conversation will be permanently deleted and cannot be recovered.
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setChatToDelete(null)}
                                    className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-black text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all active:scale-95">
                                    Cancel
                                </button>
                                <button onClick={confirmDelete}
                                    className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black transition-all shadow-md shadow-red-500/20 active:scale-95">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AIChatPage;
