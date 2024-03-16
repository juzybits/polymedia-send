import { useCurrentAccount, useDisconnectWallet, useSuiClient } from '@mysten/dapp-kit';
import { formatBigInt, makeSuiExplorerUrl, shortenSuiAddress, validateAndNormalizeSuiAddress } from '@polymedia/suits';
import { useEffect, useState } from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';
import { AppContext } from './App';
import { coinInfo } from './constants';
import { ZkSendLink } from './lib/zksend';

type ListClaimableAssetsReturnType = Awaited<ReturnType<InstanceType<typeof ZkSendLink>['listClaimableAssets']>>;

export const PageClaim: React.FC = () =>
{
    const location = useLocation();
    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutate: disconnect } = useDisconnectWallet();
    const { inProgress, setInProgress, network, openConnectModal } = useOutletContext<AppContext>();
    const [ claimableAssets, setClaimableAssets ] = useState<ListClaimableAssetsReturnType>();
    const [ inputAddress, setInputAddress ] = useState('');
    const [ claimTxnDigest, setClaimTxnDigest ] = useState<string>();
    const [ errMsg, setErrMsg ] = useState('');

    const isCreator = location.state?.isCreator; // eslint-disable-line
    // const createTxnDigest = !isCreator ? null : location.state?.createTxnDigest;

    const claimAddress = currAcct ? currAcct.address : inputAddress;
    const cleanAddress = validateAndNormalizeSuiAddress(claimAddress);
    const shortAddress = shortenSuiAddress(cleanAddress);

    const claimableBalance = !claimableAssets ? BigInt(0)
    : claimableAssets.balances.reduce((total, balance) => {
        return balance.coinType !== coinInfo.coinType
            ? BigInt(0)
            : total + balance.amount;
    }, BigInt(0));
    const claimableBalancePretty = formatBigInt(claimableBalance, coinInfo.decimals, 'compact');

    useEffect(() => {
        loadClaimableAssets();
    }, []);

    const getZkSendLink = async () => {
        return await ZkSendLink.fromUrl(window.location.href, {
            client: suiClient,
        });
    }

    const loadClaimableAssets = async () => {
        try {
            const link = await getZkSendLink();
            const assets = await link.listClaimableAssets('0x123'); // dummy address, doesn't matter
            console.debug('assets:', assets);
            setClaimableAssets(assets);
        } catch(err) {
            setErrMsg(String(err));
        }
    };

    const claimAssets = async () => {
        setErrMsg('');
        if (!cleanAddress) return;

        setInProgress(true);
        document.body.style.cursor = 'wait';
        try {
            const link = await getZkSendLink();
            const resp = await link.claimAssets(cleanAddress);
            console.debug('resp:', resp);

            if (resp.errors) {
                setErrMsg(`Txn digest: ${resp.digest}\nTxn errors: ${JSON.stringify(resp.errors)}`);
            } else {
                setClaimTxnDigest(resp.digest);
                window.scrollTo(0, 0);
            }
        } catch (err) {
            setErrMsg(String(err));
        } finally {
            setInProgress(false);
            document.body.style.cursor = 'default';
        }
    };

    /* Copy link to clipboard */

    const [copyMsg, setCopyMsg] = useState('');

    const showCopyMessage = (message: string): void => {
        setCopyMsg(message);
        setTimeout(() => {setCopyMsg('')}, 3000);
    }

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            showCopyMessage('👍 Link copied');
        } catch (error) {
            showCopyMessage("❌ Oops, didn't work. Please copy the page URL manually.");
        }
    };

    return <div id='page-claim' className='page'>

    {errMsg &&
    <div className='error'>
        Something went wrong:<br/>{errMsg}
    </div>}

    {(() => {

        // creation was successful
        if (isCreator) {
            return <div className='success-box'>
                <h1>Success</h1>

                <p>Copy and share the link with the person you want to ${coinInfo.symbol}.</p>

                <button className='btn' onClick={copyLink}>
                    COPY LINK
                </button>

                {copyMsg && <p>{copyMsg}</p>}

                <p>
                    <span>Save your link before leaving this page</span>
                </p>

                <p>
                        We don't store claim links. If you don't share or save your link before leaving this page, the ${coinInfo.symbol} will be lost.
                </p>

                {/* <p> <a href={makeSuiExplorerUrl(network, 'txblock', createTxnDigest)} rel='noopener noreferrer' target='_blank'>Transaction</a> </p> */}
            </div>;
        }

        // claim was successful
        if (claimTxnDigest) {
            return <div className='success-box'>
                <h1>Success</h1>

                <p>{claimableBalancePretty} ${coinInfo.symbol} was sent to <span style={{whiteSpace: 'nowrap'}}>{shortAddress}</span></p>

                {/* <p>
                    <a href={makeSuiExplorerUrl(network, 'txblock', claimTxnDigest)} rel='noopener noreferrer' target='_blank'>
                        view transaction
                    </a>
                </p> */}
            </div>;
        }

        // assets are loading
        if (!claimableAssets) {
            if (errMsg) {
                return null; // something went wrong on load
            }
            return <h1>Loading...</h1>;
        }

        // already claimed
        if (claimableBalance === BigInt(0)) {
            return <>
                <h1>${coinInfo.symbol} has already been claimed</h1>
                <div>
                    <p>The ${coinInfo.symbol} in this link are no longer available.</p>
                </div>
            </>;
        }

        // assets are ready to claim
        return <>
            <h1>
                Found {claimableBalancePretty} ${coinInfo.symbol}
            </h1>

            {!currAcct &&
            <>
                <p>Enter the address where you want to send the ${coinInfo.symbol},<br/>or&nbsp;
                    <button className='btn' onClick={openConnectModal}>LOG IN</button>
                    &nbsp;with your wallet to auto-fill.
                </p>

                <input type='text' pattern='^0[xX][a-fA-F0-9]{1,64}$'
                    value={inputAddress} autoFocus disabled={inProgress}
                    onChange={e => { setInputAddress(e.target.validity.valid ? e.target.value : inputAddress) }}
                    placeholder='paste address'
                />
            </>}

            {cleanAddress &&
            <p>
                Recipient: {shortAddress}
            </p>}

            {cleanAddress &&
            <button className='btn' onClick={claimAssets} disabled={inProgress}>
                CLAIM ${coinInfo.symbol}
            </button>}

            {currAcct &&
            <button className='btn' disabled={inProgress} onClick={() => {disconnect()}}>
                LOG OUT
            </button>}
        </>;

    })()}
    </div>;
}
