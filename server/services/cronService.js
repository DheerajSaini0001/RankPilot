import cron from 'node-cron';
import { syncAllGsc, syncAllGa4, syncAllGoogleAds, syncAllFacebookAds } from './syncService.js';

export const initCronJobs = () => {

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
