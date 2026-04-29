import React from 'react';
import {
    EnvelopeIcon,
    ChatBubbleLeftRightIcon,
    MapPinIcon
} from '@heroicons/react/24/outline';
import CompanyLayout from '../../components/ui/CompanyLayout';

const ContactPage = () => (
    <CompanyLayout
        title="Get in touch"
        description="Have questions about RankPilot? Our team is here to help you get the most out of your marketing data."
    >
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
                <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-8 tracking-tight">Send us a message</h2>
                <form className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-neutral-700 dark:text-slate-300">First Name</label>
                            <input type="text" placeholder="John" className="w-full bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-neutral-700 dark:text-slate-300">Last Name</label>
                            <input type="text" placeholder="Doe" className="w-full bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-neutral-700 dark:text-slate-300">Work Email</label>
                        <input type="email" placeholder="john@company.com" className="w-full bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-neutral-700 dark:text-slate-300">Message</label>
                        <textarea rows="4" placeholder="How can we help?" className="w-full bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white resize-none"></textarea>
                    </div>
                    <button className="w-full bg-brand-600 hover:bg-brand-500 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-brand-500/25 active:scale-[0.98]">
                        Send Message
                    </button>
                </form>
            </div>

            <div className="space-y-12">
                <div>
                    <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-8 tracking-tight">Our Offices</h2>
                    <div className="space-y-8">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
                                <MapPinIcon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">San Francisco</h3>
                                <p className="text-neutral-500 dark:text-slate-400">123 Market Street, Suite 456<br />San Francisco, CA 94105</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
                                <EnvelopeIcon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Email Us</h3>
                                <p className="text-neutral-500 dark:text-slate-400">support@rankpilot.com<br />sales@rankpilot.com</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-brand-600 rounded-3xl text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black mb-2">Need immediate help?</h3>
                        <p className="text-brand-100 mb-6 font-medium">Our documentation covers everything from setup to advanced reporting.</p>
                        <button className="bg-white text-brand-600 font-black px-6 py-3 rounded-xl hover:bg-brand-50 transition-colors">
                            Read Docs
                        </button>
                    </div>
                    <ChatBubbleLeftRightIcon className="absolute -bottom-4 -right-4 w-32 h-32 text-brand-500 opacity-20" />
                </div>
            </div>
        </div>
    </CompanyLayout>
);

export default ContactPage;
