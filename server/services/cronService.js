import cron from 'node-cron';
import { syncAllGsc, syncAllGa4, syncAllGoogleAds, syncAllFacebookAds, syncDailyForAllUsers } from './syncService.js';
import { 
    checkExpiringTokens, 
    checkPerformanceDrops, 
    checkInactiveSources, 
    checkMonthlyGrowth, 
    checkAdSpendSpikes 
} from './notificationMonitoringService.js';


export const initCronJobs = () => {

    // Daily at 00:00 - Check for expiring tokens & Full Sync
    cron.schedule('0 0 * * *', async () => {
        await checkExpiringTokens();
        await syncDailyForAllUsers();
    }, { timezone: "Asia/Kolkata" });

    // Weekly at 01:00 on Monday - Check for performance drops
    cron.schedule('0 1 * * 1', async () => {
        await checkPerformanceDrops();
    }, { timezone: "Asia/Kolkata" });

    // Daily at 01:10 - Check for inactive (zero data) sources
    cron.schedule('10 1 * * *', async () => {
        await checkInactiveSources();
    }, { timezone: "Asia/Kolkata" });

    // Daily at 02:00 - Check for sudden Ad spend spikes
    cron.schedule('0 2 * * *', async () => {
        await checkAdSpendSpikes();
    }, { timezone: "Asia/Kolkata" });

    // Monthly at 03:00 on 1st - Send growth summary
    cron.schedule('0 3 1 * *', async () => {
        await checkMonthlyGrowth();
    }, { timezone: "Asia/Kolkata" });




    cron.schedule('*/30 * * * *', async () => {
        await syncAllFacebookAds();
    }, { timezone: "Asia/Kolkata" });

    cron.schedule('0 * * * *', async () => {
        await syncAllGoogleAds();
    }, { timezone: "Asia/Kolkata" });


    cron.schedule('0 */4 * * *', async () => {
        await syncAllGa4();
    }, { timezone: "Asia/Kolkata" });


    cron.schedule('0 2,14 * * *', async () => {
        await syncAllGsc();
    }, { timezone: "Asia/Kolkata" });

    console.log('Staggered Cron Jobs (FB:30m, GAds:1h, GA4:4h, GSC:12h) initialized.');
};

export default { initCronJobs };
