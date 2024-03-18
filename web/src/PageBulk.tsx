import { useCurrentAccount, useSignTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { CoinBalance } from '@mysten/sui.js/client';
import { formatBigInt, formatNumber } from '@polymedia/suits';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AppContext } from './App';
import { SelectCoin } from './components/SelectCoin';
import { useCoinBalances, useCoinInfo } from './lib/hooks';
import { ZkSendLinkBuilder, ZkSendLinkBuilderOptions } from './lib/zksend';
import { CoinInfo } from './lib/coininfo';

export const PageBulk: React.FC = () =>
{
    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutateAsync: signTransactionBlock } = useSignTransactionBlock();

    const { inProgress, setInProgress, openConnectModal } = useOutletContext<AppContext>();
    const [ errMsg, setErrMsg ] = useState<string>();
    const [ chosenBalance, setChosenBalance ] = useState<CoinBalance>(); // chosen by user (dropdown)
    const [ chosenAmounts, setChosenAmounts ] = useState<string>(''); // chosen by user (textarea)

    const { userBalances, error: errBalances } = useCoinBalances(suiClient, currAcct);
    const { coinInfo, error: errCoinInfo } = useCoinInfo(suiClient, chosenBalance);

    useEffect(() => {
        const resetState = () => {
            setInProgress(false);
            setErrMsg(undefined);
            setChosenBalance(undefined);
            setChosenAmounts('');
        }
        resetState();
    }, [currAcct, suiClient]);

    const createLinks = async (coinInfo: CoinInfo, amounts: bigint[]) => {
        if (!currAcct) return;

        const options: ZkSendLinkBuilderOptions = {
            sender: currAcct.address,
            host: window.location.origin,
            path: '/claim',
            client: suiClient,
        };
        const [ txb, links ] = await ZkSendLinkBuilder.createMultiSendLinks(
            coinInfo.coinType,
            amounts,
            options,
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

    const error = errMsg ?? errBalances ?? errCoinInfo ?? null;

    return <div id='bulk-page' className='page'>

    <h1>Bulk</h1>

    <h2>Create multiple claim links</h2>

    {(() => {
        if (!currAcct) {
            return <div>
                <p>Connect your Sui wallet to get started.</p>
                <button onClick={openConnectModal} className='btn'>LOG IN</button>
            </div>;
        }

        if (!userBalances) {
            return <div>Loading balances...</div>;
        }

        return <>
            <SelectCoin
                userBalances={userBalances}
                chosenBalance={chosenBalance}
                setChosenBalance={setChosenBalance}
                inProgress={inProgress}
            />

            {(() => {
                if (!chosenBalance) {
                    return <></>;
                }

                if (!coinInfo) {
                    return <div>Loading coin info...</div>;
                }

                // Validate amounts
                const amounts: bigint[] = []; // TODO;
                const amountTotalNum = 123; // TODO
                const amountsErr = ''; // TODO

                const disableSendBtn = amountsErr !== '' || inProgress;

                return <>

                <p>You can create up to 300 links with one transaction.</p>

                <textarea
                    value={chosenAmounts}
                    disabled={inProgress}
                    onChange={e => { setChosenAmounts(e.target.value) }}
                    placeholder='Enter "[LINKS] x [AMOUNT]". For example: "50 x 1000, 25 x 5000".'
                />

                <p>
                    Total amount to send: {formatNumber(amountTotalNum, 'compact')} {coinInfo.symbol}
                </p>

                <p>
                    Your balance: {formatBigInt(BigInt(chosenBalance.totalBalance), coinInfo.decimals, 'compact')}
                </p>

                {amountsErr &&
                <div className='error-box'>
                    Error: {amountsErr}
                </div>}

                <button
                    className='btn'
                    onClick={ () => { createLinks(coinInfo, amounts) }}
                    disabled={disableSendBtn}
                >CREATE LINKS</button>
                </>;
            })()}
        </>
    })()}

    {error &&
    <div className='error-box'>
        Something went wrong:<br/>{error}
    </div>}

    </div>;
};
