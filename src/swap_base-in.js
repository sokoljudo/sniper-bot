import { Transaction, VersionedTransaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import axios from 'axios';
import { connection, owner, fetchTokenAccountData } from '../config.js';
import { API_URLS } from '@raydium-io/raydium-sdk-v2';
import { logWithTimestamp } from './logger.js';

export const apiSwap = async (rightToken) => {
  try {
    logWithTimestamp(`🔄 Начинаем свап токена: ${rightToken}`);

    const inputMint = NATIVE_MINT.toBase58();
    const outputMint = rightToken;
    const amount = 10000000; 
    const slippage = 50; 
    const txVersion = 'V0'; 
    const isV0Tx = txVersion === 'V0';

    const [isInputSol, isOutputSol] = [inputMint === NATIVE_MINT.toBase58(), outputMint === NATIVE_MINT.toBase58()];

    const { tokenAccounts } = await fetchTokenAccountData();
    const inputTokenAcc = tokenAccounts.find((a) => a.mint.toBase58() === inputMint)?.publicKey;
    const outputTokenAcc = tokenAccounts.find((a) => a.mint.toBase58() === outputMint)?.publicKey;

    if (!inputTokenAcc && !isInputSol) {
      console.error('❌ Не найден аккаунт для входного токена.');
      return;
    }

    logWithTimestamp(`📡 Получение комиссии за транзакцию через Raydium API...`);
    const { data } = await axios.get(`${API_URLS.BASE_HOST}${API_URLS.PRIORITY_FEE}`);
    logWithTimestamp('✅ Комиссия успешно получена');

    logWithTimestamp(`📡 Отправляем запрос в Raydium API для вычисления маршрута свапа...`);
    const { data: swapResponse } = await axios.get(
      `${API_URLS.SWAP_HOST}/compute/swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${
        slippage * 100
      }&txVersion=${txVersion}`
    );
    logWithTimestamp('✅ Данные маршрута свапа успешно получены');

    logWithTimestamp(`📡 Генерация транзакций для свапа...`);
    const { data: swapTransactions } = await axios.post(`${API_URLS.SWAP_HOST}/transaction/swap-base-in`, {
      computeUnitPriceMicroLamports: String(data.data.default.h),
      swapResponse,
      txVersion,
      wallet: owner.publicKey.toBase58(),
      wrapSol: isInputSol,
      unwrapSol: isOutputSol,
      inputAccount: isInputSol ? undefined : inputTokenAcc?.toBase58(),
      outputAccount: isOutputSol ? undefined : outputTokenAcc?.toBase58(),
    });
    logWithTimestamp(`✅ Транзакции для свапа успешно сгенерированы`);

    logWithTimestamp(`🔄 Преобразование транзакций в буфер...`);
    const allTxBuf = swapTransactions.data.map((tx) => Buffer.from(tx.transaction, 'base64'));
    const allTransactions = allTxBuf.map((txBuf) =>
      isV0Tx ? VersionedTransaction.deserialize(txBuf) : Transaction.from(txBuf)
    );
    logWithTimestamp(`📊 Обработано транзакций: ${allTransactions.length}`);

    let idx = 0;
    if (!isV0Tx) {
      for (const tx of allTransactions) {
        try {
          logWithTimestamp(`🚀 Отправляем транзакцию #${++idx}...`);
          tx.sign(owner);
          const txId = await sendAndConfirmTransaction(connection, tx, [owner], { skipPreflight: true });
          logWithTimestamp(`✅ Транзакция #${idx} подтверждена, ID: ${txId}`);
        } catch (error) {
          console.error(`❌ Ошибка при отправке транзакции #${idx}:`, error);
        }
      }
    } else {
      for (const tx of allTransactions) {
        try {
          idx++;
          logWithTimestamp(`🚀 Отправляем транзакцию #${idx}...`);
          tx.sign([owner]);
          const txId = await connection.sendTransaction(tx, { skipPreflight: true });
          const { lastValidBlockHeight, blockhash } = await connection.getLatestBlockhash({
            commitment: 'finalized',
          });
          logWithTimestamp(`⏳ Транзакция #${idx} отправлена`);
          await connection.confirmTransaction(
            {
              blockhash,
              lastValidBlockHeight,
              signature: txId,
            },
            'confirmed'
          );
          logWithTimestamp(`✅ Транзакция #${idx} подтверждена: https://solscan.io/tx/${txId}`);
        } catch (error) {
          console.error(`❌ Ошибка при отправке транзакции #${idx}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('❌ Ошибка при выполнении свапа:', error);
  }
};
