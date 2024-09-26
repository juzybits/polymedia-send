import { useCurrentAccount, useSignTransaction, useSuiClient } from "@mysten/dapp-kit";
import { CoinBalance, CoinMetadata, SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { normalizeStructTag } from "@mysten/sui/utils";
import { useCoinMetas } from "@polymedia/coinmeta-react";
import { formatBalance, formatNumber, stringToBalance } from "@polymedia/suitcase-core";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { Button } from "./lib/Button";
import { ErrorBox } from "./lib/ErrorBox";
import { LogInToContinue } from "./lib/LogInToContinue";
import { SelectCoin } from "./lib/SelectCoin";
import { useCoinBalances } from "./lib/useCoinBalances";
import { useIsSupportedWallet } from "./lib/useIsSupportedWallet";
import { ZkSendLinkBuilder, ZkSendLinkBuilderOptions } from "./lib/zksend";

/* Constants */

const MAX_LINKS = 300;
const MIME_CSV = "text/csv;charset=utf-8;";

/* React */

export const PageBulk: React.FC = () =>
{
    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutateAsync: signTransaction } = useSignTransaction();

    const { inProgress, setInProgress, setModalContent } = useOutletContext<AppContext>();
    const isSupportedWallet = useIsSupportedWallet();

    const [ chosenBalance, setChosenBalance ] = useState<CoinBalance>(); // dropdown
    const [ chosenAmounts, setChosenAmounts ] = useState<string>(""); // textarea
    const [ pendingLinks, setPendingLinks ] = useState<PendingLinks>();
    const [ allowCreate, setAllowCreate ] = useState(false);
    const [ createResult, setCreateResult ] = useState<CreateResult>();

    // fetch all balances in the user's wallet
    const { userBalances, error: errBalances } = useCoinBalances(suiClient, currAcct);
    // extract the coin types from the user balances
    const allCoinTypes = useMemo(() => userBalances?.map(bal => bal.coinType), [userBalances]);
    // get the CoinMetadata for each coin type
    const { coinMetas, errorCoinMetas } = useCoinMetas(suiClient, allCoinTypes);
    // pick the CoinMetadata for selected balance
    const coinMeta = (!chosenBalance || !coinMetas) ? null : coinMetas.get(normalizeStructTag(chosenBalance.coinType));

    useEffect(() => {
        const resetState = () => {
            setInProgress(false);
            setChosenBalance(undefined);
            setChosenAmounts("");
            setPendingLinks(undefined);
            setAllowCreate(false);
            setCreateResult(undefined);
        };
        resetState();
    }, [currAcct, suiClient]);

    const prepareLinks = async (
        coinType: string,
        coinMeta: CoinMetadata,
        linkGroups: LinkGroup[]
    ) => {
        if (!currAcct)
            return;

        const options: ZkSendLinkBuilderOptions = {
            host: window.location.origin,
            path: "/claim",
            // mist?: number;
            // keypair?: Keypair;
            client: suiClient,
            sender: currAcct.address,
            // redirect?: ZkSendLinkRedirect;
        };

        const amounts = linkGroups.flatMap(lg => Array<bigint>(lg.count).fill(
            stringToBalance(String(lg.value), coinMeta.decimals)
        ));

        const [ tx, links ] = await ZkSendLinkBuilder.createMultiSendLinks(
            coinType,
            amounts,
            options,
        );

        setPendingLinks({ links, coinMeta, tx });

        for (const link of links) {
            console.debug(link.getLink());
        }
    };

    const createLinks = async (pendingLinks: PendingLinks) => {
        setCreateResult(undefined);

        setInProgress(true);
        try {
            const tx = pendingLinks.tx;

            const signedTx = await signTransaction({
                transaction: tx,
            });

            setModalContent("⏳ Creating links...");

            const resp = await suiClient.executeTransactionBlock({
                transactionBlock: signedTx.bytes,
                signature: signedTx.signature,
                options: { showEffects: true },
            });
            console.debug("resp:", resp);

            let errMsg: string|null = null;
            if (resp.errors || resp.effects?.status.status !== "success") {
                errMsg = `Txn digest: ${resp.digest}\n`
                + `Txn status: ${resp.effects?.status.status}\n`
                + `Txn errors: ${JSON.stringify(resp.errors)}`;
            }
            setCreateResult({ resp, errMsg });
        } catch (err) {
            setCreateResult({ resp: null, errMsg: String(err) });
        } finally {
            setInProgress(false);
            setModalContent(null);
        }
    };

    const error = errBalances ?? errorCoinMetas ?? null;

    return <div id="page-content" >

    <h1>Create multiple links</h1>

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

        // without pendingLinks

        if (!pendingLinks) {
            return <>
                {coinMetas && <SelectCoin
                    userBalances={userBalances}
                    chosenBalance={chosenBalance}
                    coinMetas={coinMetas}
                    setChosenBalance={setChosenBalance}
                    inProgress={inProgress}
                />}

                {(() => {
                    if (!chosenBalance) {
                        return null;
                    }

                    if (!coinMetas || !coinMeta) {
                        return <p>Loading coin info...</p>;
                    }

                    // Validate amounts
                    const linkGroups = parseLinkGroups(chosenAmounts);
                    const totalValue = linkGroups.reduce((total, lg) => total + (lg.count * lg.value), 0);
                    const linkGroupsErr = (() => {
                        const totalLinks = linkGroups.reduce((total, lg) => total + lg.count, 0);
                        if (totalLinks > MAX_LINKS) {
                            return `You can create up to ${MAX_LINKS} links at once`;
                        }
                        const totalValueWithDec = stringToBalance(String(totalValue), coinMeta.decimals);
                        const userBalanceWithDec = BigInt(chosenBalance.totalBalance);
                        if (totalValueWithDec > userBalanceWithDec) {
                            return "Not enough balance";
                        }
                        return "";
                    })();

                    const disableSendBtn = totalValue === 0 || linkGroupsErr !== "" || inProgress;
                    return <>
                        <div>
                        <textarea
                            placeholder='Enter LINKS x AMOUNT. Example: "50x10000 25x50000"'
                            value={chosenAmounts}
                            disabled={inProgress}
                            style={{width: "400px"}}
                            onChange={e => { setChosenAmounts(e.target.value); }}
                        />
                        </div>

                        <div className="tight">
                            <p>
                                Your balance: {formatBalance(BigInt(chosenBalance.totalBalance), coinMeta.decimals, "compact")} {coinMeta.symbol}
                            </p>
                            <p>
                                Total amount to send: {formatNumber(totalValue, "compact")} {coinMeta.symbol}
                            </p>
                        </div>

                        {linkGroupsErr &&
                        <div className="error-box">
                            Error: {linkGroupsErr}
                        </div>}

                        <Button
                            onClick={() => { prepareLinks(chosenBalance.coinType, coinMeta, linkGroups); }}
                            disabled={disableSendBtn}
                        >
                            PREVIEW LINKS
                        </Button>

                        {linkGroups.length > 0 && <div className="tight">
                            <p><b>Summary:</b></p>
                            {linkGroups.map((lg, idx) => <p key={idx}>
                                {lg.count} link{lg.count > 1 ? "s" : ""} with {formatNumber(lg.value, "compact")} {coinMeta.symbol}
                            </p>)}
                        </div>}
                    </>;
                })()}
            </>;
        }

        // with pendingLinks

        const symbol = pendingLinks.coinMeta.symbol.toLowerCase();
        const count = pendingLinks.links.length;
        const allLinksStr = pendingLinks.links.reduce((txt, link) => txt + link.getLink() + "\n", "");
        return <>
            <p>Copy or download the links before funding them.</p>

            <textarea
                readOnly
                value={allLinksStr}
                disabled={inProgress}
                style={{overflowWrap: "normal", width: "400px", textAlign: "left"}}
                onClick={(e: React.MouseEvent<HTMLTextAreaElement>) => { e.currentTarget.select(); }}
            />

            <div className="btn-group">
                <Button onClick={async () => {
                    try {
                        await navigator.clipboard.writeText(allLinksStr);
                        // showCopyMessage('👍 Link copied');
                        setAllowCreate(true);
                    } catch (error) {
                        // showCopyMessage("❌ Oops, didn't work. Please copy the page URL manually."); // TODO
                    }
                }}>
                    📑 COPY LINKS
                </Button>

                <Button onClick={() => {
                    const filename = `zksend_${symbol}_${count}_links_${getCurrentDate()}.csv`;
                    downloadFile(filename, allLinksStr, MIME_CSV);
                    setAllowCreate(true);
                }}>
                    📥 DOWNLOAD
                </Button>
            </div>

            {(() => {
                if (!allowCreate) {
                    return null;
                }

                if (createResult && !createResult.errMsg) {
                    return <>
                        <p>Your links have been created. <u><b>Don't lose them!</b></u></p>
                        <p>
                            We don't store claim links. If you don't share or save your links before leaving this page, the assets will be lost.
                        </p>
                    </>;
                }

                return <>
                    <Button onClick={() => { createLinks(pendingLinks); }}>
                        🚀 CREATE LINKS
                    </Button>

                    {createResult?.errMsg &&
                    <div className="error-box">{createResult.errMsg}</div>}
                </>;
            })()}
        </>;
    })()}

    <ErrorBox err={error} />

    </div>;
};

/* Types */

type PendingLinks = {
    links: ZkSendLinkBuilder[];
    coinMeta: CoinMetadata;
    tx: Transaction;
};

type CreateResult = {
    resp: SuiTransactionBlockResponse|null;
    errMsg: string|null;
};

type LinkGroup = {
    count: number;
    value: number;
};

/* Functions */

const linksAmountsPattern = /(\d+)\s*[xX*]\s*(\d+(\.\d+)?)/gi;

function parseLinkGroups(input: string): LinkGroup[] {
    const linkGroups: LinkGroup[] = [];

    let match;
    while ((match = linksAmountsPattern.exec(input)) !== null) {
        const count = parseInt(match[1]);
        const value = parseFloat(match[2]);
        linkGroups.push({ count, value });
    }

    return linkGroups;
}

function downloadFile(filename: string, content: string, mime: string): void {
    // Create a Blob with the file contents
    const blob = new Blob([ content ], { type: mime });

    // Create a URL for the blob
    const url = URL.createObjectURL(blob);

    // Create an anchor (<a>) element and set its attributes for download
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.setAttribute("download", filename);

    // Trigger the download by clicking the anchor element
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Cleanup
    document.body.removeChild(downloadLink); // Remove the anchor element
    URL.revokeObjectURL(url); // Free up memory by releasing the blob URL
}

function getCurrentDate(): string {
    const now = new Date();

    // const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0"); // JS months are 0-based
    const day = String(now.getDate()).padStart(2, "0");
    // const hours = String(now.getHours()).padStart(2, '0');
    // const minutes = String(now.getMinutes()).padStart(2, '0');
    // const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${month}-${day}`;
}
