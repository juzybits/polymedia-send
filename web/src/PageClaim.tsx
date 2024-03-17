import { useCurrentAccount, useDisconnectWallet, useSuiClient } from '@mysten/dapp-kit';
import { formatBigInt, shortenSuiAddress, validateAndNormalizeSuiAddress } from '@polymedia/suits';
import { useEffect, useState } from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';
import { AppContext } from './App';
import { ZkSendLink } from './lib/zksend';
import { CoinInfo, getCoinInfo } from './utils';

type ListClaimableAssetsReturnType = Awaited<ReturnType<InstanceType<typeof ZkSendLink>['listClaimableAssets']>>;
type BalancesType = ListClaimableAssetsReturnType['balances'];

export const PageClaim: React.FC = () =>
{
    const location = useLocation();
    const isCreator = location.state?.isCreator; // eslint-disable-line

    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutate: disconnect } = useDisconnectWallet();

    const [ link, setLink ] = useState<ZkSendLink>();
    const [ claimableAssets, setClaimableAssets ] = useState<ListClaimableAssetsReturnType>();
    const [ claimableCoinsInfo, setClaimableCoinsInfo ] = useState<CoinInfo[]>();
    const [ inputAddress, setInputAddress ] = useState('');
    const [ claimTxnDigest, setClaimTxnDigest ] = useState<string>();

    const { inProgress, setInProgress, openConnectModal } = useOutletContext<AppContext>();
    const [ errMsg, setErrMsg ] = useState('');

    useEffect(() => {
        loadZkSendLink();
    }, []);

    const loadZkSendLink = async () => {
        const link = await ZkSendLink.fromUrl(window.location.href, {
            client: suiClient,
        });
        setLink(link);
        loadClaimableAssets(link)
    };

    const loadClaimableAssets = async (link: ZkSendLink) => {
        try {
            const assets = await link.listClaimableAssets('0x123'); // dummy address, doesn't matter
            console.debug('assets:', assets);
            setClaimableAssets(assets);
            loadClaimableCoinsInfo(assets.balances);
        } catch(err) {
            setErrMsg(String(err));
        }
    };

    const loadClaimableCoinsInfo = async (balances: BalancesType) => {
        const newClaimableCoinsInfo: CoinInfo[] = [];
        for (const balance of balances) {
            const coinInfo = await getCoinInfo(balance.coinType, suiClient);
            newClaimableCoinsInfo.push(coinInfo);
        }
        setClaimableCoinsInfo(newClaimableCoinsInfo);
    }

    const claimAssets = async (link: ZkSendLink, recipientAddress: string) => {
        setErrMsg('');
        setInProgress(true);
        try {
            const resp = await link.claimAssets(recipientAddress);
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

                <p>Copy and share the link with the person you want to send the assets to.</p>

                <button className='btn' onClick={copyLink}>
                    COPY LINK
                </button>

                {copyMsg && <p>{copyMsg}</p>}

                <p>
                    <u><b>Save your link before leaving this page</b></u>
                </p>

                <p>
                    We don't store claim links. If you don't share or save your link before leaving this page, the assets will be lost.
                </p>
            </div>;
        }

        const claimAddress = currAcct ? currAcct.address : inputAddress;
        const normalizedAddress = validateAndNormalizeSuiAddress(claimAddress);
        const shortAddress = shortenSuiAddress(normalizedAddress);

        // claim was successful
        if (claimTxnDigest) {
            return <div className='success-box'>
                <h1>Success</h1>
                <p>Assets were sent to <span style={{whiteSpace: 'nowrap'}}>{shortAddress}</span></p>
            </div>;
        }

        // assets are loading
        if (!link || !claimableAssets || !claimableCoinsInfo) {
            if (errMsg) {
                return null; // something went wrong on load
            }
            return <h1>Loading...</h1>;
        }

        const claimableBalances = claimableAssets.balances.filter(bal => bal.amount > 0);

        // already claimed
        if (claimableBalances.length === 0) {
            return <>
                <h1>Assets have already been claimed</h1>
                <div>
                    <p>The coins in this link are no longer available.</p>
                </div>
            </>;
        }

        // assets are ready to claim
        return <>
            <h1>
                Found assets
            </h1>

            <div>
            {claimableBalances.map(bal => {
                const coinInfo = claimableCoinsInfo.find(info => info.coinType === bal.coinType);
                if (!coinInfo) {
                    throw new Error('TODO this should never happen');
                }
                const claimableBalancePretty = formatBigInt(bal.amount, coinInfo.decimals, 'compact');
                return <h2 key={bal.coinType}>
                    {claimableBalancePretty} {coinInfo.symbol}
                </h2>
            })}
            </div>

            {!currAcct &&
            <>
                <p>Enter the address where you want to send the assets, or&nbsp;
                    <button className='txt-btn' onClick={openConnectModal} disabled={inProgress}>LOG IN</button>
                    &nbsp;with your wallet to auto-fill.
                </p>

                <input type='text' pattern='^0[xX][a-fA-F0-9]{1,64}$'
                    value={inputAddress} autoFocus disabled={inProgress}
                    onChange={e => { setInputAddress(e.target.validity.valid ? e.target.value : inputAddress) }}
                    placeholder='paste address'
                />
            </>}

            {normalizedAddress &&
            <p>
                Recipient: {shortAddress}
            </p>}

            {normalizedAddress &&
            <button className='btn' onClick={() => { claimAssets(link, normalizedAddress) }} disabled={inProgress}>
                CLAIM ASSETS
            </button>}

            {currAcct &&
            <button className='btn' disabled={inProgress} onClick={() => {disconnect()}}>
                LOG OUT
            </button>}
        </>;

    })()}
    </div>;
}
