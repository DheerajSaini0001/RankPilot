import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/ui/DashboardLayout';
import { 
    QuestionMarkCircleIcon, 
    BookOpenIcon, 
    ChatBubbleLeftEllipsisIcon, 
    EnvelopeIcon,
    ChevronDownIcon,
    MagnifyingGlassIcon,
    SparklesIcon,
    LifebuoyIcon,
    ShieldCheckIcon,
    ArrowTopRightOnSquareIcon,
    VideoCameraIcon,
    ChatBubbleBottomCenterTextIcon,
    TicketIcon,
    CheckCircleIcon,
    ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const SupportPage = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFaq, setActiveFaq] = useState(null);
    const [activeCategory, setActiveCategory] = useState('all');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const categories = [
        { id: 'all', label: 'All Topics', icon: LifebuoyIcon },
        { id: 'general', label: 'General', icon: QuestionMarkCircleIcon },
        { id: 'account', label: 'Account & Security', icon: ShieldCheckIcon },
        { id: 'billing', label: 'Billing & Plans', icon: TicketIcon },
        { id: 'integrations', label: 'Integrations', icon: SparklesIcon }
    ];

    const faqs = [
        {
            category: 'integrations',
            question: "How do I connect my Google Search Console account?",
            answer: "To connect GSC, go to the 'Connect Accounts' page from your dashboard or user menu. Click on the 'Google Search Console' button and follow the OAuth prompt to authorize RankPilot. Once authorized, you can select the specific site you want to track."
        },
        {
            category: 'account',
            question: "Is my data secure with RankPilot?",
            answer: "Yes, we take security very seriously. We use industry-standard OAuth2 for all integrations, meaning we never see or store your passwords. Your data is encrypted at rest and in transit, and we only access the specific metrics needed to generate your reports."
        },
        {
            category: 'general',
            question: "How often is the data refreshed?",
            answer: "GSC and GA4 data are typically updated once every 24 hours by Google. RankPilot syncs this data automatically once a day. You can also trigger a manual refresh from the dashboard of each specific data source."
        },
        {
            category: 'general',
            question: "Can I export my reports to PDF?",
            answer: "Absolutely! Every main dashboard page has an 'Export' button at the top right. This will generate a clean, professional PDF version of your current view, perfect for sharing with clients or stakeholders."
        },
        {
            category: 'general',
            question: "How does the AI Assistant work?",
            answer: "Our AI Assistant uses advanced large language models to analyze your specific site data. It can identify trends, explain metric drops, and suggest SEO improvements based on real-time performance. Just ask it anything in the 'AI Assistant' tab!"
        },
        {
            category: 'billing',
            question: "Do you offer a free trial?",
            answer: "Yes! All new accounts come with a 14-day free trial of our Pro features. No credit card is required to start. After the trial, you can choose to stay on our Free plan or upgrade for more advanced analytics."
        }
    ];

    const supportCards = [
        {
            title: "Documentation",
            description: "Detailed guides on every feature and integration.",
            icon: BookOpenIcon,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            link: "https://rankpilot.ai/docs"
        },
        {
            title: "Video Tutorials",
            description: "Watch step-by-step videos on how to maximize RankPilot.",
            icon: VideoCameraIcon,
            color: "text-red-500",
            bg: "bg-red-500/10",
            link: "https://youtube.com/@rankpilot"
        },
        {
            title: "API Reference",
            description: "Build custom integrations with our robust REST API.",
            icon: SparklesIcon,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            link: "https://rankpilot.ai/api-docs"
        }
    ];

    const filteredFaqs = faqs.filter(faq => {
        const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const handleSubmitTicket = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate API call
        setTimeout(() => {
            setIsSubmitting(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 5000);
            e.target.reset();
        }, 1500);
    };

    return (
        <DashboardLayout title="Help & Support">
            <div className="max-w-7xl mx-auto space-y-12 animate-fade-in pb-20">
                
                {/* System Status Banner */}
                <div className="flex items-center justify-between px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping absolute inset-0"></div>
                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full relative"></div>
                        </div>
                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">All Systems Operational</span>
                    </div>
                    <button className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 hover:underline uppercase tracking-widest">
                        View Status Page →
                    </button>
                </div>

                {/* Hero Section */}
                <div className="relative overflow-hidden rounded-[2.5rem] bg-neutral-900 dark:bg-black p-8 sm:p-16 text-white shadow-2xl border border-white/5">
                    {/* Animated Background Mesh */}
                    <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,#3b82f6_0%,transparent_50%),radial-gradient(circle_at_80%_70%,#8b5cf6_0%,transparent_50%)]"></div>
                    </div>
                    
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-8">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
                                <SparklesIcon className="w-4 h-4 text-brand-400" />
                                <span className="text-xs font-black text-brand-100 uppercase tracking-widest">RankPilot Support Hub</span>
                            </div>
                            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
                                Expert help for <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-400">SEO Professionals.</span>
                            </h1>
                            <p className="text-neutral-400 text-lg font-medium max-w-lg">
                                Have questions? We're here to help you scale your organic growth with RankPilot's advanced toolset.
                            </p>
                            
                            <div className="relative group max-w-md">
                                <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-brand-400 transition-colors" />
                                <input 
                                    type="text"
                                    placeholder="Search help articles..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 focus:bg-white/10 transition-all text-base font-bold shadow-2xl"
                                />
                            </div>
                        </div>
                        
                        <div className="hidden lg:block relative">
                            <div className="absolute -inset-4 bg-brand-500/20 blur-[100px] rounded-full"></div>
                            <div className="glass rounded-[2.5rem] p-8 border-white/10 relative overflow-hidden group">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center text-white shadow-lg">
                                                <ChatBubbleBottomCenterTextIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black">Live Chat Support</p>
                                                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Always Online</p>
                                            </div>
                                        </div>
                                        <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase">PRO Feature</div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="p-4 bg-white/5 rounded-2xl text-xs font-medium text-neutral-300">
                                            "How can I integrate GA4 with my RankPilot dashboard?"
                                        </div>
                                        <div className="p-4 bg-brand-500/20 border border-brand-500/30 rounded-2xl text-xs font-bold text-brand-100 ml-8">
                                            "Hi! You can do that in the 'Connect Accounts' tab. It takes less than 2 minutes! 🚀"
                                        </div>
                                    </div>
                                    <button className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm hover:bg-neutral-200 transition-all active:scale-95 shadow-xl">
                                        Start Conversation
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Resources */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {supportCards.map((card, idx) => (
                        <a 
                            key={idx}
                            href={card.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="glass-card group relative p-8 rounded-[2rem] overflow-hidden hover:-translate-y-2 transition-all duration-500"
                        >
                            <div className={`absolute top-0 right-0 w-32 h-32 ${card.bg} blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700`}></div>
                            <div className={`w-14 h-14 ${card.bg} rounded-2xl flex items-center justify-center mb-6 relative z-10 group-hover:rotate-12 transition-transform duration-500`}>
                                <card.icon className={`w-7 h-7 ${card.color}`} strokeWidth={2.5} />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                                    {card.title}
                                    <ArrowTopRightOnSquareIcon className="w-4 h-4 text-neutral-400 group-hover:text-brand-500 transition-colors" />
                                </h3>
                                <p className="text-neutral-500 dark:text-neutral-400 font-bold leading-relaxed">
                                    {card.description}
                                </p>
                            </div>
                        </a>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-8">
                    {/* FAQ Navigation & List */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">Helpful Answers</h2>
                            
                            {/* Category Pills */}
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 sm:pb-0">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={`
                                            flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all
                                            ${activeCategory === cat.id 
                                                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25 scale-105' 
                                                : 'bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-100 dark:border-neutral-700 hover:border-brand-300'}
                                        `}
                                    >
                                        <cat.icon className="w-4 h-4" />
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {filteredFaqs.length > 0 ? (
                                filteredFaqs.map((faq, idx) => (
                                    <div 
                                        key={idx}
                                        className={`
                                            glass-card group overflow-hidden transition-all duration-500 rounded-3xl
                                            ${activeFaq === idx ? 'ring-2 ring-brand-500/50 bg-neutral-50/50 dark:bg-brand-500/5' : 'hover:border-brand-500/30'}
                                        `}
                                    >
                                        <button 
                                            onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                                            className="w-full flex items-center justify-between p-7 text-left"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeFaq === idx ? 'bg-brand-500 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 group-hover:text-brand-500'}`}>
                                                    <QuestionMarkCircleIcon className="w-5 h-5" />
                                                </div>
                                                <span className="text-lg font-black text-neutral-800 dark:text-white pr-8">
                                                    {faq.question}
                                                </span>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full border border-neutral-200 dark:border-neutral-700 flex items-center justify-center transition-all duration-500 ${activeFaq === idx ? 'rotate-180 bg-brand-500 border-brand-500 text-white' : 'text-neutral-400'}`}>
                                                <ChevronDownIcon className="w-4 h-4" strokeWidth={3} />
                                            </div>
                                        </button>
                                        <div 
                                            className={`
                                                transition-all duration-500 ease-in-out
                                                ${activeFaq === idx ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
                                            `}
                                        >
                                            <div className="px-7 pb-8 text-neutral-500 dark:text-neutral-400 font-bold leading-relaxed border-t border-neutral-100 dark:border-neutral-800 pt-7 ml-12">
                                                {faq.answer}
                                                <div className="mt-6 flex items-center gap-4">
                                                    <span className="text-[10px] font-black uppercase text-neutral-400">Was this helpful?</span>
                                                    <div className="flex gap-2">
                                                        <button className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg text-[10px] font-black hover:bg-emerald-500 hover:text-white transition-all">YES</button>
                                                        <button className="px-3 py-1 bg-red-500/10 text-red-600 rounded-lg text-[10px] font-black hover:bg-red-500 hover:text-white transition-all">NO</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-24 glass-card rounded-[3rem]">
                                    <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                                        <MagnifyingGlassIcon className="w-10 h-10 text-neutral-400" />
                                    </div>
                                    <h3 className="text-2xl font-black text-neutral-900 dark:text-white">Nothing found for "{searchQuery}"</h3>
                                    <p className="text-neutral-500 font-bold mt-2 max-w-sm mx-auto">Try checking your spelling or use more general keywords like "Google" or "Account".</p>
                                    <button 
                                        onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                                        className="mt-8 px-8 py-3 bg-brand-500 text-white rounded-2xl font-black shadow-lg shadow-brand-500/25 hover:scale-105 transition-transform"
                                    >
                                        Clear Search
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Support Sidebar / Ticket Form */}
                    <div className="space-y-8">
                        <div className="glass-card rounded-[2.5rem] p-8 border-brand-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
                            
                            <div className="relative z-10 space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                        <TicketIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black">Submit a Ticket</h3>
                                        <p className="text-xs font-bold text-neutral-500">Fast response guaranteed.</p>
                                    </div>
                                </div>

                                {showSuccess ? (
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-3xl text-center space-y-4 animate-in fade-in zoom-in duration-300">
                                        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-lg shadow-emerald-500/30">
                                            <CheckCircleIcon className="w-10 h-10" />
                                        </div>
                                        <h4 className="text-lg font-black text-emerald-700 dark:text-emerald-400">Ticket Received!</h4>
                                        <p className="text-xs font-bold text-emerald-600/70">Check your email for the confirmation. We'll be in touch shortly.</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmitTicket} className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Subject</label>
                                            <input 
                                                required
                                                type="text" 
                                                placeholder="What can we help with?"
                                                className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-brand-500/10 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Message</label>
                                            <textarea 
                                                required
                                                rows="4"
                                                placeholder="Tell us more about your issue..."
                                                className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-brand-500/10 transition-all resize-none"
                                            ></textarea>
                                        </div>
                                        <button 
                                            disabled={isSubmitting}
                                            type="submit"
                                            className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                    Sending...
                                                </>
                                            ) : (
                                                'Send Support Request'
                                            )}
                                        </button>
                                    </form>
                                )}
                                
                                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                                    <div className="flex -space-x-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-neutral-900 bg-neutral-200 overflow-hidden shadow-sm">
                                                <img src={`https://i.pravatar.cc/100?img=${i+20}`} alt="Team" />
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Support Team Online</span>
                                </div>
                            </div>
                        </div>

                        {/* Additional Help Section */}
                        <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-brand-600 to-accent-600 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                            <div className="relative z-10 space-y-6">
                                <h3 className="text-2xl font-black tracking-tight leading-tight">Join the RankPilot Community</h3>
                                <p className="text-brand-100 font-bold text-sm">Connect with 5,000+ SEO experts, share insights, and get beta access to new features.</p>
                                <button className="w-full py-4 bg-white text-brand-600 rounded-2xl font-black text-sm hover:bg-brand-50 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl">
                                    <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
                                    Join Discord Community
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Trust Section */}
                <div className="pt-20 text-center space-y-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">Trusted by modern marketing teams</p>
                    <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-16 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/2560px-Google_2015_logo.svg.png" className="h-6 sm:h-8 object-contain" alt="Google" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/1024px-Facebook_Logo_%282019%29.png" className="h-6 sm:h-8 object-contain" alt="Meta" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/2560px-Amazon_logo.svg.png" className="h-5 sm:h-6 object-contain" alt="Amazon" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/2048px-Microsoft_logo.svg.png" className="h-6 sm:h-8 object-contain" alt="Microsoft" />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default SupportPage;
