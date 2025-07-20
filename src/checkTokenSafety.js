import { connection } from '../config.js';
import { PublicKey } from '@solana/web3.js';
import { logWithTimestamp } from './logger.js';

export async function checkTokenSafety(tokenMintAddress) {
    try {
        const tokenMintPublicKey = new PublicKey(tokenMintAddress);

        const tokenMintInfo = await connection.getParsedAccountInfo(tokenMintPublicKey);
        if (!tokenMintInfo.value) {
            throw new Error('Токен не найден');
        }

        const tokenInfo = tokenMintInfo.value.data.parsed.info;

        const freezeAuthority = tokenInfo.freezeAuthority || null;
        const mintAuthority = tokenInfo.mintAuthority || null;
        
        if (freezeAuthority) {
            logWithTimestamp('❌ Обнаружен freezeAuthority:', freezeAuthority);
            return { safe: false, reason: 'Токен может быть заморожен (freezeAuthority)' };
        } else if (mintAuthority) {
            logWithTimestamp('❌ Обнаружен mintAuthority:', mintAuthority);
            return { safe: false, reason: 'Токен может быть дополнительно выпущен (mintAuthority)' };
        } else {
            logWithTimestamp('✅ mintAuthority отсутствует');
            logWithTimestamp('✅ freezeAuthority отсутствует');
        }
        

        const response = await fetch(`https://api.rugcheck.xyz/v1/tokens/${tokenMintAddress}/report/summary`, {
            method: 'GET',
            headers: {
            'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Ошибка запроса к RugCheck API: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!data) {
            throw new Error(`Ошибка: ${data.status}`);
        }

        const riskIndicators = ['Mutable metadata', 'Top 10 holders high ownership', 'Large Amount of LP Unlocked'];

        if (data.risks) {
            const riskFound = data.risks.find(risk => riskIndicators.includes(risk.name));
            if (riskFound) {
                logWithTimestamp('❌ Токен не прошел проверку безопасности:', riskFound.name);
                return { safe: false, reason: `Токен не прошел проверку по причине: ${riskFound.name}` };
            }
        }
        
        logWithTimestamp('✅ Остальные уязвимости отсутствуют');
        return { safe: true };

    } catch (error) {
        console.error('Ошибка при проверке:', error);
        return { safe: false, reason: 'Ошибка проверки' };
    }
}

