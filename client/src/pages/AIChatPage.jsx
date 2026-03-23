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
        if (!inline && match) {
            try {
                const chartData = JSON.parse(String(children).replace(/\n$/, ''));
                return (
                    <div className="my-10 w-full overflow-hidden animate-fade-in">
                        <ChartRenderer type={match[1]} data={chartData} />
                    </div>
                );
            } catch {
                return (
                    <div className="my-4 p-4 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center justify-center bg-neutral-50/50 dark:bg-neutral-900/50">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                            <span className="text-xs font-medium text-neutral-500 italic uppercase tracking-widest">Generating {match[1]} visualization...</span>
                        </div>
                    </div>
                );
            }
        }
        return <code className={className} {...props}>{children}</code>;
    },
    ul: ({ children }) => <ul className="!list-none !p-0 !m-0 !pl-0 space-y-2 mb-4">{children}</ul>,
    ol: ({ children }) => <ol className="!list-decimal !p-0 !m-0 !pl-5 mb-4 space-y-2 marker:text-brand-600 dark:marker:text-brand-400 marker:font-bold">{children}</ol>,
    li: ({ children, ordered }) => {
        if (ordered) {
            return (
                <li className="list-item text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-100/90 mb-2 !ml-0">
                    {children}
                </li>
            );
        }
        return (
            <li className="!list-none !p-0 !m-0 relative !pl-0 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-100/90 group mb-2">
                <span className="absolute -left-5 top-[10px] h-1.5 w-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
                <div className="!m-0 !p-0 inline-block w-full">{children}</div>
            </li>
        );
    },
    p: ({ children }) => <p className="!m-0 !p-0 leading-relaxed text-neutral-800 dark:text-neutral-200">{children}</p>,
    h1: ({ children }) => <h1 className="text-xl font-black !m-0 !mb-4 tracking-tight text-neutral-900 dark:text-white">{children}</h1>,
    h2: ({ children }) => <h2 className="text-lg font-extrabold !m-0 !mb-3 tracking-tight text-neutral-800 dark:text-neutral-100">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-bold !m-0 !mb-2 text-neutral-800 dark:text-neutral-100">{children}</h3>,
    strong: ({ children }) => <strong className="font-bold text-neutral-900 dark:text-white">{children}</strong>
};

const ChatMessage = React.memo(({ msg, userName }) => {
    const isUser = msg.role === 'user';
    
    if (isUser) {
        return (
            <div className="flex justify-end">
                <div className="flex items-end gap-2.5 flex-row-reverse max-w-[75%]">
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
            <div className="flex items-start gap-3 max-w-[85%]">
                <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                    <SparklesIcon className="w-3.5 h-3.5 text-white"/>
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
                                    {msg.content
                                        .replace(/^[•*]\s*$/gm, '')
                                        .replace(/•\s*/g, '- ')
                                        .replace(/^\s*[•*]\s*/gm, '- ')
                                        .replace(/- \s*\n/g, '- ')
                                        .replace(/(\n\d+\.)\s*[•*]\s*/g, '$1 ')
                                        .replace(/([.!?])\s+(- \s*)/g, '$1\n$2')
                                        .replace(/\n{3,}/g, '\n\n')
                                    }
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

    const [selectedSources, setSelectedSources] = useState([]);
    const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false);

    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isInsightOpen, setIsInsightOpen] = useState(false);
    const [chatToDelete, setChatToDelete] = useState(null);
    const messagesEndRef = useRef(null);
    const sourceMenuRef = useRef(null);

    useEffect(() => {
        if (connectedSources.length > 0 && selectedSources.length === 0) {
            const initial = connectedSources.flatMap(s => {
                if (s === 'google-ads' || s === 'google_ads') return ['google-ads'];
                if (s === 'facebook-ads' || s === 'facebook' || s === 'meta') return ['facebook-ads'];
                if (['ga4', 'gsc'].includes(s)) return [s];
                return [];
            });
            setSelectedSources([...new Set(initial)]);
        }
    }, [connectedSources]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sourceMenuRef.current && !sourceMenuRef.current.contains(event.target)) {
                setIsSourceMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                    activeSources: selectedSources,
                    conversationId: activeConversationId,
                    siteId: activeSiteId
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
                            if (data.error) throw new Error(data.error);
                        } catch {
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
        <DashboardLayout>
            <div className="pt-10 pb-2 flex-1 flex flex-col min-h-0 h-full w-full overflow-hidden bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700/60 rounded-2xl shadow-sm relative">
                    
                    {/* Mobile Header */}
                    <div className="lg:hidden shrink-0 p-4 border-b border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-dark-card relative z-20 shadow-sm">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center">
                                <SparklesIcon className="w-4 h-4 text-white" />
                            </div>
                            <h2 className="text-md font-bold text-neutral-900 dark:text-white">RankPilot AI</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsHistoryOpen(true)} className="p-2 text-neutral-600 dark:text-neutral-400">
                                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                            </button>
                            <button onClick={handleNewChat} className="p-2 text-brand-600 bg-brand-50 rounded-lg">
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* HISTORY DRAWER */}
                    {isHistoryOpen && (
                        <div className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-white dark:bg-dark-card">
                            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                                        <ChatBubbleLeftRightIcon className="w-4 h-4 text-brand-600 dark:text-brand-400"/>
                                    </div>
                                    <h2 className="text-sm font-black text-neutral-900 dark:text-white">Chat History</h2>
                                </div>
                                <button onClick={() => setIsHistoryOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-all">
                                    <PlusIcon className="w-4 h-4 rotate-45"/>
                                </button>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-4">
                                {conversations.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-neutral-400 py-12">
                                        <ChatBubbleLeftRightIcon className="w-10 h-10 mb-3 opacity-30"/>
                                        <p className="text-sm font-semibold">No chats yet</p>
                                        <p className="text-xs mt-1 opacity-70">Start a new conversation below</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        {conversations.map(conv => (
                                            <div key={conv._id}
                                                onClick={() => { loadConversationDetails(conv._id); setIsHistoryOpen(false); }}
                                                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${activeConversationId === conv._id ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800' : 'border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:border-neutral-200 dark:hover:border-neutral-700'}`}>
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${activeConversationId === conv._id ? 'bg-brand-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'}`}>
                                                        <ChatBubbleLeftRightIcon className="w-3.5 h-3.5"/>
                                                    </div>
                                                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 truncate">{conv.title || 'New Chat'}</span>
                                                </div>
                                                <button onClick={e => handleDeleteConversation(conv._id, e)}
                                                    className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 text-neutral-400 transition-all flex-shrink-0">
                                                    <TrashIcon className="w-3.5 h-3.5"/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="shrink-0 p-4 border-t border-neutral-100 dark:border-neutral-800">
                                <button onClick={() => { handleNewChat(); setIsHistoryOpen(false); }}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-xs font-black transition-all hover:opacity-90 active:scale-95 shadow-lg">
                                    <PlusIcon className="w-4 h-4"/>
                                    New Conversation
                                </button>
                            </div>
                        </div>
                    )}

                    {/* INSIGHT DRAWER */}
                    {isInsightOpen && (
                        <div className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-white dark:bg-dark-card">
                            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                                        <InboxStackIcon className="w-4 h-4 text-brand-600 dark:text-brand-400"/>
                                    </div>
                                    <h2 className="text-sm font-black text-neutral-900 dark:text-white">Weekly Performance Insight</h2>
                                </div>
                                <button onClick={() => setIsInsightOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-all">
                                    <PlusIcon className="w-4 h-4 rotate-45"/>
                                </button>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-5">
                                {insightLoading ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-4">
                                        <div className="w-10 h-10 border-4 border-brand-200 dark:border-brand-800 border-t-brand-600 rounded-full animate-spin"/>
                                        <p className="text-sm font-bold text-neutral-400 animate-pulse">Running analytics...</p>
                                    </div>
                                ) : weeklyInsight ? (
                                    <div className="bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 max-w-2xl mx-auto">
                                        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-black prose-p:leading-relaxed prose-strong:text-brand-600 dark:prose-strong:text-brand-400">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{weeklyInsight}</ReactMarkdown>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                        <InboxStackIcon className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mb-3"/>
                                        <p className="text-sm font-bold text-neutral-500 mb-4">No insights available yet</p>
                                        <button onClick={handleRefreshInsight}
                                            className="px-5 py-2.5 bg-brand-600 text-white text-xs font-black rounded-xl hover:bg-brand-700 transition-all shadow-md shadow-brand-500/25 active:scale-95">
                                            Generate Report
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="shrink-0 p-4 border-t border-neutral-100 dark:border-neutral-800">
                                <button onClick={handleRefreshInsight} disabled={insightLoading}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-xs font-black transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 shadow-lg">
                                    <ArrowPathIcon className={`w-4 h-4 ${insightLoading ? 'animate-spin' : ''}`}/>
                                    Refresh Weekly Summary
                                </button>
                            </div>
                        </div>
                    )}

                    {/* MESSAGES OR EMPTY STATE */}
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                        {messages.length === 0 ? (
                            /* REBUILD EMPTY STATE — Centered greeting section */
                            <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6 overflow-hidden">
                                
                                {/* AI Icon */}
                                <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center mb-6 shadow-xl shadow-brand-500/30">
                                    <SparklesIcon className="w-8 h-8 text-white"/>
                                </div>

                                {/* Greeting */}
                                <h1 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-2 text-center">
                                    {getTimeGreeting()}, {user?.name?.split(' ')[0] || 'Explorer'}
                                </h1>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium mb-6 text-center max-w-sm">
                                    Ask anything about your marketing data. I have access to all your connected platforms.
                                </p>

                                {/* Connected source pills */}
                                <div className="pt-5 pb-5 flex flex-wrap items-center justify-center gap-2">
                                    {selectedSources.map(s => (
                                        <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 text-xs font-black text-brand-700 dark:text-brand-400">
                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"/>
                                            {sourceLabels[s] || s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* REBUILD MESSAGES AREA */
                            <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-4 md:px-10 py-6">
                                <div className="max-w-3xl mx-auto w-full space-y-6 pb-4">
                                    {messages.map((msg, idx) => (
                                        <ChatMessage key={idx} msg={msg} userName={user?.name}/>
                                    ))}
                                    <div ref={messagesEndRef} className="h-4"/>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* REBUILD BOTTOM INPUT BAR */}
                    <div className="shrink-0 border-t border-neutral-100 dark:border-neutral-800 px-4 pt-4 pb-2 bg-white dark:bg-dark-card">
                            
                            {/* Suggested questions & Quick actions — Grounded here only in empty state */}
                            {messages.length === 0 && (
                                <div className="max-w-3xl mx-auto mb-6 animate-fade-in-up">
                                    {/* Suggested questions — 2x2 grid */}
                                    {!suggestionsLoading && suggestions.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                                            {suggestions.slice(0, 4).map((q, i) => (
                                                <button key={i} onClick={() => setQuery(q)}
                                                    className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-brand-50 dark:hover:bg-brand-900/20 border border-neutral-200 dark:border-neutral-700 hover:border-brand-300 dark:hover:border-brand-700 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 transition-all text-left leading-relaxed active:scale-[0.98]">
                                                    {q}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Quick action pills */}
                                    <div className="pt-3 flex flex-wrap justify-center gap-2">
                                        {[
                                            { label:'Search Console', icon: GlobeAltIcon,        prompt:'Analyze my Google Search Console performance and identify top-ranking keywords.' },
                                            { label:'GA4 Analytics',  icon: ChartBarIcon,        prompt:'Deep dive into my GA4 data to understand user behavior and conversions.' },
                                            { label:'Google Ads',     icon: CursorArrowRaysIcon, prompt:'Evaluate my Google Ads campaign efficiency including CTR, CPC, and ROAS.' },
                                            { label:'Facebook Ads',   icon: ArrowTrendingUpIcon, prompt:'Review my Meta Ads reach and engagement metrics.' },
                                        ].map((item, i) => (
                                            <button key={i} onClick={() => setQuery(item.prompt)}
                                                className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:border-brand-400 dark:hover:border-brand-600 hover:text-brand-600 dark:hover:text-brand-400 transition-all active:scale-95 group shadow-sm">
                                                <item.icon className="w-3.5 h-3.5 group-hover:text-brand-500 transition-colors" strokeWidth={2.5}/>
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Active context strip */}
                            {selectedSources.length > 0 && (
                                <div className="pt-5 flex items-center gap-2 mb-2 px-1 max-w-3xl mx-auto">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Context:</span>
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {selectedSources.map(s => (
                                            <span key={s} className="text-[9px] font-black px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-800">
                                                {s === 'google-ads' ? 'G.Ads' : s === 'facebook-ads' ? 'Meta' : s.toUpperCase()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Input pill */}
                            <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
                                <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/10 transition-all">

                                    {/* Left buttons */}
                                    <div className="flex items-center gap-0.5 flex-shrink-0">
                                        <button type="button" onClick={handleNewChat} title="New Chat"
                                            className="w-8 h-8 flex items-center justify-center rounded-xl text-neutral-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all">
                                            <PlusIcon className="w-4 h-4"/>
                                        </button>
                                        <button type="button" title="Weekly Insight"
                                            onClick={() => { setIsInsightOpen(!isInsightOpen); if (!isInsightOpen) { setIsHistoryOpen(false); if (!weeklyInsight) loadWeeklyInsight(); }}}
                                            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${isInsightOpen ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'text-neutral-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20'}`}>
                                            <InboxStackIcon className={`w-4 h-4 ${insightLoading ? 'animate-pulse' : ''}`}/>
                                        </button>
                                        <button type="button" title="Chat History"
                                            onClick={() => { setIsHistoryOpen(!isHistoryOpen); if (!isHistoryOpen) setIsInsightOpen(false); }}
                                            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${isHistoryOpen ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'text-neutral-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20'}`}>
                                            <ChatBubbleLeftRightIcon className="w-4 h-4"/>
                                        </button>
                                    </div>

                                    {/* Divider */}
                                    <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 flex-shrink-0"/>

                                    {/* Text input */}
                                    <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                                        placeholder="Message RankPilot AI..."
                                        disabled={loading}
                                        className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 py-1.5 min-w-0"/>

                                    {/* Right: Sources + Send */}
                                    <div className="flex items-center gap-2 flex-shrink-0">

                                        {/* Sources selector */}
                                        <div className="relative" ref={sourceMenuRef}>
                                            <button type="button" onClick={() => setIsSourceMenuOpen(!isSourceMenuOpen)}
                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black border transition-all ${isSourceMenuOpen || selectedSources.length > 0 ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400' : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-600'}`}>
                                                <ChartBarIcon className="w-3 h-3"/>
                                                <span>{selectedSources.length > 0 ? selectedSources.length : 'Sources'}</span>
                                                <ChevronDownIcon className={`w-2.5 h-2.5 transition-transform ${isSourceMenuOpen ? 'rotate-180' : ''}`}/>
                                            </button>

                                            {isSourceMenuOpen && (
                                                <div className="absolute right-0 bottom-full mb-2 w-52 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-2xl z-50 p-2">
                                                    <p className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 mb-1">Context Sources</p>
                                                    {connectedSources.length === 0 ? (
                                                        <p className="px-3 py-4 text-xs text-neutral-400 italic text-center">No platforms connected</p>
                                                    ) : (
                                                        ['gsc','ga4','google-ads','facebook-ads']
                                                            .filter(id => connectedSources.includes(id) || (id==='google-ads' && connectedSources.includes('google_ads')) || (id==='facebook-ads' && (connectedSources.includes('meta') || connectedSources.includes('facebook'))))
                                                            .map(source => (
                                                                <button key={source} type="button" onClick={() => toggleSource(source)}
                                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${selectedSources.includes(source) ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}>
                                                                    {sourceLabels[source] || source}
                                                                    {selectedSources.includes(source) && <div className="w-1.5 h-1.5 rounded-full bg-brand-500"/>}
                                                                </button>
                                                            ))
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Divider */}
                                        <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700"/>

                                        {/* Send */}
                                        <button type="submit" disabled={!query.trim() || loading}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:bg-neutral-200 dark:disabled:bg-neutral-700 disabled:text-neutral-400 transition-all shadow-md shadow-brand-500/20 active:scale-95">
                                            <PaperAirplaneIcon className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>

                                <p className="text-center text-[10px] text-neutral-400 mt-2">
                                    RankPilot AI can make mistakes. Always verify critical metrics.
                                </p>
                            </form>
                    </div>

                    {/* REBUILD DELETE MODAL */}
                    {chatToDelete && (
                        <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm" onClick={() => setChatToDelete(null)}/>
                            <div className="relative w-full max-w-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl p-6">
                                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                                    <TrashIcon className="w-5 h-5 text-red-500"/>
                                </div>
                                <h3 className="text-base font-black text-neutral-900 dark:text-white mb-1.5">Delete chat?</h3>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5 leading-relaxed">This conversation will be permanently deleted and cannot be recovered.</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setChatToDelete(null)}
                                        className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-black text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">
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
