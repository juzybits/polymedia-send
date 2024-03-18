import { useCurrentAccount, useSignTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { CoinBalance } from '@mysten/sui.js/client';
import { convertNumberToBigInt, formatBigInt, formatNumber } from '@polymedia/suits';
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

    const createLinks = async (coinInfo: CoinInfo, linkValues: LinkValue[]) => {
        if (!currAcct) return;

        const options: ZkSendLinkBuilderOptions = {
            sender: currAcct.address,
            host: window.location.origin,
            path: '/claim',
            client: suiClient,
        };

        const amounts = linkValues.flatMap(lv => Array(lv.count).fill(
            convertNumberToBigInt(lv.value, coinInfo.decimals)
        ));

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
                const linkValues = parseLinksAmounts(chosenAmounts);
                const totalValue = linkValues.reduce((total, lv) => total + (lv.count * lv.value), 0);
                const disableSendBtn = totalValue === 0 || inProgress;

                return <>

                <p>You can create up to 300 links with one transaction.</p>

                <textarea
                    value={chosenAmounts}
                    disabled={inProgress}
                    onChange={e => {
                        const newValue = e.target.value.replace(/\./g, '');
                        setChosenAmounts(newValue);
                    }}
                    placeholder='Enter "[LINKS] x [AMOUNT]". For example: "50 x 1000, 25 x 5000".'
                />

                <div>
                    Total amount to send: {formatNumber(totalValue, 'compact')} {coinInfo.symbol}
                    {linkValues.map((lv, idx) => <p key={idx}>
                        {lv.count} links with {lv.value} {coinInfo.symbol}
                    </p>)}
                </div>

                <p>
                    Your balance: {formatBigInt(BigInt(chosenBalance.totalBalance), coinInfo.decimals, 'compact')}
                </p>

                {/* {amountsErr &&
                <div className='error-box'>
                    Error: {amountsErr}
                </div>} */}

                <button
                    className='btn'
                    onClick={ () => { createLinks(coinInfo, linkValues) }}
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

type LinkValue = {
    count: number;
    value: number;
};

const linksAmountsPattern = /(\d+)\s*[xX*]\s*(\d+)/gi;

function parseLinksAmounts(input: string): LinkValue[] {
    const linkValues: LinkValue[] = [];

    let match;
    while ((match = linksAmountsPattern.exec(input)) !== null) {
        const count = parseInt(match[1], 10);
        const value = parseInt(match[2], 10);
        linkValues.push({ count, value });
    }

    return linkValues;
}
