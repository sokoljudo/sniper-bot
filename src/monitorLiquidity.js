import { PublicKey } from '@solana/web3.js';
import { connection } from '../config.js';
import { checkTokenSafety } from './checkTokenSafety.js';
import { apiSwap } from './swap_base-in.js';
import { logWithTimestamp } from './logger.js';

const RAYDIUM_AMM_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');

let rightToken = null;
export { rightToken };

export async function monitorLiquidity() {
    try {
        logWithTimestamp('Начинаем мониторинг добавления ликвидности...');

        connection.onLogs(
            RAYDIUM_AMM_PROGRAM_ID,
            async (logInfo) => {
                try {
                    const { signature, logs } = logInfo;
            
                    if (logs.some((log) => log.includes('initialize2'))) {
                        logWithTimestamp(`Обнаружено добавление ликвидности, транзакция: https://solscan.io/tx/${signature}`);
                
                        const tx = await connection.getTransaction(signature, {
                            commitment: 'confirmed',
                            maxSupportedTransactionVersion: 0,
                        });
                
                        if (tx && tx.meta && tx.meta.postTokenBalances && tx.meta.postTokenBalances.length >= 2) {
                            const token1 = tx.meta.postTokenBalances[0].mint;
                            const token2 = tx.meta.postTokenBalances[1].mint;
                
                            if (token1 !== 'So11111111111111111111111111111111111111112') {
                                rightToken = token1;
                            } else if (token2 !== 'So11111111111111111111111111111111111111112') {
                                rightToken = token2;
                            } else {
                                logWithTimestamp('Не удалось найти нужный токен');
                                return;
                            }
                
                            logWithTimestamp(`Найденный токен ${rightToken}`);
                
                            const safetyCheck = await checkTokenSafety(rightToken);
                            if (!safetyCheck.safe) {
                                logWithTimestamp(`❌ Токен ${rightToken} не прошел проверку безопасности. Ищу следующий пул...`);
                                return;
                            }
                
                            logWithTimestamp(`✅ Токен ${rightToken} прошел проверку безопасности. Запускаем свап...`);
                
                            try {
                                await apiSwap(rightToken);
                                logWithTimestamp(`🎉 Свап токена ${rightToken} завершён!`);
                            } catch (swapError) {
                                console.error(`❌ Ошибка при выполнении свапа токена ${rightToken}:`, swapError);
                            }
                
                            logWithTimestamp('--------------------Ищу следующий пул...--------------------');
                        } else {
                            logWithTimestamp('Транзакция не содержит необходимых данных. Ищу следующий пул...');
                        }
                    }
                } catch (error) {
                    console.error('❌ Ошибка мониторинга ликвидности:', error.message);      
                }
            
            },
            'confirmed'
        );
    } catch (error) {
        console.error('Ошибка при мониторинге ликвидности:', error);
    }
}

