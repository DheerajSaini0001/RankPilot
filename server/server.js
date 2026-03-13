import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import connectDB from './config/db.js';
import { initConfig } from './services/configService.js';
import { configurePassport } from './config/passport.js';
import { initCronJobs } from './services/cronService.js';

const PORT = process.env.PORT || 5001;

connectDB().then(async () => {
    await initConfig();
    await configurePassport();
    initCronJobs();

    app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
});
