import React from 'react';
import { NewspaperIcon } from '@heroicons/react/24/outline';
import { NavLink } from 'react-router-dom';
import CompanyLayout from '../../components/ui/CompanyLayout';

const BlogPage = () => (
  <CompanyLayout 
    title="RankPilot Blog" 
    description="Expert insights on SEO, marketing automation, and the future of AI-driven analytics."
  >
    <div className="max-w-7xl mx-auto px-6 text-center py-20">
        <NewspaperIcon className="w-20 h-20 text-neutral-300 dark:text-slate-700 mx-auto mb-6" />
        <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-4">Coming Soon</h2>
        <p className="text-neutral-500 dark:text-slate-400 max-w-md mx-auto font-medium">
            We're currently preparing high-quality content to help you master your marketing data. Stay tuned!
        </p>
        <NavLink to="/" className="inline-block mt-8 text-brand-600 font-black hover:underline">
            ← Back to Home
        </NavLink>
    </div>
  </CompanyLayout>
);

export default BlogPage;
