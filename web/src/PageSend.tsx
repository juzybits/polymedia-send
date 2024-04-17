import { useCurrentAccount, useSignTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { CoinBalance } from '@mysten/sui.js/client';
import { useCoinMetas } from '@polymedia/coinmeta-react';
import { convertNumberToBigInt, formatBigInt, formatNumber } from '@polymedia/suits';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { AppContext } from './App';
import { Button } from './lib/Button';
import { ErrorBox } from './lib/ErrorBox';
import { LogInToContinue } from './lib/LogInToContinue';
import { SelectCoin } from './lib/SelectCoin';
import { useCoinBalances } from './lib/useCoinBalances';
import { useIsSupportedWallet } from './lib/useIsSupportedWallet';
import { useZkBagContract } from './lib/useZkBagContract';
import { ZkSendLinkBuilder } from './lib/zksend/builder';

const SEND_MODE = () => 'contract-based';

export const PageSend: React.FC = () =>
{
    const navigate = useNavigate();

    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutateAsync: signTransactionBlock } = useSignTransactionBlock();

    const { inProgress, setInProgress, network, setModalContent } = useOutletContext<AppContext>();
    const isSupportedWallet = useIsSupportedWallet();
    const zkBagContract = useZkBagContract();

    const [ errMsg, setErrMsg ] = useState<string|null>(null);
    const [ chosenBalance, setChosenBalance ] = useState<CoinBalance>(); // dropdown
    const [ chosenAmount, setChosenAmount ] = useState(''); // numeric input

    // fetch all balances in the user's wallet
    const { userBalances, error: errBalances } = useCoinBalances(suiClient, currAcct);
    // extract the coin types from the user balances
    const allCoinTypes = useMemo(() => userBalances?.map(bal => bal.coinType), [userBalances]);
    // get the CoinMetadata for each coin type
    const { coinMetas, isLoadingCoinMetas, errorCoinMetas } = useCoinMetas(suiClient, allCoinTypes);
    // pick the CoinMetadata for selected balance
    const coinMeta = !chosenBalance ? null : coinMetas.get(chosenBalance.coinType);

    useEffect(() => {
        const resetState = () => {
            setInProgress(false);
            setErrMsg(null);
            setChosenBalance(undefined);
            setChosenAmount('');
        }
        resetState();
    }, [currAcct, suiClient]);

    const createLink = async (coinType: string, amountWithDec: bigint) => {
        setErrMsg(null);

        if (!currAcct)
            return;

        setInProgress(true);
        try {
            const link = new ZkSendLinkBuilder({
                host: window.location.origin,
                path: '/claim',
                // keypair?: Keypair;
                network: network,
                client: suiClient,
                sender: currAcct.address,
                // redirect?: ZkSendLinkRedirect;
                contract: SEND_MODE() === 'contract-based' ? zkBagContract : null,
            });

            link.addClaimableBalance(coinType, amountWithDec);

            const txb = await link.createSendTransaction();

            const signedTxb = await signTransactionBlock({
                transactionBlock: txb,
            });

            setModalContent('⏳ Creating link...');

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
                const url = link.getLink();
                const secret = url.split('#')[1];
                navigate('/claim#' + secret, {
                    state: { createdLinkUrl: url }
                });
            }
        } catch (err) {
            setErrMsg(String(err));
        } finally {
            setInProgress(false);
            setModalContent(null);
        }
    };

    const error = errMsg ?? errBalances ?? errorCoinMetas ?? null;

    return <div id='page-content'>

    <h1>Create one link</h1>

    {(() => {
        if (!isSupportedWallet) {
            return <p>This wallet is not supported.</p>;
        }

        if (!currAcct) {
            return <LogInToContinue />;
        }

        if (!userBalances) {
            return <p>Loading balances...</p>;
        }

        return <>
            <SelectCoin
                userBalances={userBalances}
                chosenBalance={chosenBalance}
                coinMetas={coinMetas}
                setChosenBalance={setChosenBalance}
                inProgress={inProgress}
            />

            {(() => {
                if (!chosenBalance) {
                    return <></>;
                }

                if (isLoadingCoinMetas || !coinMeta) {
                    return <p>Loading coin info...</p>;
                }

                // Validate amount
                const amountNum = chosenAmount === '.' ? 0 : Number(chosenAmount);
                const amountWithDec = convertNumberToBigInt(amountNum, coinMeta.decimals);
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
                    <input type='text' inputMode='numeric' pattern={`^[0-9]*\\.?[0-9]{0,${coinMeta.decimals}}$`}
                        value={chosenAmount} disabled={inProgress}
                        onChange={e => { setChosenAmount(e.target.validity.valid ? e.target.value : chosenAmount) }}
                        onKeyDown={e => { if (e.key === 'Enter' && !disableSendBtn) { createLink(chosenBalance.coinType, amountWithDec) } }}
                        placeholder='enter amount'
                    />
                </div>

                <div className='tight'>
                    <p>
                        Amount to send: {formatNumber(amountNum, 'compact')} {coinMeta.symbol}
                    </p>

                    <p>
                        Your balance: {formatBigInt(BigInt(chosenBalance.totalBalance), coinMeta.decimals, 'compact')}
                    </p>
                </div>

                {amountErr &&
                <div className='error-box'>
                    Error: {amountErr}
                </div>}

                <Button
                    disabled={disableSendBtn}
                    onClick={() => { createLink(chosenBalance.coinType, amountWithDec)}}
                >CREATE LINK</Button>
                </>;
            })()}
        </>
    })()}

    <ErrorBox err={error} />

    </div>;
};
