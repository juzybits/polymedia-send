import { useCurrentAccount, useSignAndExecuteTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { CoinBalance } from '@mysten/sui.js/client';
import { ZkSendLinkBuilder as ZkSendLinkBuilderV4 } from '@mysten/zksend';
import { convertNumberToBigInt, formatBigInt, formatNumber } from '@polymedia/suits';
import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { AppContext } from './App';
import { ErrorBox } from './lib/ErrorBox';
import { SelectCoin } from './lib/SelectCoin';
import { useCoinBalances } from './lib/useCoinBalances';
import { useCoinInfo } from './lib/useCoinInfo';
import { ZkSendLinkBuilder as ZkSendLinkBuilderV2 } from './lib/zksend';

export const PageSend: React.FC = () =>
{
    const navigate = useNavigate();

    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutateAsync: signAndExecuteTxb } = useSignAndExecuteTransactionBlock();

    const { inProgress, setInProgress, openConnectModal, network, zkSendVersion } = useOutletContext<AppContext>();
    const [ errMsg, setErrMsg ] = useState<string>();
    const [ chosenBalance, setChosenBalance ] = useState<CoinBalance>(); // dropdown
    const [ chosenAmount, setChosenAmount ] = useState(''); // numeric input

    const { userBalances, error: errBalances } = useCoinBalances(suiClient, currAcct);
    const { coinInfo, error: errCoinInfo } = useCoinInfo(suiClient, chosenBalance);

    useEffect(() => {
        const resetState = () => {
            setInProgress(false);
            setErrMsg(undefined);
            setChosenBalance(undefined);
            setChosenAmount('');
        }
        resetState();
    }, [currAcct, suiClient]);

    const createLink = async (coinType: string, amountWithDec: bigint) => {
        setErrMsg(undefined);

        if (!currAcct)
            return;

        if (zkSendVersion === 4 && network !== 'mainnet') {
            setErrMsg(`Contract-based zkSend is only available on mainnet, but you are on ${network}`)
            return;
        }

        setInProgress(true);
        try {
            const link = zkSendVersion === 2
            ? new ZkSendLinkBuilderV2({
                sender: currAcct.address,
                host: window.location.origin,
                path: '/claim',
                client: suiClient,
            })
            : new ZkSendLinkBuilderV4({
                host: window.location.origin,
                path: '/claim',
                // keypair?: Keypair;
                // network?: 'mainnet' | 'testnet';
                client: suiClient,
                sender: currAcct.address,
                // redirect?: ZkSendLinkRedirect;
                // contract?: ZkBagContractOptions | null;
            });

            link.addClaimableBalance(coinType, amountWithDec);

            const url = link.getLink();
            console.debug('url: ', url);

            const txb = await link.createSendTransaction();
            const resp = await signAndExecuteTxb({
                transactionBlock: txb,
                options: { showEffects: true }
            });
            console.debug('resp:', resp);

            if (resp.errors || resp.effects?.status.status !== 'success') {
                setErrMsg(`Txn digest: ${resp.digest}\n`
                    + `Txn status: ${resp.effects?.status.status}\n`
                    + `Txn errors: ${JSON.stringify(resp.errors)}`);
            } else {
                const secret = url.split('#')[1];
                navigate('/claim#' + secret, {
                    state: { isCreator: true }
                });
            }
        } catch (err) {
            setErrMsg(String(err));
        }
        finally {
            setInProgress(false);
        }
    };

    const isMobile = /mobile/i.test(navigator.userAgent);
    const error = errMsg ?? errBalances ?? errCoinInfo ?? null;

    return <div id='page-send'>

    <h1>Create one link</h1>

    {(() => {
        if (isMobile) {
            return <p>Please use a desktop wallet to create links.</p>;
        }

        if (!currAcct) {
            return <div>
                <p>Connect your Sui wallet to get started.</p>
                <button onClick={openConnectModal} className='btn'>LOG IN</button>
            </div>;
        }

        if (!userBalances) {
            return <p>Loading balances...</p>;
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

                // Validate amount
                const amountNum = chosenAmount === '.' ? 0 : Number(chosenAmount);
                const amountWithDec = convertNumberToBigInt(amountNum, coinInfo.decimals);
                const amountErr = (() => {
                    if (chosenAmount === '' || chosenAmount === '.') {
                        return '';
                    }
                    if (amountNum === 0) {
                        return 'Amount can\'t be 0';
                    }
                    const userBalanceWithDec = BigInt(chosenBalance.totalBalance);
                    if (amountWithDec > userBalanceWithDec) {
                        return 'Not enough balance';
                    }
                    return '';
                })();

                const disableSendBtn = chosenAmount === '' || chosenAmount === '.' || amountErr !== '' || inProgress;

                return <>
                <div>
                    <input type='text' inputMode='numeric' pattern={`^[0-9]*\\.?[0-9]{0,${coinInfo.decimals}}$`}
                        value={chosenAmount} disabled={inProgress}
                        onChange={e => { setChosenAmount(e.target.validity.valid ? e.target.value : chosenAmount) }}
                        onKeyDown={e => { if (e.key === 'Enter' && !disableSendBtn) { createLink(coinInfo.coinType, amountWithDec) } }}
                        placeholder='enter amount'
                    />
                </div>

                <div className='tight'>
                    <p>
                        Amount to send: {formatNumber(amountNum, 'compact')} {coinInfo.symbol}
                    </p>

                    <p>
                        Your balance: {formatBigInt(BigInt(chosenBalance.totalBalance), coinInfo.decimals, 'compact')}
                    </p>
                </div>

                {amountErr &&
                <div className='error-box'>
                    Error: {amountErr}
                </div>}

                <button
                    className='btn'
                    onClick={ () => { createLink(coinInfo.coinType, amountWithDec) }}
                    disabled={disableSendBtn}
                >CREATE LINK</button>
                </>;
            })()}
        </>
    })()}

    <ErrorBox err={error} />

    </div>;
};
