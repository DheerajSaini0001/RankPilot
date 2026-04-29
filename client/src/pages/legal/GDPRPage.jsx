import React from 'react';
import PolicyLayout from '../../components/ui/PolicyLayout';

const GDPRPage = () => (
  <PolicyLayout title="GDPR Compliance" lastUpdated="April 29, 2025">
    <h2>1. GDPR Overview</h2>
    <p>The General Data Protection Regulation (GDPR) is a regulation in EU law on data protection and privacy in the European Union and the European Economic Area.</p>
    
    <h2>2. Your Rights</h2>
    <p>Under the GDPR, you have several rights regarding your personal data:</p>
    <ul>
      <li><strong>Right of access:</strong> You can request a copy of the data we hold about you.</li>
      <li><strong>Right to rectification:</strong> You can request that we correct any inaccurate data.</li>
      <li><strong>Right to erasure:</strong> You can request that we delete your data.</li>
      <li><strong>Right to restrict processing:</strong> You can request that we limit how we use your data.</li>
    </ul>

    <h2>3. Data Protection Officer</h2>
    <p>If you have any questions about our GDPR compliance, please contact our Data Protection Officer at privacy@rankpilot.com.</p>
  </PolicyLayout>
);

export default GDPRPage;
