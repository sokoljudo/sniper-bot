import { Transaction, VersionedTransaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import axios from 'axios';
import { connection, owner, fetchTokenAccountData } from '../config.js';
import { API_URLS } from '@raydium-io/raydium-sdk-v2';

export const apiSwap = async () => {
  const solBalance = await connection.getBalance(owner.publicKey) / 1e9;
  console.log(`SOL Balance: ${solBalance} SOL`);
  const inputMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const outputMint = NATIVE_MINT.toBase58();
  const amount = `${solBalance * 0.1}`;
  const slippage = 5; // в процентах
  const txVersion = 'V0';
  const isV0Tx = txVersion === 'V0';

  const [isInputSol, isOutputSol] = [inputMint === NATIVE_MINT.toBase58(), outputMint === NATIVE_MINT.toBase58()];

  const { tokenAccounts } = await fetchTokenAccountData();
  const inputTokenAcc = tokenAccounts.find((a) => a.mint.toBase58() === inputMint)?.publicKey;
  const outputTokenAcc = tokenAccounts.find((a) => a.mint.toBase58() === outputMint)?.publicKey;

  if (!inputTokenAcc && !isInputSol) {
    console.error('Нет счета для ввода токенов');
    return;
  }

  try {
    const { data: feeData } = await axios.get(`${API_URLS.BASE_HOST}${API_URLS.PRIORITY_FEE}`);
    const highPriorityFee = feeData.data.default.h;

    const { data: swapResponse } = await axios.get(
      `${API_URLS.SWAP_HOST}/compute/swap-base-in`, {
        params: {
          inputMint,
          outputMint,
          amount,
          slippageBps: slippage * 100,
          txVersion,
        },
      }
    );
    console.log(swapResponse.msg)
    const { data: swapTransactions } = await axios.post(`${API_URLS.SWAP_HOST}/transaction/swap-base-in`, {
      computeUnitPriceMicroLamports: String(highPriorityFee),
      swapResponse,
      txVersion,
      wallet: owner.publicKey.toBase58(),
      wrapSol: isInputSol,
      unwrapSol: isOutputSol,
      inputAccount: isInputSol ? undefined : inputTokenAcc?.toBase58(),
      outputAccount: isOutputSol ? undefined : outputTokenAcc?.toBase58(),
    });
    console.log(String(highPriorityFee), txVersion, owner.publicKey.toBase58(), isInputSol, isOutputSol)
    if (!swapTransactions || !swapTransactions.data) {
      console.error('Ошибка при получении swap transactions:', swapTransactions);
      return;
    }

    const allTxBuf = swapTransactions.data.map((tx) => Buffer.from(tx.transaction, 'base64'));
    const allTransactions = allTxBuf.map((txBuf) =>
      isV0Tx ? VersionedTransaction.deserialize(txBuf) : Transaction.from(txBuf)
    );

    console.log(`Всего транзакций: ${allTransactions.length}`);

    let idx = 0;
    if (!isV0Tx) {
      for (const tx of allTransactions) {
        idx++;
        console.log(`Отправка транзакции ${idx}...`);
        tx.sign(owner);
        const txId = await sendAndConfirmTransaction(connection, tx, [owner], { skipPreflight: true });
        console.log(`Транзакция ${idx} подтверждена, txId: ${txId}`);
      }
    } else {
      for (const tx of allTransactions) {
        idx++;
        console.log(`Отправка транзакции ${idx}...`);
        tx.sign([owner]);
        const txId = await connection.sendTransaction(tx, { skipPreflight: true });
        const { lastValidBlockHeight, blockhash } = await connection.getLatestBlockhash({
          commitment: 'finalized',
        });
        console.log(`Транзакция ${idx} отправлена, txId: ${txId}`);
        await connection.confirmTransaction(
          {
            blockhash,
            lastValidBlockHeight,
            signature: txId,
          },
          'confirmed'
        );
        console.log(`Транзакция ${idx} подтверждена`);
      }
    }
  } catch (error) {
    console.error('Ошибка при обработке транзакций:', error);
  }
};

apiSwap();
