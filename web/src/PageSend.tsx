import { useCurrentAccount, useSignTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { CoinBalance } from '@mysten/sui.js/client';
import { formatBigInt, formatNumber } from '@polymedia/suits';
import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { AppContext } from './App';
import { coinInfo } from './constants';
import { ZkSendLinkBuilder } from './lib/zksend';

export const PageSend: React.FC = () =>
{
    const navigate = useNavigate();
    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutateAsync: signTransactionBlock } = useSignTransactionBlock();
    const { inProgress, setInProgress, openConnectModal } = useOutletContext<AppContext>();
    const [ userBalance, setUserBalance ] = useState<CoinBalance>();
    const [ amount, setAmount ] = useState('');
    const [ errMsg, setErrMsg ] = useState('');

    useEffect(() => {
        loadUserBalance();
    }, [currAcct, suiClient]);

    const loadUserBalance = async () => {
        if (!currAcct) {
            setUserBalance(undefined);
        } else {
            const newBalance = await suiClient.getBalance({
                owner: currAcct.address,
                coinType: coinInfo.coinType,
            });
            setUserBalance(newBalance);
        }
    };

    const createLink = async () => {
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

            link.addClaimableBalance(coinInfo.coinType, amountWithDec);

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

    // Validate amount
    const amountNum = amount === '.' ? 0 : Number(amount);
    const amountWithDec = BigInt(amountNum * (10 ** coinInfo.decimals));
    const amountErr = (() => {
        if (amount === '' || amount === '.') {
            return '';
        }
        if (amountNum === 0) {
            return 'amount can\'t be 0';
        }
        if (userBalance) {
            const userBalanceWithDec = BigInt(userBalance.totalBalance);
            if (amountWithDec > userBalanceWithDec) {
                return 'not enough balance';
            }
        }
        return '';
    })();

    const disableSendBtn = amount === '' || amount === '.' || amountErr !== '' || inProgress;
    return <div id='page-send' className='page'>
        <h1>Create claim link</h1>
        <p>Send coins to anyone simply by sharing a link.</p>
        {!currAcct
        ? <div>
            <br/>
            <p>Connect your Sui wallet to get started.</p>
            <button onClick={openConnectModal} className='btn'>LOG IN</button>
        </div>
        : <div>
            <input type='text' inputMode='numeric' pattern={`^[0-9]*\\.?[0-9]{0,${coinInfo.decimals}}$`}
                value={amount} autoFocus disabled={inProgress}
                onChange={e => { setAmount(e.target.validity.valid ? e.target.value : amount) }}
                onKeyDown={e => { if (e.key === 'Enter' && !disableSendBtn) { createLink(); } }}
                placeholder='enter amount'
            />

            <p style={{padding: '0'}}>
                {typeof userBalance === 'undefined'
                ? <>Loading balance...</>
                : <>Your balance: {formatBigInt(BigInt(userBalance.totalBalance), coinInfo.decimals, 'compact')}</>}
            </p>

            <p style={{padding: '0'}}>
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
                onClick={createLink}
                disabled={disableSendBtn}
            >CREATE LINK</button>
        </div>}
    </div>;
};
