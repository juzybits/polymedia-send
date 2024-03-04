import { useCurrentAccount, useSignTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { CoinBalance } from '@mysten/sui.js/client';
import { ZkSendLinkBuilder } from '@mysten/zksend';
import { shortenSuiAddress } from '@polymedia/suits';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AppContext } from './App';

export const PageSend: React.FC = () =>
{
    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutateAsync: signTransactionBlock } = useSignTransactionBlock();
    const { openConnectModal } = useOutletContext<AppContext>();
    const [ userBalances, setUserBalances ] = useState<CoinBalance[]>([]);

    useEffect(() => {
        void loadUserBalances();
    }, [currAcct]);

    const loadUserBalances = async () => {
        if (!currAcct) {
            setUserBalances([]);
        } else {
            const newBalances = await suiClient.getAllBalances({ owner: currAcct.address });
            setUserBalances(newBalances);
        }
    };

    const createLink = async () => {
        if (!currAcct) {
            return;
        }
        const link = new ZkSendLinkBuilder({
            sender: currAcct.address,
        });

        // SUI
        // link.addClaimableMist(BigInt(1));

        // FUD
        const fudCoinType = '0x76cb819b01abed502bee8a702b4c2d547532c12f25001c9dea795a5e631c26f1::fud::FUD';
        link.addClaimableBalance(fudCoinType, BigInt(99994));

        const url = link.getLink();
        console.debug('url: ', url);

        const txb = await link.createSendTransaction();
        const signedTxb = await signTransactionBlock({
            transactionBlock: txb,
        });
        const resp = await suiClient.executeTransactionBlock({
            transactionBlock: signedTxb.transactionBlockBytes,
            signature: signedTxb.signature,
            options: { showEffects: true },
        });
        console.debug('resp:', resp);
    };

    return <div id='page-send' className='page'>
        <h1>Create a claim link</h1>
        <div className='content'>
        {!currAcct
        ? <>
            <p>Connect your Sui wallet to create a zkSend link.</p>
            <button className='btn' onClick={openConnectModal}>LOG IN</button>
        </> : <>
            <p>The funds can only be claimed via the link once.</p>
            <div>
                <h2>Your assets:</h2>
                <div>
                    {userBalances.map(bal => (
                    <div key={bal.coinType}>
                        <div>Type: {shortenSuiAddress(bal.coinType, 3, 3, '0x', '...')}</div>
                        <div>Balance: {bal.totalBalance}</div>
                    </div>
                    ))}
                </div>
            </div>
            <button className='btn' onClick={() => void createLink()}>CREATE LINK</button>
        </>
        }
        </div>
    </div>;
};
