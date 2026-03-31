import cron from 'node-cron';
import { syncAllGsc, syncAllGa4, syncAllGoogleAds, syncAllFacebookAds, syncDailyForAllUsers } from './syncService.js';
import { 
    checkExpiringTokens, 
    checkPerformanceDrops, 
    checkInactiveSources, 
    checkMonthlyGrowth, 
    checkAdSpendSpikes,
    generateWeeklyInsightsForAllUsers,
    generateSuggestedQuestionsForAllUsers
} from './notificationMonitoringService.js';


export const initCronJobs = () => {
     // 🟢 SECTION 1: SYSTEM MONITORING & ALERTS

    // Daily Checks (Tokens, Inactivity, Ad Spikes) - Midnight at 12:00 AM
    cron.schedule('0 0 * * *', async () => {
        await checkExpiringTokens();
        await checkInactiveSources();
        await checkAdSpendSpikes();
    }, { timezone: "Asia/Kolkata" });
    
    // Weekly Insight Reports - Every Monday at 1 AM
    cron.schedule('0 1 * * 1', async () => {
        await checkPerformanceDrops();
        await generateWeeklyInsightsForAllUsers();
    }, { timezone: "Asia/Kolkata" });

    // Monthly Growth Summary - 1st of every month at 4 AM
    cron.schedule('0 4 1 * *', async () => {
        await checkMonthlyGrowth();
    }, { timezone: "Asia/Kolkata" });
    
    // AI Suggested Questions - Every night at 5 AM
    cron.schedule('0 5 * * *', async () => {
        await generateSuggestedQuestionsForAllUsers();
    }, { timezone: "Asia/Kolkata" });
    
    // 🔵 SECTION 2: PLATFORM DATA SYNCHRONIZATION
    
    // Full System Sync - Every night at 2 AM
    cron.schedule('0 2 * * *', async () => {
        await syncDailyForAllUsers();
    }, { timezone: "Asia/Kolkata" });

    // Facebook Ads Sync every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
        await syncAllFacebookAds();
    }, { timezone: "Asia/Kolkata" });
    
    // Google Ads Sync every hour
    cron.schedule('0 * * * *', async () => {
        await syncAllGoogleAds();
    }, { timezone: "Asia/Kolkata" });
    
    // GA4 Sync every 4 hours
    cron.schedule('0 */4 * * *', async () => {
        await syncAllGa4();
    }, { timezone: "Asia/Kolkata" });
    
    // GSC Sync every 12 hours
    cron.schedule('0 2,14 * * *', async () => {
        await syncAllGsc();
    }, { timezone: "Asia/Kolkata" });
    
    console.log('⚡ [Cron] Active');
};

export default { initCronJobs };
