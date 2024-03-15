import { useCurrentAccount, useSignTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { convertNumberToBigInt } from '@polymedia/suits';
import { coinInfo } from './constants';
import { ZkSendLinkBuilder, ZkSendLinkBuilderOptions } from './lib/zksend';

const linkCount = 5;
const linkAmount = convertNumberToBigInt(0.00069, coinInfo.decimals);
const linkAmounts = Array<bigint>(linkCount).fill(linkAmount);

export const PageBulkSend: React.FC = () =>
{
    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutateAsync: signTransactionBlock } = useSignTransactionBlock();

    const createLinks = async () => {
        if (!currAcct) return;

        const linkOptions: ZkSendLinkBuilderOptions = {
            sender: currAcct.address,
            host: window.location.origin,
            path: '/claim',
            client: suiClient,
        };
        const [ txb, links ] = await ZkSendLinkBuilder.createMultiSendLinks(
            coinInfo.coinType,
            linkAmounts,
            linkOptions,
        );
        for (const link of links) {
            console.log(link.getLink());
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
