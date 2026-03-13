import cron from 'node-cron';
import { syncDailyForAllUsers } from './syncService.js';

export const initCronJobs = () => {
    
    cron.schedule('*/10 * * * *', async () => {
        await syncDailyForAllUsers();
        console.log('Recurring analytics sync completed.');
    }, {
        timezone: "Asia/Kolkata"
    });

    console.log('Cron Jobs initialized successfully.');
};

export default { initCronJobs };
