'use strict';

import { initSdk } from './config.js';
import { monitorLiquidity } from './src/monitorLiquidity.js';
import { logWithTimestamp } from './src/logger.js';

const main = async () => {
    try {
        logWithTimestamp('🔗 Connecting to Solana network...');
        await initSdk();

        logWithTimestamp('🚀 Starting liquidity monitoring...');
        await monitorLiquidity();
    } catch (error) {
        console.error('❌ Error in main process:', error);
    }
};

main();
