import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import UserAccounts from '../models/UserAccounts.js';
import { syncHistoricalData, syncGsc, syncGa4, syncGoogleAds, syncFacebookAds } from './syncService.js';

dotenv.config();

const connection = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null, // Critical for BullMQ
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
        const { accountId, source, startDate, endDate, acc } = job.data;
        const targetAccId = accountId || acc?._id;
        
        console.log(`[Worker] Started job: ${job.name} (ID: ${job.id}) for Account: ${targetAccId}`);

        try {
            // Update status to syncing
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

            // Update status to idle and update sync time
            if (targetAccId) {
                await UserAccounts.findByIdAndUpdate(targetAccId, { 
                    syncStatus: 'idle', 
                    lastDailySyncAt: new Date() 
                });
            }

            console.log(`[Worker] Job ${job.id} completed successfully!`);
        } catch (error) {
            console.error(`[Worker] Job ${job.id} FAILED:`, error.message);
            
            if (targetAccId) {
                await UserAccounts.findByIdAndUpdate(targetAccId, { syncStatus: 'error' });
            }
            
            throw error;
        }
    }, { 
        connection,
        concurrency: 2 
    });

    worker.on('failed', (job, err) => {
        console.error(`[Worker] Job ${job.id} permanently failed: ${err.message}`);
    });
};

// Helper to add jobs
export const addSyncJob = async (name, data, options = {}) => {
    await syncQueue.add(name, data, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000 * 60 * 5, // 5 min retry
        },
        removeOnComplete: true,
        ...options
    });
};
