import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import UserAccounts from '../models/UserAccounts.js';
import { syncHistoricalData, syncGsc, syncGa4, syncGoogleAds, syncFacebookAds } from './syncService.js';

dotenv.config();

const redisOptions = {
    maxRetriesPerRequest: null,
};

const connection = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, redisOptions)
    : new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        ...redisOptions
    });

connection.on('error', (err) => {
    console.error('[Redis Error]', err.message);
});

// Create the main sync queue
export const syncQueue = new Queue('sync-data-queue', { connection });

// Initialize Workers
export const initWorker = () => {
    console.log('[Worker] Initializing BullMQ Worker...');

    const worker = new Worker('sync-data-queue', async (job) => {
        const { accountId, source, startDate, endDate, acc, accName } = job.data;
        const targetAccId = accountId || acc?._id;
        const jobTag = `${job.name.toUpperCase()}${source ? ` (${source.toUpperCase()})` : ''}`;
        const accountName = acc?.siteName || acc?.name || accName || targetAccId || 'Unknown';

        console.log(`[Worker] 🚀 Started: [${jobTag}] | Account: ${accountName}`);

        try {
            if (targetAccId) {
                await UserAccounts.findByIdAndUpdate(targetAccId, { syncStatus: 'syncing' });
            }

            switch (job.name) {
                case 'historical-sync':
                    await syncHistoricalData(accountId, source);
                    break;
                case 'daily-sync-gsc':
                    await syncGsc(acc, startDate, endDate);
                    break;
                case 'daily-sync-ga4':
                    await syncGa4(acc, startDate, endDate);
                    break;
                case 'daily-sync-google-ads':
                    await syncGoogleAds(acc, startDate, endDate);
                    break;
                case 'daily-sync-facebook-ads':
                    await syncFacebookAds(acc, startDate, endDate);
                    break;
                default:
                    console.warn(`[Worker] Unknown job type: ${job.name}`);
            }

            if (targetAccId) {
                const updateData = { lastDailySyncAt: new Date() };
                if (job.name !== 'historical-sync') {
                    updateData.syncStatus = 'idle';
                }
                await UserAccounts.findByIdAndUpdate(targetAccId, { $set: updateData });
            }
            console.log(`[Worker] ✅ Completed: [${jobTag}] | Account: ${accountName}`);
        } catch (error) {
            console.error(`[Worker] ❌ Failed: [${jobTag}] | Account: ${accountName} | Error: ${error.message}`);

            if (targetAccId) {
                await UserAccounts.findByIdAndUpdate(targetAccId, { syncStatus: 'error' });
            }

            throw error;
        }
    }, {
        connection,
        concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '10')
    });

    worker.on('failed', (job, err) => {
        console.error(`[Worker] Job ${job.id} permanently failed: ${err.message}`);
    });
};

// Helper to add jobs
export const addSyncJob = async (name, data, options = {}) => {
    // BullMQ priority: 1 is highest, higher numbers are lower priority
    const priority = options.priority || 10;

    await syncQueue.add(name, data, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000 * 60 * 5, // 5 min retry
        },
        removeOnComplete: true,
        priority,
        ...options
    });
};
