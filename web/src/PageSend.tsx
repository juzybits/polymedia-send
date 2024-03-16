import { useCurrentAccount, useSignTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { CoinBalance } from '@mysten/sui.js/client';
import { convertNumberToBigInt, formatBigInt, formatNumber, shortenSuiAddress } from '@polymedia/suits';
import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { AppContext } from './App';
import { ZkSendLinkBuilder } from './lib/zksend';
import { CoinInfo, getCoinInfo } from './utils';

export const PageSend: React.FC = () =>
{
    const navigate = useNavigate();

    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutateAsync: signTransactionBlock } = useSignTransactionBlock();

    const [ userBalances, setUserBalances ] = useState<CoinBalance[]>();
    const [ userCoinsInfo, setUserCoinsInfo ] = useState<CoinInfo[]>();
    const [ chosenBalance, setChosenBalance ] = useState<CoinBalance>();
    const [ amount, setAmount ] = useState('');

    const { inProgress, setInProgress, openConnectModal } = useOutletContext<AppContext>();
    const [ errMsg, setErrMsg ] = useState('');

    useEffect(() => {
        loadUserBalances();
    }, [currAcct, suiClient]);

    const loadUserBalances = async () => {
        if (!currAcct) {
            setUserBalances(undefined);
        } else {
            const newUserBalances = await suiClient.getAllBalances({ owner: currAcct.address });
            setUserBalances(newUserBalances);
            loadUserCoinsInfo(newUserBalances);
        }
    };

    const loadUserCoinsInfo = async (balances: CoinBalance[]) => {
        let newUserCoinsInfo: CoinInfo[] = [];
        for (const balance of balances) {
            let coinInfo = await getCoinInfo(balance.coinType, suiClient);
            newUserCoinsInfo.push(coinInfo);
        }
        setUserCoinsInfo(newUserCoinsInfo);
    };

    const SelectCoin: React.FC = () => {
        const [ showCoins, setShowCoins ] = useState(false);
        const [ searchCoin, setSearchCoin ] = useState(''); // TODO

        return <div className='dropdown'>
            <input className='dropdown-input'
                type='text'
                value={searchCoin}
                onChange={(e) => setSearchCoin(e.target.value)}
                onFocus={() => { setShowCoins(true) }}
                placeholder='choose a coin'
                spellCheck='false' autoCorrect='off' autoComplete='off'
            />
            {(() => {
                if (!showCoins) {
                    return null;
                }
                if (typeof userBalances === 'undefined') {
                    return <div className='dropdown-options'>
                        <div>Loading...</div>
                    </div>
                }
                return <div className='dropdown-options'>
                    {userBalances.map(bal =>
                    <div className='dropdown-option' key={bal.coinType}
                        onClick={() => { setChosenBalance(bal) }}>
                        {shortenSuiAddress(bal.coinType)}
                    </div>)}
                </div>;
            })()}
        </div>;
    }

    const createLink = async (coinType: string, amountWithDec: bigint) => {
        setErrMsg('');
        if (!currAcct) return;

        setInProgress(true);
        document.body.style.cursor = 'wait';
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
                document.body.style.cursor = 'default'; // need to do this before redirect
                navigate('/claim#' + secret, {
                    state: { isCreator: true, /* createTxnDigest: resp.digest */ }
                });
            }
        } catch (err) {
            setErrMsg(String(err));
        }
        finally {
            setInProgress(false);
            document.body.style.cursor = 'default';
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
            <SelectCoin />

            {(() => {
                if (!chosenBalance) {
                    return <></>;
                }

                if (!userCoinsInfo) {
                    return <div>Loading coin info...</div>;
                }

                const coinInfo = userCoinsInfo.find(info => info.coinType === chosenBalance.coinType);

                if (!coinInfo) {
                    return <div className='error-box'>
                        Couldn't find coin info for ${shortenSuiAddress(chosenBalance.coinType)}
                    </div>
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

                {errMsg &&
                <div className='error-box'>
                    Something went wrong:<br/>{errMsg}
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

    </div>;
};
