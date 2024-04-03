import { useCurrentAccount, useSignAndExecuteTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { CoinBalance, SuiTransactionBlockResponse } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { convertNumberToBigInt, formatBigInt, formatNumber } from '@polymedia/suits';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AppContext } from './App';
import { ErrorBox } from './lib/ErrorBox';
import { LogInToContinue } from './lib/LogInToContinue';
import { SelectCoin } from './lib/SelectCoin';
import { CoinInfo } from './lib/getCoinInfo';
import { useCoinBalances } from './lib/useCoinBalances';
import { useCoinInfo } from './lib/useCoinInfo';
import { useIsSupportedWallet } from './lib/useIsSupportedWallet';
import { useZkBagContract } from './lib/useZkBagContract';
import { ZkSendLinkBuilder, ZkSendLinkBuilderOptions } from './lib/zksend/builder';

/* React */

export const PageBulk: React.FC = () =>
{
    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutateAsync: signAndExecuteTxb } = useSignAndExecuteTransactionBlock();

    const { inProgress, setInProgress, network, sendMode } = useOutletContext<AppContext>();
    const isSupportedWallet = useIsSupportedWallet();
    const zkBagContract = useZkBagContract();

    const [ chosenBalance, setChosenBalance ] = useState<CoinBalance>(); // dropdown
    const [ chosenAmounts, setChosenAmounts ] = useState<string>(''); // textarea
    const [ pendingLinks, setPendingLinks ] = useState<PendingLinks>();
    const [ allowCreate, setAllowCreate ] = useState(false);
    const [ createResult, setCreateResult ] = useState<CreateResult>();

    const { userBalances, error: errBalances } = useCoinBalances(suiClient, currAcct);
    const { coinInfo, error: errCoinInfo } = useCoinInfo(suiClient, chosenBalance);

    useEffect(() => {
        const resetState = () => {
            setInProgress(false);
            setChosenBalance(undefined);
            setChosenAmounts('');
            // setChosenAmounts('1x11 2x22 3x33');
            setPendingLinks(undefined);
            setAllowCreate(false);
            setCreateResult(undefined);
        }
        resetState();
    }, [currAcct, suiClient]);

    const prepareLinks = async (coinInfo: CoinInfo, linkValues: LinkValue[]) => {
        if (!currAcct)
            return;

        const options: ZkSendLinkBuilderOptions = {
            host: window.location.origin,
            path: '/claim',
            // keypair?: Keypair;
            network: network,
            client: suiClient,
            sender: currAcct.address,
            // redirect?: ZkSendLinkRedirect;
            // contract?: ZkBagContractOptions | null;
        };

        if (sendMode === 'contract-based') {
            options.contract = zkBagContract;

            const links: ZkSendLinkBuilder[] = [];
            for (const lv of linkValues) {
                for (let i = 0; i < lv.count; i++) {
                    const link = new ZkSendLinkBuilder(options);
                    link.addClaimableBalance(
                        coinInfo.coinType,
                        convertNumberToBigInt(lv.value, coinInfo.decimals),
                    );
                    links.push(link);
                }
            }

            setPendingLinks({ links, coinInfo });

            for (const link of links) {
                console.debug(link.getLink());
            }
        } else {
            options.contract = null;

            const amounts = linkValues.flatMap(lv => Array<bigint>(lv.count).fill(
                convertNumberToBigInt(lv.value, coinInfo.decimals)
            ));

            const [ txb, links ] = await ZkSendLinkBuilder.createMultiSendLinks(
                coinInfo.coinType,
                amounts,
                options,
            );

            setPendingLinks({ links, coinInfo, txb });

            for (const link of links) {
                console.debug(link.getLink());
            }
        }
    };

    const createLinks = async (pendingLinks: PendingLinks) => {
        setCreateResult(undefined);

        setInProgress(true);
        try {
            const txb = pendingLinks.txb ?? // contract-less
                await ZkSendLinkBuilder.createLinks({ // contract-based
                    // transactionBlock?: TransactionBlock;
                    client: suiClient,
                    network,
                    links: pendingLinks.links,
                    contract: zkBagContract,
                });

            const resp = await signAndExecuteTxb({
                transactionBlock: txb,
                options: { showEffects: true }
            });
            console.debug('resp:', resp);

            let errMsg: string|null = null;
            if (resp.errors || resp.effects?.status.status !== 'success') {
                errMsg = `Txn digest: ${resp.digest}\n`
                + `Txn status: ${resp.effects?.status.status}\n`
                + `Txn errors: ${JSON.stringify(resp.errors)}`;
            }
            setCreateResult({ resp, errMsg });
        } catch (err) {
            setCreateResult({ resp: null, errMsg: String(err) });
        } finally {
            setInProgress(false);
        }
    };

    const error = errBalances ?? errCoinInfo ?? null;

    return <div id='bulk-page' >

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
                <SelectCoin
                    userBalances={userBalances}
                    chosenBalance={chosenBalance}
                    setChosenBalance={setChosenBalance}
                    inProgress={inProgress}
                />

                {(() => {
                    if (!chosenBalance) {
                        return null;
                    }

                    if (!coinInfo) {
                        return <div>Loading coin info...</div>;
                    }

                    // Validate amounts
                    const linkValues = parseLinksAmounts(chosenAmounts);
                    const totalValue = linkValues.reduce((total, lv) => total + (lv.count * lv.value), 0);
                    const linkValuesErr = (() => {
                        const totalLinks = linkValues.reduce((total, lv) => total + lv.count, 0);
                        if (totalLinks > MAX_LINKS) {
                            return `You can create up to ${MAX_LINKS} links at once`;
                        }
                        const totalValueWithDec = convertNumberToBigInt(totalValue, coinInfo.decimals);
                        const userBalanceWithDec = BigInt(chosenBalance.totalBalance);
                        if (totalValueWithDec > userBalanceWithDec) {
                            return 'Not enough balance';
                        }
                        return '';
                    })();

                    const disableSendBtn = totalValue === 0 || linkValuesErr !== '' || inProgress;
                    return <>
                        <div>
                        <textarea
                            placeholder='Enter LINKS x AMOUNT. Example: "50x10000 25x50000"'
                            value={chosenAmounts}
                            disabled={inProgress}
                            onChange={e => {
                                const newValue = e.target.value.replace(/\./g, '');
                                setChosenAmounts(newValue);
                            }}
                        />
                        </div>

                        <div className='tight'>
                            <p>
                                Your balance: {formatBigInt(BigInt(chosenBalance.totalBalance), coinInfo.decimals, 'compact')}
                            </p>
                            <p>
                                Total amount to send: {formatNumber(totalValue, 'compact')} {coinInfo.symbol}
                            </p>
                        </div>

                        {linkValuesErr &&
                        <div className='error-box'>
                            Error: {linkValuesErr}
                        </div>}

                        <button
                            className='btn'
                            onClick={ () => { prepareLinks(coinInfo, linkValues) }}
                            disabled={disableSendBtn}
                        >
                            PREVIEW LINKS
                        </button>

                        {linkValues.length > 0 && <div className='tight'>
                            <p><b>Summary:</b></p>
                            {linkValues.map((lv, idx) => <p key={idx}>
                                {lv.count} link{lv.count > 1 ? 's' : ''} with {formatNumber(lv.value, 'compact')} {coinInfo.symbol}
                            </p>)}
                        </div>}
                    </>;
                })()}
            </>
        }

        // with pendingLinks

        const symbol = pendingLinks.coinInfo.symbol.toLowerCase();
        const count = pendingLinks.links.length;
        const allLinksStr = pendingLinks.links.reduce((txt, link) => txt + link.getLink() + '\n', '');
        return <>
            <p>Copy or download the links before funding them.</p>

            <textarea
                readOnly
                value={allLinksStr}
                disabled={inProgress}
                style={{overflowWrap: 'normal', width: '100%', textAlign: 'left'}}
                onClick={(e: React.MouseEvent<HTMLTextAreaElement>) => { e.currentTarget.select() }}
            />

            <div className='btn-group'>
                <button className='btn' disabled={inProgress} onClick={async () => {
                    try {
                        await navigator.clipboard.writeText(allLinksStr);
                        // showCopyMessage('👍 Link copied');
                        setAllowCreate(true);
                    } catch (error) {
                        // showCopyMessage("❌ Oops, didn't work. Please copy the page URL manually.");
                    }
                }}>
                    📑 COPY LINKS
                </button>

                <button className='btn' disabled={inProgress} onClick={() => {
                    const filename = `zksend_${symbol}_${count}_links_${getCurrentDate()}.csv`;
                    // const csvRows = txbAndLinks.links.map(link => [link.getLink()]);
                    downloadFile(filename, allLinksStr, MIME_CSV);
                    setAllowCreate(true);
                }}>
                    📥 DOWNLOAD
                </button>
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
                    <button className='btn' disabled={inProgress} onClick={() => {
                        createLinks(pendingLinks)
                    }}>
                        🚀 CREATE LINKS
                    </button>

                    {createResult?.errMsg &&
                    <div className='error-box'>{createResult.errMsg}</div>}
                </>;
            })()}
        </>;
    })()}

    <ErrorBox err={error} />

    </div>;
};

/* Constants */

const MAX_LINKS = 300;
const MIME_CSV = 'text/csv;charset=utf-8;';

/* Types */

type PendingLinks = {
    links: ZkSendLinkBuilder[],
    coinInfo: CoinInfo,
    txb?: TransactionBlock, // contract-less
};

type CreateResult = {
    resp: SuiTransactionBlockResponse|null,
    errMsg: string|null,
};

type LinkValue = {
    count: number;
    value: number;
};

/* Functions */

const linksAmountsPattern = /(\d+)\s*[xX*]\s*(\d+)/gi;

function parseLinksAmounts(input: string): LinkValue[] {
    const linkValues: LinkValue[] = [];

    let match;
    while ((match = linksAmountsPattern.exec(input)) !== null) {
        const count = parseInt(match[1]);
        const value = parseInt(match[2]);
        linkValues.push({ count, value });
    }

    return linkValues;
}

function downloadFile(filename: string, content: string, mime: string): void {
    // Create a Blob with the file contents
    const blob = new Blob([ content ], { type: mime });

    // Create a URL for the blob
    const url = URL.createObjectURL(blob);

    // Create an anchor (<a>) element and set its attributes for download
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.setAttribute('download', filename);

    // Trigger the download by clicking the anchor element
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Cleanup
    document.body.removeChild(downloadLink); // Remove the anchor element
    URL.revokeObjectURL(url); // Free up memory by releasing the blob URL
}

// function downloadCSV(filename: string, data: string[][]): void {
//     const content = data.map(row => row.join(',')).join('\n');
//     downloadFile(filename, content, 'text/csv;charset=utf-8;');
// }

function getCurrentDate(): string {
    const now = new Date();

    // const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // JavaScript months are 0-based.
    const day = String(now.getDate()).padStart(2, '0');
    // const hours = String(now.getHours()).padStart(2, '0');
    // const minutes = String(now.getMinutes()).padStart(2, '0');
    // const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${month}-${day}`;
}
