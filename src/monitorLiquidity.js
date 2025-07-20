import { PublicKey } from '@solana/web3.js';
import { connection } from '../config.js';
import { checkTokenSafety } from './checkTokenSafety.js';
import { apiSwap } from './swap_base-in.js';
import { logWithTimestamp } from './logger.js';

const RAYDIUM_AMM_PROGRAM_ID = new PublicKey(
    '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'
);

let rightToken = null;
export { rightToken };

export async function monitorLiquidity() {
    try {
        logWithTimestamp('Starting liquidity monitoring...');

        connection.onLogs(
            RAYDIUM_AMM_PROGRAM_ID,
            async (logInfo) => {
                try {
                    const { signature, logs } = logInfo;

                    if (logs.some((log) => log.includes('initialize2'))) {
                        logWithTimestamp(
                            `Detected liquidity addition, transaction: https://solscan.io/tx/${signature}`
                        );

                        const tx = await connection.getTransaction(signature, {
                            commitment: 'confirmed',
                            maxSupportedTransactionVersion: 0,
                        });

                        if (
                            tx &&
                            tx.meta &&
                            tx.meta.postTokenBalances &&
                            tx.meta.postTokenBalances.length >= 2
                        ) {
                            const token1 = tx.meta.postTokenBalances[0].mint;
                            const token2 = tx.meta.postTokenBalances[1].mint;

                            if (
                                token1 !==
                                'So11111111111111111111111111111111111111112'
                            ) {
                                rightToken = token1;
                            } else if (
                                token2 !==
                                'So11111111111111111111111111111111111111112'
                            ) {
                                rightToken = token2;
                            } else {
                                logWithTimestamp('Failed to find target token');
                                return;
                            }

                            logWithTimestamp(`Found token ${rightToken}`);

                            const safetyCheck = await checkTokenSafety(
                                rightToken
                            );
                            if (!safetyCheck.safe) {
                                logWithTimestamp(
                                    `❌ Token ${rightToken} failed safety check. Searching for next pool...`
                                );
                                return;
                            }

                            logWithTimestamp(
                                `✅ Token ${rightToken} passed safety check. Initiating swap...`
                            );

                            try {
                                await apiSwap(rightToken);
                                logWithTimestamp(
                                    `🎉 Token ${rightToken} swap completed!`
                                );
                            } catch (swapError) {
                                console.error(
                                    `❌ Error executing swap for token ${rightToken}:`,
                                    swapError
                                );
                            }

                            logWithTimestamp(
                                '--------------------Searching for next pool...--------------------'
                            );
                        } else {
                            logWithTimestamp(
                                'Transaction does not contain required data. Searching for next pool...'
                            );
                        }
                    }
                } catch (error) {
                    console.error(
                        '❌ Liquidity monitoring error:',
                        error.message
                    );
                }
            },
            'confirmed'
        );
    } catch (error) {
        console.error('Liquidity monitoring error:', error);
    }
}
