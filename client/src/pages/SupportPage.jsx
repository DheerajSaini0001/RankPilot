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
    const [formData, setFormData] = useState({ subject: '', message: '' });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const categories = [
        { id: 'all', label: 'All Topics', icon: LifebuoyIcon },
        { id: 'general', label: 'General', icon: QuestionMarkCircleIcon },
        { id: 'account', label: 'Account', icon: ShieldCheckIcon },
        { id: 'billing', label: 'Billing', icon: TicketIcon },
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

    const filteredFaqs = faqs.filter(faq => {
        const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const handleSubmitTicket = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        // Log data to simulate API submission
        console.log('Submitting Support Ticket:', formData);

        setTimeout(() => {
            setIsSubmitting(false);
            setShowSuccess(true);
            setFormData({ subject: '', message: '' });
            setTimeout(() => setShowSuccess(false), 5000);
        }, 1500);
    };

    return (
        <DashboardLayout title="Support">
            <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
                
                {/* 1. Page Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Help & Support</h1>
                    <p className="text-neutral-500 dark:text-neutral-400">Find answers or contact our team</p>
                </div>

                {/* 2. Search Bar */}
                <div className="max-w-lg mx-auto relative group">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-brand-500 transition-colors" />
                    <input 
                        type="text"
                        placeholder="Search for answers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-sm shadow-sm dark:text-white"
                    />
                </div>

                {/* 3. FAQ Section */}
                <div className="space-y-6">
                    <div className="flex flex-wrap justify-center gap-2">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border
                                    ${activeCategory === cat.id 
                                        ? 'bg-brand-500 text-white border-brand-500 shadow-md' 
                                        : 'bg-white dark:bg-dark-card text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'}
                                `}
                            >
                                <cat.icon className="w-4 h-4" />
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-700 shadow-sm">
                        {filteredFaqs.length > 0 ? (
                            filteredFaqs.map((faq, idx) => (
                                <div key={idx} className="group">
                                    <button 
                                        onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                                        className="w-full flex items-center justify-between p-5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                                    >
                                        <span className="text-base font-bold text-neutral-900 dark:text-white">
                                            {faq.question}
                                        </span>
                                        <ChevronDownIcon className={`w-5 h-5 text-neutral-400 transition-transform duration-200 ${activeFaq === idx ? 'rotate-180 text-brand-500' : ''}`} />
                                    </button>
                                    
                                    {activeFaq === idx && (
                                        <div className="px-5 pb-5">
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                                {faq.answer}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-neutral-500 dark:text-neutral-400">
                                No questions found matching your search.
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Support Ticket Form */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-xl p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <EnvelopeIcon className="w-6 h-6 text-brand-500" />
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Submit a Ticket</h2>
                    </div>

                    {showSuccess ? (
                        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-lg text-emerald-700 dark:text-emerald-400">
                            <CheckCircleIcon className="w-5 h-5" />
                            <p className="text-sm font-bold">Success! Your ticket has been submitted. We'll get back to you soon.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmitTicket} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 ml-1">Subject</label>
                                <input 
                                    required
                                    type="text" 
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleInputChange}
                                    placeholder="Briefly describe the issue"
                                    className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-sm dark:text-white"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 ml-1">Message</label>
                                <textarea 
                                    required
                                    rows="4"
                                    name="message"
                                    value={formData.message}
                                    onChange={handleInputChange}
                                    placeholder="Tell us more about how we can help..."
                                    className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-sm resize-none dark:text-white"
                                ></textarea>
                            </div>
                            <button 
                                disabled={isSubmitting}
                                type="submit"
                                className="px-8 py-2.5 bg-brand-500 text-white rounded-lg font-bold text-sm hover:bg-brand-600 transition-all disabled:opacity-50 shadow-lg shadow-brand-500/20"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default SupportPage;
