import React from 'react';
import { BriefcaseIcon } from '@heroicons/react/24/outline';
import CompanyLayout from '../../components/ui/CompanyLayout';

const CareersPage = () => (
  <CompanyLayout 
    title="Join the Pilot Team" 
    description="We're on a mission to make marketing data accessible to everyone. Come build the future of analytics with us."
  >
    <div className="max-w-7xl mx-auto px-6 text-center py-20">
        <BriefcaseIcon className="w-20 h-20 text-neutral-300 dark:text-slate-700 mx-auto mb-6" />
        <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-4">No Openings Right Now</h2>
        <p className="text-neutral-500 dark:text-slate-400 max-w-md mx-auto font-medium">
            We don't have any open positions at the moment, but we're always looking for talented people. Follow us on LinkedIn to stay updated!
        </p>
    </div>
  </CompanyLayout>
);

export default CareersPage;
