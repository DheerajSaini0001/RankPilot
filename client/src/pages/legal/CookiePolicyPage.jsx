import React from 'react';
import PolicyLayout from '../../components/ui/PolicyLayout';

const CookiePolicyPage = () => (
  <PolicyLayout title="Cookie Policy" lastUpdated="April 29, 2025">
    <h2>1. What are cookies</h2>
    <p>Cookies are small pieces of text sent by your web browser by a website you visit. A cookie file is stored in your web browser and allows the Service or a third-party to recognize you and make your next visit easier and the Service more useful to you.</p>
    
    <h2>2. How RankPilot uses cookies</h2>
    <p>When you use and access the Service, we may place a number of cookies files in your web browser. We use cookies for the following purposes:</p>
    <ul>
      <li>To enable certain functions of the Service</li>
      <li>To provide analytics</li>
      <li>To store your preferences</li>
    </ul>

    <h2>3. Third-party cookies</h2>
    <p>In addition to our own cookies, we may also use various third-parties cookies to report usage statistics of the Service, deliver advertisements on and through the Service, and so on.</p>
  </PolicyLayout>
);

export default CookiePolicyPage;
