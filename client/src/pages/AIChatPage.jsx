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
    ArrowPathIcon,
    ChevronDownIcon,
    DocumentTextIcon,
    CursorArrowRaysIcon,
    InboxStackIcon,
    SpeakerWaveIcon,
    MagnifyingGlassIcon,
    ArrowTrendingUpIcon,
    LinkIcon,
    GlobeAltIcon
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
import remarkGfm from 'remark-gfm';
import ChartRenderer from '../components/ai/ChartRenderer';

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
            // Only select the normalized AI sources
            const initial = connectedSources.flatMap(s => {
                if (s === 'google-ads' || s === 'google_ads') return ['google-ads'];
                if (s === 'facebook-ads' || s === 'facebook' || s === 'meta') return ['facebook-ads'];
                if (['ga4', 'gsc'].includes(s)) return [s];
                return [];
            });
            // Ensure unique values
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
            toast.error(err.response?.data?.message || "Failed to refresh insights. Please try again later.");
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
                "Audit my GSC performance to find high-impression keywords with low CTR.",
                "Analyze my GA4 conversion funnel to identify where I'm losing potential customers.",
                "Evaluate my Google Ads budget efficiency and identify the highest ROI campaigns.",
                "Review my Meta Ads performance to compare ROAS across different audiences."
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
            const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
            const response = await fetch(`${apiBase}/ai/ask`, {
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
                        } catch (parseError) {
                            // Partial JSON skip
                        }
                    }
                }
            }
        } catch (err) {
            console.error("AI Error:", err);
            
            // Map technical error codes to user-friendly messages
            const getFriendlyError = (msg) => {
                if (msg.includes('API_KEY_INVALID')) return "Your AI access key is invalid. Please check your settings.";
                if (msg.includes('QuotaFailure') || msg.includes('limit') || msg.includes('429')) return "We've hit our AI usage limit. Please try again in 1-2 minutes.";
                if (msg.includes('Network') || msg.includes('fetch')) return "It seems you're offline or the connection is unstable. Please check your internet.";
                if (msg.includes('safety')) return "Sorry, I can't process that specific request due to safety policies.";
                return "Something went wrong while talking to the AI. Please try again shortly.";
            };

            const friendlyMsg = getFriendlyError(err.message || "");

            setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { 
                    role: 'assistant', 
                    content: `⚠️ **Update**: ${friendlyMsg}`,
                    isLoading: false,
                    isError: true
                };
                return updated;
            });
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
            <div className="flex h-[calc(100vh-145px)] w-full max-w-7xl mx-auto overflow-hidden bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm relative z-10">

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col h-full bg-white dark:bg-dark-card relative shadow-sm overflow-hidden">
                    {/* Content Wrapper - Blurred when Modal is active */}
                    <div className={`flex-1 flex flex-col min-h-0 transition-all duration-500 ${chatToDelete ? 'blur-[8px] opacity-90' : ''}`}>

                    {/* Mobile Header (Hidden on LG) */}
                    <div className="lg:hidden p-4 border-b border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-white dark:bg-dark-card relative z-20 shadow-sm">
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

                    {/* Desktop Rail Header Removed (Integrated in Sidebar) */}

                    {/* History Drawer Slider - Full Container */}
                    {isHistoryOpen && (
                        <div className="absolute inset-0 z-50 flex animate-fade-in">
                            <div className="relative w-full h-full bg-white dark:bg-[#111111] shadow-2xl flex flex-col">
                                <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
                                    <div className="px-8 py-6 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-lg text-brand-600">
                                                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                                            </div>
                                            <h2 className="text-xl font-extrabold text-neutral-800 dark:text-neutral-100 tracking-tight">Chat History</h2>
                                        </div>
                                        <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors group">
                                            <PlusIcon className="w-6 h-6 rotate-45 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-200" />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-8 space-y-2 custom-scrollbar">
                                        {conversations.length === 0 ? (
                                            <div className="text-center py-24">
                                                <p className="text-lg text-neutral-400 font-medium italic">No recent chats found</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-12">
                                                {conversations.map(conv => (
                                                    <div
                                                        key={conv._id}
                                                        onClick={() => {
                                                            loadConversationDetails(conv._id);
                                                            setIsHistoryOpen(false);
                                                        }}
                                                        className={`group flex items-center justify-between p-5 rounded-2xl cursor-pointer transition-all border ${activeConversationId === conv._id
                                                            ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white font-bold'
                                                            : 'bg-white dark:bg-neutral-900/40 border-neutral-100 dark:border-neutral-800/50 hover:border-brand-500/30 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-4 truncate pr-2">
                                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${activeConversationId === conv._id ? 'bg-brand-500 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'}`}>
                                                                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                                                            </div>
                                                            <span className="text-[17px] truncate font-semibold">{conv.title || "SEO Analysis"}</span>
                                                        </div>
                                                        <button
                                                            onClick={(e) => handleDeleteConversation(conv._id, e)}
                                                            className="opacity-0 group-hover:opacity-100 p-2.5 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all rounded-xl"
                                                        >
                                                            <TrashIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="p-8 border-t border-neutral-100 dark:border-neutral-800/80 shrink-0">
                                        <button
                                            onClick={() => { handleNewChat(); setIsHistoryOpen(false); }}
                                            className="w-full max-w-sm mx-auto flex items-center justify-center gap-2 py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-black text-[16px] shadow-xl active:scale-[0.98] transition-all hover:opacity-90"
                                        >
                                            <PlusIcon className="w-5 h-5" />
                                            <span>Start New Conversation</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Weekly Insight Drawer - Full Container */}
                    {isInsightOpen && (
                        <div className="absolute inset-0 z-50 flex animate-fade-in">
                            <div className="relative w-full h-full bg-white dark:bg-[#111111] shadow-2xl flex flex-col">
                                <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
                                    <div className="px-8 py-6 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-lg text-brand-600">
                                                <InboxStackIcon className="w-6 h-6" />
                                            </div>
                                            <h2 className="text-xl font-extrabold text-neutral-800 dark:text-neutral-100 tracking-tight">Weekly Performance Insight</h2>
                                        </div>
                                        <button onClick={() => setIsInsightOpen(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors group">
                                            <PlusIcon className="w-6 h-6 rotate-45 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-200" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-neutral-50/30 dark:bg-neutral-900/10">
                                        {insightLoading ? (
                                            <div className="flex flex-col items-center justify-center h-full gap-5">
                                                <div className="w-12 h-12 border-4 border-brand-500/10 border-t-brand-500 rounded-full animate-spin"></div>
                                                <p className="text-[17px] font-bold text-neutral-500 animate-pulse">Running advanced analytics...</p>
                                            </div>
                                        ) : weeklyInsight ? (
                                            <div className="bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-neutral-800/60 rounded-3xl p-10 shadow-sm max-w-3xl mx-auto transition-all duration-500">
                                                <div className="prose prose-md dark:prose-invert prose-neutral max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:leading-[1.8] prose-strong:text-brand-600 dark:prose-strong:text-brand-400">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {weeklyInsight}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-24 bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-10 shadow-sm max-w-2xl mx-auto">
                                                <p className="text-lg text-neutral-400 font-medium italic mb-8">No specific insights detected for your current data.</p>
                                                <button 
                                                    onClick={handleRefreshInsight}
                                                    className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-[15px] hover:bg-brand-700 transition-all shadow-xl active:scale-95"
                                                >
                                                    Generate New Report
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-8 border-t border-neutral-100 dark:border-neutral-800/80 shrink-0">
                                        <button 
                                            onClick={handleRefreshInsight}
                                            disabled={insightLoading}
                                            className="w-full max-w-sm mx-auto flex items-center justify-center gap-3 py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-black text-[16px] shadow-xl active:scale-[0.98] transition-all hover:opacity-90 disabled:opacity-50"
                                        >
                                            <ArrowPathIcon className={`w-5 h-5 ${insightLoading ? 'animate-spin' : ''}`} />
                                            <span>Update Weekly Summary</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* Messages Scroll Area */}
                    <div className="flex-1 overflow-y-auto px-4 md:px-12 py-6 relative z-10 custom-scrollbar scroll-smooth">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center min-h-full w-full mx-auto py-8">

                                {/* Personalized Greeting */}
                                <div className="flex items-center gap-4 mb-6 animate-fade-in-up">
                                    <div className="w-12 h-12 flex items-center justify-center text-orange-500">
                                        <SparklesIcon className="w-10 h-10 animate-pulse-slow" />
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-serif font-medium text-neutral-800 dark:text-neutral-100 tracking-tight">
                                        {getTimeGreeting()}, {user?.name?.split(' ')[0] || 'Explorer'}
                                    </h1>
                                </div>

                                {/* Suggested Questions - Immediate Entry */}
                                {!suggestionsLoading && suggestions.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 animate-fade-in-up px-4 w-full max-w-2xl mx-auto" style={{ animationDelay: '100ms' }}>
                                        {suggestions.slice(0, 4).map((q, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setQuery(q)}
                                                className="px-4 py-3 bg-white dark:bg-[#1c1c1c] hover:bg-brand-50 dark:hover:bg-brand-900/20 border border-neutral-200 dark:border-neutral-800 hover:border-brand-500/40 text-[12px] font-bold text-neutral-600 dark:text-neutral-400 hover:text-brand-600 rounded-xl transition-all shadow-sm active:scale-[0.98] text-center flex items-center justify-center min-h-[50px]"
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Main Centered Input Box */}
                                <div className="w-full max-w-5xl bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500/50 transition-all duration-300 mb-4 animate-fade-in-up">
                                    <textarea
                                        rows={2}
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        placeholder="What would you like to analyze today?"
                                        className="w-full bg-transparent border-none outline-none text-lg text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 resize-none px-2 py-1 h-12"
                                    />

                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-50 dark:border-neutral-800/50">
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={handleNewChat}
                                                className="p-2 text-neutral-400 hover:text-brand-600 transition-colors rounded-lg group" 
                                                title="New Chat"
                                            >
                                                <PlusIcon className="w-5 h-5 transition-transform group-active:rotate-90" />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    const newState = !isInsightOpen;
                                                    setIsInsightOpen(newState);
                                                    if (newState) setIsHistoryOpen(false);
                                                    if (newState && !weeklyInsight) loadWeeklyInsight();
                                                }}
                                                className={`p-2 transition-all rounded-lg ${isInsightOpen ? 'text-brand-500' : 'text-neutral-400 hover:text-brand-600'}`}
                                                title="Weekly Insight"
                                            >
                                                <InboxStackIcon className={`w-5 h-5 ${insightLoading ? 'animate-pulse' : ''}`} />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    const newState = !isHistoryOpen;
                                                    setIsHistoryOpen(newState);
                                                    if (newState) setIsInsightOpen(false);
                                                }}
                                                className={`p-2 transition-all rounded-lg ${isHistoryOpen ? 'text-brand-500' : 'text-neutral-400 hover:text-brand-600'}`}
                                                title="Chat History"
                                            >
                                                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <button 
                                                    onClick={() => setIsSourceMenuOpen(!isSourceMenuOpen)}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all border ${isSourceMenuOpen || selectedSources.length > 0 
                                                        ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500/30 text-brand-600 dark:text-brand-400' 
                                                        : 'text-neutral-500 border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
                                                >
                                                    <ChartBarIcon className="w-3.5 h-3.5" />
                                                    <span>{selectedSources.length > 0 ? `${selectedSources.length}` : 'Sources'}</span>
                                                    <ChevronDownIcon className={`w-3 h-3 transition-transform ${isSourceMenuOpen ? 'rotate-180' : ''}`} />
                                                </button>

                                                {isSourceMenuOpen && (
                                                    <div className="absolute right-0 bottom-full mb-2 w-56 bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl z-[60] p-2 animate-fade-in-up">
                                                        <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800 mb-1">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Context Sources</p>
                                                        </div>
                                                        {connectedSources.length === 0 ? (
                                                            <p className="px-3 py-4 text-xs text-neutral-500 italic text-center">No platforms connected.</p>
                                                        ) : (
                                                            <div className="space-y-0.5">
                                                                {['gsc', 'ga4', 'google-ads', 'facebook-ads']
                                                                    .filter(id => connectedSources.includes(id) || (id === 'google-ads' && connectedSources.includes('google_ads')) || (id === 'facebook-ads' && (connectedSources.includes('meta') || connectedSources.includes('facebook'))))
                                                                    .map(source => (
                                                                        <button
                                                                            key={source}
                                                                            onClick={() => toggleSource(source)}
                                                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${selectedSources.includes(source)
                                                                                ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600'
                                                                                : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                                                                            }`}
                                                                        >
                                                                            {sourceLabels[source] || source}
                                                                            {selectedSources.includes(source) && <div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>}
                                                                        </button>
                                                                    ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-800"></div>
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={!query.trim() || loading}
                                                className="p-2 bg-brand-600 hover:bg-brand-700 disabled:bg-neutral-200 dark:disabled:bg-neutral-800 disabled:text-neutral-400 text-white rounded-lg transition-all shadow-sm"
                                            >
                                                <PaperAirplaneIcon className="w-4 h-4 -rotate-45" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Source-Matched Quick Actions - Compact Premium Design */}
                                <div className="flex flex-wrap justify-center gap-3 animate-fade-in-up px-6 max-w-4xl mx-auto mb-1" style={{ animationDelay: '150ms' }}>
                                    {[
                                        { label: 'Search Console', icon: GlobeAltIcon, prompt: 'Analyze my Google Search Console performance and identify top-ranking keywords and impressions.' },
                                        { label: 'GA4 Analytics', icon: ChartBarIcon, prompt: 'Provide a deep dive into my Google Analytics 4 data to understand user behavior and conversion paths.' },
                                        { label: 'Google Paid Ads', icon: CursorArrowRaysIcon, prompt: 'Evaluate my Google Ads campaign efficiency, including CTR, CPC, and overall ROAS.' },
                                        { label: 'Meta Social Ads', icon: ArrowTrendingUpIcon, prompt: 'Review my Facebook/Meta Ads reach and engagement metrics to optimize social strategy.' }
                                    ].map((item, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setQuery(item.prompt)}
                                            className="px-4 py-2.5 bg-white dark:bg-[#1c1c1c] border border-neutral-200/80 dark:border-neutral-800 rounded-xl text-[13px] font-bold text-neutral-800 dark:text-neutral-200 hover:border-brand-500 hover:shadow-sm flex items-center gap-2.5 transition-all duration-300 active:scale-[0.97] group"
                                        >
                                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-50 dark:bg-neutral-800 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/40 transition-colors">
                                                <item.icon className="w-4 h-4 text-neutral-400 group-hover:text-brand-500 transition-colors" strokeWidth={2.5} />
                                            </div>
                                            <span className="group-hover:text-brand-600 transition-colors">{item.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <p className="text-center text-[11px] text-neutral-400 dark:text-neutral-500 font-medium hidden sm:block">
                                    RankPilot AI can make mistakes. Always verify critical metrics before making business decisions.
                                </p>

                            </div>
                        ) : (
                            <div className="space-y-6 md:space-y-8 w-full max-w-5xl mx-auto pb-4">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group animate-fade-in-up`}>
                                        <div className={`flex max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-4`}>
                                            <div className="shrink-0 mt-1">
                                                {msg.role === 'user' ? (
                                                    <div className="w-9 h-9 rounded-full bg-neutral-800 text-white flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">
                                                        {user?.name?.charAt(0) || 'U'}
                                                    </div>
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shadow-sm border border-neutral-200 dark:border-neutral-700">
                                                        <SparklesIcon className="w-5 h-5 text-brand-600" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`px-2 py-1 leading-relaxed markdown-content ${msg.role === 'user'
                                                ? 'text-neutral-900 dark:text-white font-medium prose-sm'
                                                : 'text-neutral-800 dark:text-neutral-200 prose prose-neutral dark:prose-invert max-w-none'
                                                }`}>
                                                {msg.role === 'assistant' ? (
                                                    msg.content ? (
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                            components={{
                                                                code({ node, inline, className, children, ...props }) {
                                                                    const match = /language-json-chart-(\w+)/.exec(className || '');
                                                                    if (!inline && match) {
                                                                        try {
                                                                            const chartData = JSON.parse(String(children).replace(/\n$/, ''));
                                                                            return (
                                                                                <div className="my-10 w-full overflow-hidden animate-fade-in">
                                                                                    <ChartRenderer type={match[1]} data={chartData} />
                                                                                </div>
                                                                            );
                                                                        } catch (err) {
                                                                            // Return a subtle placeholder while JSON is streaming/invalid
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
                                                            }}
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
                                                    ) : (
                                                        <div className="flex items-center space-x-2 py-2">
                                                            <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                            <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                            <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                                        </div>
                                                    )
                                                ) : (
                                                    msg.content
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div ref={messagesEndRef} className="h-10" />
                            </div>
                        )}
                    </div>

                    {/* Fixed Input Area at Bottom - ONLY show when chat is active */}
                    {messages.length > 0 && (
                        <div className="p-4 md:p-6 bg-white dark:bg-dark-card border-t border-neutral-100 dark:border-neutral-800 shrink-0 relative z-20 animate-fade-in-up">                            <div className="max-w-5xl mx-auto mb-2.5 flex items-center justify-between px-1">
                                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 whitespace-nowrap">Active Context:</span>
                                    <div className="flex items-center gap-1">
                                        {selectedSources.length === 0 ? (
                                            <span className="text-[9px] text-neutral-400 italic">No sources selected</span>
                                        ) : (
                                            selectedSources.map(s => (
                                                <div key={s} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700/50">
                                                    <div className={`w-1 h-1 rounded-full ${s === 'gsc' ? 'bg-blue-500' : s === 'ga4' ? 'bg-orange-500' : s === 'google-ads' ? 'bg-yellow-500' : 'bg-indigo-500'}`} />
                                                    <span className="text-[9px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">{s === 'google-ads' ? 'Ads' : s}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleSendMessage} className="relative flex items-center w-full max-w-5xl mx-auto group">
                                <div className="absolute left-3 flex items-center gap-1.5 z-10 transition-opacity">
                                    <button 
                                        type="button" 
                                        onClick={handleNewChat}
                                        className="p-2 text-neutral-400 hover:text-brand-600 transition-colors rounded-lg group" 
                                        title="New Chat"
                                    >
                                        <PlusIcon className="w-5 h-5 transition-transform group-active:rotate-90" />
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const newState = !isInsightOpen;
                                            setIsInsightOpen(newState);
                                            if (newState) setIsHistoryOpen(false);
                                            if (newState && !weeklyInsight) loadWeeklyInsight();
                                        }}
                                        className={`p-2 transition-all rounded-lg ${isInsightOpen ? 'text-brand-500' : 'text-neutral-400 hover:text-brand-600'}`}
                                        title="Weekly Insight"
                                    >
                                        <InboxStackIcon className={`w-5 h-5 ${insightLoading ? 'animate-pulse' : ''}`} />
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const newState = !isHistoryOpen;
                                            setIsHistoryOpen(newState);
                                            if (newState) setIsInsightOpen(false);
                                        }}
                                        className={`p-2 transition-all rounded-lg ${isHistoryOpen ? 'text-brand-500' : 'text-neutral-400 hover:text-brand-600'}`}
                                        title="Chat History"
                                    >
                                        <ChatBubbleLeftRightIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Message RankPilot AI..."
                                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 py-4 pl-36 pr-36 text-[15px] font-medium text-neutral-900 dark:text-white outline-none placeholder:text-neutral-500 rounded-2xl focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all shadow-inner"
                                    disabled={loading}
                                />
                                
                                <div className="absolute right-3 flex items-center gap-2">
                                    <div className="relative">
                                        <button 
                                            type="button"
                                            onClick={() => setIsSourceMenuOpen(!isSourceMenuOpen)}
                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all border ${isSourceMenuOpen || selectedSources.length > 0 
                                                ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500/30 text-brand-600' 
                                                : 'text-neutral-500 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                                        >
                                            <ChartBarIcon className="w-3.5 h-3.5" />
                                            <span>{selectedSources.length > 0 ? `${selectedSources.length}` : 'Sources'}</span>
                                            <ChevronDownIcon className={`w-3 h-3 transition-transform ${isSourceMenuOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isSourceMenuOpen && (
                                            <div className="absolute right-0 bottom-full mb-2 w-56 bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl z-50 p-2 animate-fade-in-up">
                                                <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800 mb-1">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Context Sources</p>
                                                </div>
                                                {connectedSources.length === 0 ? (
                                                    <p className="px-3 py-4 text-xs text-neutral-500 italic text-center">No platforms connected.</p>
                                                ) : (
                                                    <div className="space-y-0.5">
                                                        {['gsc', 'ga4', 'google-ads', 'facebook-ads']
                                                            .filter(id => connectedSources.includes(id) || (id === 'google-ads' && connectedSources.includes('google_ads')) || (id === 'facebook-ads' && (connectedSources.includes('meta') || connectedSources.includes('facebook'))))
                                                            .map(source => (
                                                                <button
                                                                    key={source}
                                                                    onClick={() => toggleSource(source)}
                                                                    type="button"
                                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${selectedSources.includes(source)
                                                                        ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600'
                                                                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                                                                    }`}
                                                                >
                                                                    {sourceLabels[source] || source}
                                                                    {selectedSources.includes(source) && <div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>}
                                                                </button>
                                                            ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-800"></div>
                                    <button
                                        type="submit"
                                        disabled={!query.trim() || loading}
                                        className="p-2 bg-brand-600 hover:bg-brand-700 rounded-xl text-white disabled:opacity-50 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 transition-colors shadow-sm flex items-center justify-center group"
                                    >
                                        <PaperAirplaneIcon className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" strokeWidth={2} />
                                    </button>
                                </div>
                            </form>
                            <p className="text-center text-[11px] text-neutral-400 dark:text-neutral-500 mt-1.5 font-medium hidden sm:block">
                                RankPilot AI can make mistakes. Always verify critical metrics before making business decisions.
                            </p>
                        </div>
                    )}
                    </div> {/* End of Content Wrapper */}

                    {/* Delete Confirmation Modal - Moved Outside the Blur Wrapper */}
                    {chatToDelete && (
                        <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
                            {/* Backdrop - Fully Transparent */}
                            <div
                                className="absolute inset-0 bg-transparent"
                                onClick={() => setChatToDelete(null)}
                            ></div>
                            <div className="relative w-full max-w-[340px] bg-white dark:bg-[#1c1c1c] border border-neutral-200/50 dark:border-neutral-800/50 rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] p-7 overflow-hidden animate-scale-in">
                                <h2 className="text-[20px] font-black text-neutral-900 dark:text-white mb-2.5 tracking-tight px-1">Delete chat</h2>
                                <p className="text-neutral-500 dark:text-neutral-400 text-[15px] font-medium mb-8 leading-relaxed px-1">
                                    Are you sure you want to delete this chat?
                                </p>
                                <div className="flex items-center justify-end gap-3">
                                    <button
                                        onClick={() => setChatToDelete(null)}
                                        className="px-6 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-200 font-bold text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="px-6 py-2.5 rounded-2xl bg-[#ec5e5e] hover:bg-red-600 text-white font-bold text-sm transition-all shadow-lg active:scale-95 shadow-red-500/10 font-bold"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}


                </div>
            </div>

        </DashboardLayout>
    );
};

export default AIChatPage;
