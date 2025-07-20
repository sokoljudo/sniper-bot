'use strict';

import {
    Raydium,
    TxVersion,
    parseTokenAccountResp,
} from '@raydium-io/raydium-sdk-v2';
import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';

// Your private key here
const PRIVATE_KEY = '';

const { decode } = bs58;
export const owner = Keypair.fromSecretKey(decode(PRIVATE_KEY));

export const connection = new Connection('https://api.mainnet-beta.solana.com'); // Your RPC enpoint
export const txVersion = TxVersion.V0;
const cluster = 'mainnet';

let raydium = undefined;

export const initSdk = async (params = { loadToken: false }) => {
    if (raydium) return raydium;

    if (connection.rpcEndpoint === clusterApiUrl('mainnet-beta')) {
        console.warn(
            'Вы используете бесплатный RPC-узел, что может вызвать неожиданные ошибки. Рекомендуется использовать платный узел.'
        );
    }

    console.log(
        `Подключаемся к RPC ${connection.rpcEndpoint} на кластере ${cluster}`
    );

    raydium = await Raydium.load({
        owner,
        connection,
        cluster,
        disableFeatureCheck: true,
        disableLoadToken: !params.loadToken,
        blockhashCommitment: 'finalized',
    });

    return raydium;
};

export const fetchTokenAccountData = async () => {
    const solAccountResp = await connection.getAccountInfo(owner.publicKey);
    const tokenAccountResp = await connection.getTokenAccountsByOwner(
        owner.publicKey,
        { programId: TOKEN_PROGRAM_ID }
    );
    const token2022Req = await connection.getTokenAccountsByOwner(
        owner.publicKey,
        { programId: TOKEN_2022_PROGRAM_ID }
    );

    const tokenAccountData = parseTokenAccountResp({
        owner: owner.publicKey,
        solAccountResp,
        tokenAccountResp: {
            context: tokenAccountResp.context,
            value: [...tokenAccountResp.value, ...token2022Req.value],
        },
    });

    return tokenAccountData;
};
