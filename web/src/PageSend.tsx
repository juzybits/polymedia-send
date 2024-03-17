import { useCurrentAccount, useSignTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { CoinBalance } from '@mysten/sui.js/client';
import { convertNumberToBigInt, formatBigInt, formatNumber } from '@polymedia/suits';
import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { AppContext } from './App';
import { ZkSendLinkBuilder } from './lib/zksend';
import { CoinInfo, getCoinInfo } from './utils';
import { SelectCoin } from './components/SelectCoin';

export const PageSend: React.FC = () =>
{
    const navigate = useNavigate();

    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutateAsync: signTransactionBlock } = useSignTransactionBlock();

    const { inProgress, setInProgress, openConnectModal } = useOutletContext<AppContext>();
    const [ errMsg, setErrMsg ] = useState('');
    const [ userBalances, setUserBalances ] = useState<CoinBalance[]>(); // loaded on wallet connect
    const [ chosenBalance, setChosenBalance ] = useState<CoinBalance>(); // chosen by user (dropdown)
    const [ coinInfo, setCoinInfo ] = useState<CoinInfo>(); // loaded based on chosenBalance
    const [ amount, setAmount ] = useState(''); // chosen by user (numeric input)

    useEffect(() => {
        const initialize = async () => {
            setUserBalances(undefined);
            setChosenBalance(undefined);
            setAmount('');
            setErrMsg('');
            if (!currAcct) {
                return;
            }
            try {
                const balances = await loadUserBalances(currAcct.address);
                setUserBalances(balances);
            } catch(err) {
                setErrMsg(String(err));
            }
        }
        const loadUserBalances = async (owner: string): Promise<CoinBalance[]> => {
            const balances = await suiClient.getAllBalances({ owner });
            const nonZeroBalances = balances.filter(bal => BigInt(bal.totalBalance) > 0n);
            return nonZeroBalances;
        };
        initialize();
    }, [currAcct, suiClient]);

    useEffect(() => {
        const loadCoinInfo = async () => {
            setCoinInfo(undefined);
            if (!chosenBalance) {
                return;
            }
            try {
                const info = await getCoinInfo(chosenBalance.coinType, suiClient);
                setCoinInfo(info);
            } catch (err) {
                setErrMsg(String(err));
            }
        };
        loadCoinInfo();
    }, [chosenBalance, suiClient]);

    const createLink = async (coinType: string, amountWithDec: bigint) => {
        setErrMsg('');
        if (!currAcct) return;

        setInProgress(true);
        try {
                const link = new ZkSendLinkBuilder({
                sender: currAcct.address,
                host: window.location.origin,
                path: '/claim',
                client: suiClient,
            });

            link.addClaimableBalance(coinType, amountWithDec);

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

    return <div id='page-send' className='page'>

    <h1>Send</h1>

    <h2>Create a single claim link</h2>

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

                // Validate amount
                const amountNum = amount === '.' ? 0 : Number(amount);
                const amountWithDec = convertNumberToBigInt(amountNum, coinInfo.decimals);
                const amountErr = (() => {
                    if (amount === '' || amount === '.') {
                        return '';
                    }
                    if (amountNum === 0) {
                        return 'amount can\'t be 0';
                    }
                    const userBalanceWithDec = BigInt(chosenBalance.totalBalance);
                    if (amountWithDec > userBalanceWithDec) {
                        return 'not enough balance';
                    }
                    return '';
                })();

                const disableSendBtn = amount === '' || amount === '.' || amountErr !== '' || inProgress;

                return <>
                <input type='text' inputMode='numeric' pattern={`^[0-9]*\\.?[0-9]{0,${coinInfo.decimals}}$`}
                    value={amount} disabled={inProgress}
                    onChange={e => { setAmount(e.target.validity.valid ? e.target.value : amount) }}
                    onKeyDown={e => { if (e.key === 'Enter' && !disableSendBtn) { createLink(coinInfo.coinType, amountWithDec) } }}
                    placeholder='enter amount'
                />

                <p>
                    Your balance: {formatBigInt(BigInt(chosenBalance.totalBalance), coinInfo.decimals, 'compact')}
                </p>

                <p>
                    Amount to send: {formatNumber(amountNum, 'compact')} {coinInfo.symbol}
                </p>

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

    {errMsg &&
    <div className='error-box'>
        Something went wrong:<br/>{errMsg}
    </div>}

    </div>;
};
