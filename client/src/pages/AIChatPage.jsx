import React, { useState, useEffect, useRef } from 'react';
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
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import {
    askAi,
    getConversations,
    getConversation,
    deleteConversation,
    getWeeklyInsight,
    refreshWeeklyInsight,
    getSuggestedQuestions
} from '../api/aiApi';
import ReactMarkdown from 'react-markdown';

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

    const messagesEndRef = useRef(null);
    const sourceMenuRef = useRef(null);

    useEffect(() => {
        if (connectedSources.length > 0 && selectedSources.length === 0) {
            setSelectedSources(connectedSources);
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

    const handleDeleteConversation = async (id, e) => {
        e.stopPropagation();
        try {
            await deleteConversation(id);
            if (activeConversationId === id) {
                handleNewChat();
            }
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
                "How are my campaigns performing overall?",
                "What is my return on ad spend (ROAS)?"
            ]);
        } finally {
            setSuggestionsLoading(false);
        }
    };

    const handleUseSuggestion = (q) => {
        setQuery(q);
    }

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!query.trim() || loading) return;

        const currentQuery = query.trim();
        setQuery('');

        const newMessages = [...messages, { role: 'user', content: currentQuery }];
        setMessages(newMessages);
        setLoading(true);

        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);

        try {
            const res = await askAi({
                question: currentQuery,
                activeSources: selectedSources,
                conversationId: activeConversationId,
                siteId: activeSiteId
            });

            if (!activeConversationId && res.data.conversationId) {
                setActiveConversationId(res.data.conversationId);
                loadConversations();
            }

            setMessages([...newMessages, { role: 'assistant', content: res.data.answer }]);
        } catch (err) {
            console.error("AI Error:", err);
            setMessages([...newMessages, {
                role: 'assistant',
                content: "I'm sorry, I encountered an error while analyzing your data. Please check your source connections and try again."
            }]);
        } finally {
            setLoading(false);
        }
    };

    const toggleSource = (source) => {
        setSelectedSources(prev => 
            prev.includes(source) 
                ? prev.filter(s => s !== source)
                : [...prev, source]
        );
    };

    const sourceLabels = {
        'gsc': 'Google Search Console',
        'ga4': 'Google Analytics 4',
        'google_ads': 'Google Ads',
        'meta': 'Meta Ads'
    };

    return (
        <DashboardLayout>
            <div className="flex h-[calc(100vh-160px)] w-full max-w-7xl mx-auto overflow-hidden bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm relative z-10">
                {/* Left Sidebar Layout */}
                <div className="hidden lg:flex flex-col w-[320px] shrink-0 border-r border-neutral-200/60 dark:border-neutral-800 bg-white/50 dark:bg-dark-card/50 backdrop-blur-xl p-4 space-y-4 shadow-sm custom-scrollbar overflow-y-auto">

                    {/* Header inline in sidebar for cleaner look */}
                    <div className="flex items-center space-x-3 px-2 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-md">
                            <SparklesIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-neutral-900 dark:text-white leading-tight">AI Analyst</h2>
                            <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">Beta Intelligence</p>
                        </div>
                    </div>

                    {/* New Chat Button */}
                    <button
                        onClick={handleNewChat}
                        className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Start New Analysis
                    </button>

                    {/* Weekly Insight Widget */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/80 dark:border-neutral-700 rounded-xl shadow-sm overflow-hidden flex flex-col mt-4">
                        <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-dark-surface/50">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
                                <ChartBarIcon className="w-4 h-4 text-brand-500" />
                                Quick Insight
                            </h3>
                            <button
                                onClick={handleRefreshInsight}
                                disabled={insightLoading}
                                className="text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors disabled:opacity-50"
                                title="Refresh Insight"
                            >
                                <ArrowPathIcon className={`w-4 h-4 ${insightLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        <div className="p-4 flex-1">
                            {insightLoading && !weeklyInsight ? (
                                <div className="space-y-2.5">
                                    <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse w-full"></div>
                                    <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse w-5/6"></div>
                                    <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse w-4/6"></div>
                                </div>
                            ) : weeklyInsight ? (
                                <div className="text-sm font-medium text-neutral-600 dark:text-neutral-300 leading-relaxed max-h-[150px] overflow-y-auto custom-scrollbar pr-2 line-clamp-6">
                                    {weeklyInsight}
                                </div>
                            ) : (
                                <p className="text-sm text-neutral-400 text-center py-2 font-medium">Click refresh to analyze data.</p>
                            )}
                        </div>
                    </div>

                    {/* Recent Chats */}
                    <div className="flex-1 flex flex-col min-h-0 mt-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-500 mb-3 px-2 flex items-center gap-2">
                            <ChatBubbleLeftRightIcon className="w-4 h-4" />
                            Recent Chats
                        </h3>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                            {conversations.length === 0 && !loading && (
                                <p className="text-xs text-neutral-400 px-2 italic">No recent chats.</p>
                            )}
                            {conversations.map(conv => (
                                <div
                                    key={conv._id}
                                    onClick={() => loadConversationDetails(conv._id)}
                                    className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${activeConversationId === conv._id
                                            ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white font-semibold'
                                            : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 font-medium'
                                        }`}
                                >
                                    <span className="text-sm truncate pr-2 flex-1">{conv.title || "Marketing Analysis"}</span>
                                    <button
                                        onClick={(e) => handleDeleteConversation(conv._id, e)}
                                        className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-md transition-colors ${activeConversationId === conv._id
                                                ? 'text-neutral-500 hover:text-red-500 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                                                : 'text-neutral-400 hover:text-red-500 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                            }`}
                                        title="Delete chat"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col h-full bg-white dark:bg-dark-card border-l border-neutral-200/60 dark:border-neutral-800 relative shadow-sm">

                    {/* Mobile Header (Hidden on LG) */}
                    <div className="lg:hidden p-4 border-b border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-white dark:bg-dark-card relative z-20 shadow-sm">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center">
                                <SparklesIcon className="w-4 h-4 text-white" />
                            </div>
                            <h2 className="text-md font-bold text-neutral-900 dark:text-white">AI Analyst</h2>
                        </div>
                        <button onClick={handleNewChat} className="p-2 text-brand-600 bg-brand-50 rounded-lg">
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages Scroll Area */}
                    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 relative z-10 custom-scrollbar scroll-smooth">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center max-w-2xl mx-auto pt-8 md:pt-16 pb-8">
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-tr from-brand-100 to-indigo-100 dark:from-brand-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-6 shadow-inner ring-1 ring-black/5 dark:ring-white/10">
                                    <SparklesIcon className="w-8 h-8 md:w-10 md:h-10 text-brand-600 dark:text-brand-400" />
                                </div>
                                <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-3 text-center tracking-tight">How can I assist you?</h2>
                                <p className="text-sm md:text-base text-neutral-500 dark:text-neutral-400 mb-10 text-center max-w-lg">
                                    Get insights into your performance, optimize your campaigns, or ask about specific metrics across your connected platforms.
                                </p>

                                <div className="w-full space-y-3">
                                    <p className="text-sm font-semibold text-neutral-400 uppercase tracking-wider px-1">Suggested prompts</p>
                                    {suggestionsLoading ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className="h-14 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"></div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {suggestions.map((q, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleUseSuggestion(q)}
                                                    className="text-left p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-dark-card hover:bg-brand-50 hover:border-brand-300 dark:hover:bg-dark-surface dark:hover:border-brand-700 text-neutral-700 dark:text-neutral-300 transition-all font-medium text-sm shadow-sm hover:shadow truncate flex items-center justify-between group"
                                                >
                                                    <span className="truncate pr-4">{q}</span>
                                                    <ArrowPathIcon className="w-4 h-4 text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity rotate-90" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 md:space-y-8 max-w-4xl mx-auto pb-4">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                                        <div className={`flex max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-3`}>
                                            <div className="shrink-0 mb-1 hidden sm:block">
                                                {msg.role === 'user' ? (
                                                    <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'U'}&background=111827&color=fff`} alt="User" className="w-8 h-8 rounded-full border border-neutral-200 dark:border-neutral-700 object-cover bg-white" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center border border-transparent shadow-sm">
                                                        <SparklesIcon className="w-4 h-4 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`px-5 py-4 rounded-2xl shadow-sm text-[14.5px] whitespace-pre-wrap leading-relaxed border ${msg.role === 'user'
                                                ? 'bg-neutral-900 border-neutral-900 text-white rounded-br-sm dark:bg-white dark:border-white dark:text-neutral-900 font-medium'
                                                : 'bg-white border-neutral-200 text-neutral-800 dark:bg-dark-card dark:border-neutral-700 dark:text-neutral-200 rounded-bl-sm prose prose-sm dark:prose-invert max-w-none'
                                                }`}>
                                                {msg.role === 'assistant' ? (
                                                    // Optional: If you want to use markdown rendering for bold text and lists returned by AI
                                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                ) : (
                                                    msg.content
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {loading && (
                                    <div className="flex justify-start">
                                        <div className="flex items-end gap-3 max-w-[80%]">
                                            <div className="w-8 h-8 mb-1 rounded-full bg-brand-600 flex items-center justify-center shadow-sm shrink-0 hidden sm:flex">
                                                <SparklesIcon className="w-4 h-4 text-white" />
                                            </div>
                                            <div className="px-5 h-[42px] rounded-2xl rounded-bl-sm bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 shadow-sm flex items-center justify-center space-x-2">
                                                <div className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                <div className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                <div className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} className="h-1" />
                            </div>
                        )}
                    </div>

                    {/* Fixed Input Area at Bottom */}
                    <div className="p-4 md:p-6 bg-white dark:bg-dark-card border-t border-neutral-100 dark:border-neutral-800 shrink-0 relative z-20">
                        <div className="max-w-4xl mx-auto mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 whitespace-nowrap">Using Data From:</span>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                    {selectedSources.length === 0 ? (
                                        <span className="text-neutral-400 italic font-medium">No sources selected</span>
                                    ) : (
                                        selectedSources.map(s => (
                                            <div key={s} className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-colors ${
                                                s === 'gsc' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400' :
                                                s === 'ga4' ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-100 dark:border-orange-800 text-orange-600 dark:text-orange-400' :
                                                s === 'google_ads' ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-100 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400' :
                                                'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                                            }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                                                    s === 'gsc' ? 'bg-blue-500' : s === 'ga4' ? 'bg-orange-500' : s === 'google_ads' ? 'bg-yellow-500' : 'bg-indigo-500'
                                                }`}></div>
                                                {s === 'google_ads' ? 'Ads' : s.toUpperCase()}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            
                            {/* Source Selection Dropdown */}
                            <div className="relative" ref={sourceMenuRef}>
                                <button 
                                    onClick={() => setIsSourceMenuOpen(!isSourceMenuOpen)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors border border-neutral-200 dark:border-neutral-700"
                                >
                                    <ChartBarIcon className="w-3.5 h-3.5" />
                                    Filter Sources
                                </button>
                                
                                {isSourceMenuOpen && (
                                    <div className="absolute right-0 bottom-full mb-2 w-56 bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl z-50 p-2 overflow-hidden animate-fade-in-up">
                                        <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800 mb-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Select Sources</p>
                                        </div>
                                        {connectedSources.length === 0 ? (
                                            <p className="px-3 py-4 text-xs text-neutral-500 italic text-center">No platforms connected. Please go to Integrations.</p>
                                        ) : (
                                            <div className="space-y-0.5">
                                                {connectedSources.map(source => (
                                                    <button
                                                        key={source}
                                                        onClick={() => toggleSource(source)}
                                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                                                            selectedSources.includes(source)
                                                                ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                                                                : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                                                        }`}
                                                    >
                                                        {sourceLabels[source] || source}
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                                            selectedSources.includes(source)
                                                                ? 'bg-brand-500 border-brand-500 text-white'
                                                                : 'border-neutral-300 dark:border-neutral-600'
                                                        }`}>
                                                            {selectedSources.includes(source) && <PlusIcon className="w-3 h-3 rotate-45" strokeWidth={4} />}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <form onSubmit={handleSendMessage} className="relative flex items-center w-full max-w-4xl mx-auto">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Message AI Analyst..."
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 py-4 pl-6 pr-16 text-[15px] font-medium text-neutral-900 dark:text-white outline-none placeholder:text-neutral-500 rounded-2xl focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all shadow-inner"
                                disabled={loading}
                            />
                            <button
                                type="submit"
                                disabled={!query.trim() || loading}
                                className="absolute right-2 p-2.5 bg-brand-600 hover:bg-brand-700 rounded-xl text-white disabled:opacity-50 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 transition-colors shadow-sm flex items-center justify-center group"
                            >
                                <PaperAirplaneIcon className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" strokeWidth={2} />
                            </button>
                        </form>
                        <p className="text-center text-[11px] text-neutral-400 dark:text-neutral-500 mt-3 font-medium hidden sm:block">
                            AI Analyst can make mistakes. Always verify critical metrics before making business decisions.
                        </p>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
};

export default AIChatPage;
