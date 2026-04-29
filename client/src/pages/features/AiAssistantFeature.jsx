import React from 'react';
import { SparklesIcon, ChatBubbleBottomCenterTextIcon, LightBulbIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import FeatureLayout from '../../components/ui/FeatureLayout';

const AiAssistantFeature = () => (
  <FeatureLayout 
    title="Your Marketing Co-Pilot" 
    badge="AI Intelligence"
    description="Talk to your data. Ask questions, get insights, and generate reports using our advanced AI marketing assistant."
    icon={SparklesIcon}
  >
    <div className="max-w-4xl mx-auto space-y-16">
        <div className="space-y-6 text-center">
            <h2 className="text-3xl md:text-5xl font-black text-neutral-900 dark:text-white tracking-tight">Stop Guessing. Start Asking.</h2>
            <p className="text-lg text-neutral-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
                Our AI Assistant connects directly to your GA4, GSC, and Ad accounts to answer complex marketing questions in plain English.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
                {
                    q: "Why did my traffic drop yesterday?",
                    a: "Your organic traffic from Google fell by 12%, primarily due to a lower ranking for the keyword 'SEO tools' in the US market.",
                    icon: ChatBubbleBottomCenterTextIcon
                },
                {
                    q: "Which ad campaign has the best ROI?",
                    a: "Your 'Summer Sale' Facebook campaign currently has a 4.5x ROAS, which is 20% higher than your average Google Ads performance.",
                    icon: LightBulbIcon
                }
            ].map((item, i) => (
                <div key={i} className="p-8 rounded-[2rem] bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/5 space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                            <span className="text-xs font-black text-neutral-400">Q</span>
                        </div>
                        <p className="font-bold text-neutral-900 dark:text-white leading-tight mt-2">{item.q}</p>
                    </div>
                    <div className="flex items-start gap-4 p-5 rounded-2xl bg-brand-500/5 border border-brand-500/10">
                        <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
                            <SparklesIcon className="w-5 h-5 text-white" />
                        </div>
                        <p className="text-sm font-medium text-neutral-600 dark:text-slate-300 leading-relaxed mt-1">{item.a}</p>
                    </div>
                </div>
            ))}
        </div>

        <div className="pt-8 border-t border-neutral-200 dark:border-white/5 grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
                <WrenchScrewdriverIcon className="w-8 h-8 text-brand-600 mb-4" />
                <h4 className="font-black text-neutral-900 dark:text-white mb-2">Automated Optimization</h4>
                <p className="text-sm text-neutral-500 dark:text-slate-400 font-medium">AI identifies wasted spend and suggests keyword opportunities automatically.</p>
            </div>
            <div>
                <ChatBubbleBottomCenterTextIcon className="w-8 h-8 text-brand-600 mb-4" />
                <h4 className="font-black text-neutral-900 dark:text-white mb-2">Natural Language</h4>
                <p className="text-sm text-neutral-500 dark:text-slate-400 font-medium">No complex queries needed. Just talk to the assistant like you would a team member.</p>
            </div>
            <div>
                <PresentationChartLineIcon className="w-8 h-8 text-brand-600 mb-4" />
                <h4 className="font-black text-neutral-900 dark:text-white mb-2">Instant Summaries</h4>
                <p className="text-sm text-neutral-500 dark:text-slate-400 font-medium">Get daily, weekly, or monthly executive summaries generated in seconds.</p>
            </div>
        </div>
    </div>
  </FeatureLayout>
);

import { PresentationChartLineIcon } from '@heroicons/react/24/outline';
export default AiAssistantFeature;
