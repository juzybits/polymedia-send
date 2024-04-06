import { useCurrentAccount, useDisconnectWallet, useSuiClient } from '@mysten/dapp-kit';
import { formatBigInt, shortenSuiAddress, validateAndNormalizeSuiAddress } from '@polymedia/suits';
import { useEffect, useState } from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';
import { AppContext } from './App';
import { ErrorBox } from './lib/ErrorBox';
import { CoinInfo, getCoinInfo } from './lib/getCoinInfo';
import { useZkBagContract } from './lib/useZkBagContract';
import { ZkSendLink } from './lib/zksend/claim';

type BalancesType = {
    coinType: string;
    amount: bigint;
}[];

export const PageClaim: React.FC = () =>
{
    const location = useLocation();
    const createdLinkUrl: string|undefined = location.state?.createdLinkUrl; // eslint-disable-line
    const isCreator = !!createdLinkUrl;

    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutate: disconnect } = useDisconnectWallet();

    const { inProgress, setInProgress, openConnectModal, network } = useOutletContext<AppContext>();
    const zkBagContract = useZkBagContract();

    const [ errMsg, setErrMsg ] = useState('');
    const [ link, setLink ] = useState<ZkSendLink>(); // loaded on init
    const [ claimableBalances, setClaimableBalances ] = useState<BalancesType>(); // loaded on init
    const [ claimableCoinsInfo, setClaimableCoinsInfo ] = useState<CoinInfo[]>(); // loaded on init
    const [ chosenAddress, setChosenAddress ] = useState(''); // chosen by user
    const [ claimSuccessful, setClaimSuccessful ] = useState<boolean>();

    useEffect(() => {
        const initialize = async () => {
            try {
                const link = await loadZkSendLink();
                setLink(link);

                const balances =  loadClaimableBalances(link);
                setClaimableBalances(balances);

                const coinInfos = await loadClaimableCoinsInfo(balances);
                setClaimableCoinsInfo(coinInfos);
            } catch(err) {
                setErrMsg(String(err));
            }
        }
        const loadZkSendLink = async (): Promise<ZkSendLink> => {
            const link = await ZkSendLink.fromUrl(createdLinkUrl ?? window.location.href, {
                claimApi: '/proxy',
                client: suiClient,
                network,
                host: window.location.origin,
                path: '/claim',
                contract: zkBagContract,
            });
            return link;
        };
        const loadClaimableBalances = (link: ZkSendLink): BalancesType => {
            const assets = link.assets;
            return (!assets || link.claimed === true) ? [] : assets.balances;
        };
        const loadClaimableCoinsInfo = async (balances: BalancesType): Promise<CoinInfo[]> => {
            const promises = balances.map(bal => getCoinInfo(bal.coinType, suiClient));
            const infos = await Promise.all(promises);
            return infos;
        }
        initialize();
    }, [suiClient]);

    const claimAssets = async (link: ZkSendLink, recipientAddress: string) => {
        setErrMsg('');
        setInProgress(true);
        try {
            const resp = await link.claimAssets(recipientAddress);
            console.debug('resp:', resp);
            if (resp.errors) {
                setErrMsg(`Txn digest: ${resp.digest}\nTxn errors: ${JSON.stringify(resp.errors)}`);
            } else {
                setClaimSuccessful(true);
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

    const copyLink = async (linkUrl: string) => {
        try {
            await navigator.clipboard.writeText(linkUrl);
            showCopyMessage('👍 Link copied');
        } catch (error) {
            showCopyMessage("❌ Oops, didn't work. Please copy the page URL manually.");
        }
    };

    const linkUrlOriginal = createdLinkUrl ?? window.location.href; // TODO include network if not mainnet
    const linkUrl = linkUrlOriginal.includes('localhost:1234')
        ? linkUrlOriginal.replace('http://localhost:1234/', 'https://dev.polymedia-send.pages.dev/')
        : linkUrlOriginal;
    const isContractLess = !linkUrl.includes('#$');
    return <div id='page'>

    <ErrorBox err={errMsg} />

    {(() => {

        // creation was successful
        if (isCreator) {
            return <div className='success-box'>
                <h1>Success</h1>

                <p>Copy and share the link with the person you want to send the assets to.</p>

                <button className='btn' onClick={() => {
                    copyLink(linkUrl);
                }}>
                    COPY LINK
                </button>
                {copyMsg && <div>{copyMsg}</div>}

                {isContractLess && <>
                    <p>
                        <u><b>Save your link before leaving this page</b></u>
                    </p>

                    <p>
                        We don't store claim links. If you don't share or save your link before leaving this page, the assets will be lost.
                    </p>
                </>}
            </div>;
        }

        const claimAddress = currAcct ? currAcct.address : chosenAddress;
        const normalizedAddress = validateAndNormalizeSuiAddress(claimAddress);
        const shortAddress = shortenSuiAddress(normalizedAddress);

        // claim was successful
        if (claimSuccessful) {
            return <div className='success-box'>
                <h1>Success</h1>
                <p>Assets were sent to <span style={{whiteSpace: 'nowrap'}}>{shortAddress}</span></p>
            </div>;
        }

        // assets are loading
        if (!link || !claimableBalances || !claimableCoinsInfo) {
            if (errMsg) {
                return null; // something went wrong on load
            }
            return <h1>Loading...</h1>;
        }

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
                if (!coinInfo) { // will never be undefined, otherwise an error would have been thrown already
                    return null;
                }
                const claimableBalancePretty = formatBigInt(bal.amount, coinInfo.decimals, 'compact');
                return <h2 key={bal.coinType}>{claimableBalancePretty} {coinInfo.symbol}</h2>
            })}
            </div>

            {!currAcct &&
            <>
                <p>Enter the address where you want to send the assets, or&nbsp;
                    <button className='txt-btn' onClick={openConnectModal} disabled={inProgress}>LOG IN</button>
                    &nbsp;with your wallet to auto-fill.
                </p>

                <input type='text' pattern='^0[xX][a-fA-F0-9]{1,64}$'
                    value={chosenAddress} autoFocus disabled={inProgress}
                    onChange={e => { setChosenAddress(e.target.validity.valid ? e.target.value : chosenAddress) }}
                    placeholder='paste address'
                />
            </>}

            {normalizedAddress && <>
                <p>
                    Recipient: {shortAddress}
                </p>
            </>}

            <div className='btn-group'>
                {normalizedAddress &&
                <button className='btn' onClick={() => { claimAssets(link, normalizedAddress) }} disabled={inProgress}>
                    CLAIM ASSETS
                </button>}

                {currAcct &&
                <button className='btn' disabled={inProgress} onClick={() => {disconnect()}}>
                    LOG OUT
                </button>}
            </div>
        </>;

    })()}
    </div>;
}
