import { useCurrentAccount, useDisconnectWallet, useSuiClient } from "@mysten/dapp-kit";
import { normalizeStructTag } from "@mysten/sui/utils";
import { useCoinMetas } from "@polymedia/coinmeta-react";
import { formatBalance, shortenAddress, validateAndNormalizeAddress } from "@polymedia/suitcase-core";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { Button } from "./lib/Button";
import { ErrorBox } from "./lib/ErrorBox";
import { ZkSendLink } from "./lib/zksend";

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

    const { inProgress, setInProgress, openConnectModal, setModalContent } = useOutletContext<AppContext>();

    const [ errMsg, setErrMsg ] = useState<string|null>(null);
    const [ link, setLink ] = useState<ZkSendLink>(); // loaded on init
    const [ claimableBalances, setClaimableBalances ] = useState<BalancesType>(); // loaded on init
    const [ chosenAddress, setChosenAddress ] = useState(""); // chosen by user
    const [ claimSuccessful, setClaimSuccessful ] = useState<boolean>();

    const allCoinTypes = useMemo(() =>
        claimableBalances?.map(bal => bal.coinType)
    , [claimableBalances]);
    const { coinMetas, errorCoinMetas }
        = useCoinMetas(suiClient, allCoinTypes);

    useEffect(() => {
        const initialize = async () => {
            try {
                const link = await loadZkSendLink();
                setLink(link);

                const balances = await loadClaimableBalances(link);
                setClaimableBalances(balances);
            } catch(err) {
                setErrMsg(String(err));
            }
        };
        const loadZkSendLink = async (): Promise<ZkSendLink> => {
            const link = await ZkSendLink.fromUrl(createdLinkUrl ?? window.location.href, {
                client: suiClient,
            });
            return link;
        };
        const loadClaimableBalances = async (link: ZkSendLink): Promise<BalancesType> => {
            const assets = await link.listClaimableAssets("0x123"); // address doesn't matter
            const balances = assets.balances.filter(bal => bal.amount > 0);
            return balances;
        };
        initialize();
    }, [suiClient]);

    const claimAssets = async (link: ZkSendLink, recipientAddress: string) => {
        setErrMsg(null);
        setInProgress(true);
        setModalContent("⏳ Claiming assets...");
        try {
            const resp = await link.claimAssets(recipientAddress);
            console.debug("resp:", resp);
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
            setModalContent(null);
        }
    };

    /* Copy link to clipboard */

    const [copyMsg, setCopyMsg] = useState("");

    const showCopyMessage = (message: string): void => {
        setCopyMsg(message);
        setTimeout(() => {setCopyMsg("");}, 3000);
    };

    const copyLink = async (linkUrl: string) => {
        try {
            await navigator.clipboard.writeText(linkUrl);
            showCopyMessage("👍 Link copied");
        } catch (_error) {
            showCopyMessage("❌ Oops, didn't work. Please copy the page URL manually.");
        }
    };

    const linkUrl = createdLinkUrl ?? window.location.href; // TODO include network if not mainnet
    return <div id="page-content">

    <ErrorBox err={errMsg ?? errorCoinMetas} />

    {(() => {

        // creation was successful
        if (isCreator) {
            return <div className="success-box">
                <h1>Success</h1>

                <p>Copy and share the link with the person you want to send the assets to.</p>

                <Button onClick={() => { copyLink(linkUrl); }}>
                    COPY LINK
                </Button>
                {copyMsg && <div>{copyMsg}</div>}

                <p>
                    <u><b>Save your link before leaving this page</b></u>
                </p>

                <p>
                    We don't store claim links. If you don't share or save your link before leaving this page, the assets will be lost.
                </p>
            </div>;
        }

        const claimAddress = currAcct ? currAcct.address : chosenAddress;
        const normalizedAddress = validateAndNormalizeAddress(claimAddress);
        const shortAddress = shortenAddress(normalizedAddress);

        // claim was successful
        if (claimSuccessful) {
            return <div className="success-box">
                <h1>Success</h1>
                <p>Assets were sent to <span style={{whiteSpace: "nowrap"}}>{shortAddress}</span></p>
            </div>;
        }

        // assets are loading
        if (!link || !claimableBalances || !coinMetas) {
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
                Found assets!
            </h1>

            <div>
            {claimableBalances.map(bal => {
                const coinMeta = coinMetas.get(normalizeStructTag(bal.coinType));
                if (!coinMeta) {
                    return null;
                }
                const claimableBalancePretty = formatBalance(bal.amount, coinMeta.decimals, "compact");
                return <div key={bal.coinType}>
                    <img src={coinMeta.iconUrl ?? ""} height="80"
                        style={{borderRadius: "1rem", marginTop: "1rem"}}  />
                    <h2 key={bal.coinType}
                        style={{fontSize: "1.8rem", marginBottom: "1rem"}}>
                        {claimableBalancePretty} {coinMeta.symbol}
                    </h2>
                </div>;
            })}
            </div>

            {!currAcct &&
            <>
                <p>Enter the address where you want to send the assets, or&nbsp;
                    <Button className="txt-btn" onClick={openConnectModal}>LOG IN</Button>
                    &nbsp;with your wallet to auto-fill.
                </p>

                <input type="text" pattern="^0[xX][a-fA-F0-9]{1,64}$"
                    value={chosenAddress} autoFocus disabled={inProgress}
                    onChange={e => { setChosenAddress(e.target.validity.valid ? e.target.value : chosenAddress); }}
                    placeholder="paste address"
                />
            </>}

            {normalizedAddress && <>
                <p>
                    Recipient: {shortAddress}
                </p>
            </>}

            <div className="btn-group">
                {normalizedAddress &&
                <Button onClick={() => { claimAssets(link, normalizedAddress); }}>
                    CLAIM ASSETS
                </Button>}

                {currAcct &&
                <Button onClick={() => {disconnect();}}>
                    LOG OUT
                </Button>}
            </div>
        </>;

    })()}
    </div>;
};
