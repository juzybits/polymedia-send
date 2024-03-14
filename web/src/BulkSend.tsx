import { useCurrentAccount, useSignTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { convertNumberToBigInt } from '@polymedia/suits';
import { coinInfo } from './constants';
import { ZkSendLinkBuilder } from './lib/zksend';

const linkCount = 5;
const linkAmount = convertNumberToBigInt(1, coinInfo.decimals);

export const PageBulkSend: React.FC = () =>
{
    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutateAsync: signTransactionBlock } = useSignTransactionBlock();

    const createLinks = async () => {
        if (!currAcct) return;
        const txb = new TransactionBlock();

        const fundCoins = new Map<string, string>();
        fundCoins.set(coinInfo.coinType, '0x01541c9b927b07236b3c0d7be730ef349b7ac9f72f2746ad115e3c3f56858677'); // testnet FUD
        let gasEstimateFromDryRun: bigint|undefined = undefined;
        for (let i = 1; i <= linkCount; i++) {
            const link = new ZkSendLinkBuilder({
                sender: currAcct.address,
                host: window.location.origin,
                path: '/claim',
                client: suiClient,
            });
            console.debug(`link ${i}:`, link.getLink());
            link.addClaimableBalance(coinInfo.coinType, linkAmount);
            if (typeof gasEstimateFromDryRun === 'undefined') {
                gasEstimateFromDryRun = await link.estimateClaimGasFee();
            }
            await link.createMultiSendTransaction(txb, gasEstimateFromDryRun, fundCoins);
        }

        const signedTxb = await signTransactionBlock({ transactionBlock: txb });
        const resp = await suiClient.executeTransactionBlock({
            transactionBlock: signedTxb.transactionBlockBytes,
            signature: signedTxb.signature,
            options: { showEffects: true },
        });
        console.debug('resp:', resp);
    };

    return <>
    <div id='bulk-page' className='page'>
        <h1>Create claim links in bulk</h1>
            <button
                className='btn'
                onClick={createLinks}
                disabled={false}
            >CREATE LINKS</button>
        </div>
    </>;
};
