import { useCurrentAccount, useSignAndExecuteTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { CoinBalance } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { convertNumberToBigInt, formatBigInt, formatNumber } from '@polymedia/suits';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AppContext } from './App';
import { SelectCoin } from './components/SelectCoin';
import { CoinInfo } from './lib/coininfo';
import { useCoinBalances, useCoinInfo } from './lib/hooks';
import { ZkSendLinkBuilder, ZkSendLinkBuilderOptions } from './lib/zksend';

/* React */

export const PageBulk: React.FC = () =>
{
    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutateAsync: signAndExecuteTxb } = useSignAndExecuteTransactionBlock();

    const { inProgress, setInProgress, openConnectModal } = useOutletContext<AppContext>();
    const [ errMsg, setErrMsg ] = useState<string>();
    const [ chosenBalance, setChosenBalance ] = useState<CoinBalance>(); // dropdown
    const [ chosenAmounts, setChosenAmounts ] = useState<string>(''); // textarea
    const [ pendingLinks, setPendingLinks ] = useState<PendingLinks>();
    const [ enableExecution, setEnableExecution ] = useState(false);

    const { userBalances, error: errBalances } = useCoinBalances(suiClient, currAcct);
    const { coinInfo, error: errCoinInfo } = useCoinInfo(suiClient, chosenBalance);

    useEffect(() => {
        const resetState = () => {
            setInProgress(false);
            setErrMsg(undefined);
            setChosenBalance(undefined);
            setChosenAmounts('');
        }
        resetState();
    }, [currAcct, suiClient]);

    const createLinks = async (coinInfo: CoinInfo, linkValues: LinkValue[]) => {
        if (!currAcct) return;

        const options: ZkSendLinkBuilderOptions = {
            sender: currAcct.address,
            host: window.location.origin,
            path: '/claim',
            client: suiClient,
        };

        const amounts = linkValues.flatMap(lv => Array(lv.count).fill(
            convertNumberToBigInt(lv.value, coinInfo.decimals)
        ));

        const [ txb, links ] = await ZkSendLinkBuilder.createMultiSendLinks(
            coinInfo.coinType,
            amounts,
            options,
        );

        setPendingLinks({ txb, links, coinInfo });

        for (const link of links) {
            console.debug(link.getLink());
        }
    };

    const executeTxb = async (txb: TransactionBlock) => {
        const resp = await signAndExecuteTxb({
            transactionBlock: txb,
            options: { showEffects: true }
        });
        console.debug('resp:', resp);
    };

    const error = errMsg ?? errBalances ?? errCoinInfo ?? null;

    return <div id='bulk-page' className='page'>

    <h1>Bulk</h1>

    <h2>Create multiple claim links</h2>

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
                        <p>You can create up to {MAX_LINKS} links with one transaction.</p>

                        <textarea
                            value={chosenAmounts}
                            disabled={inProgress}
                            onChange={e => {
                                const newValue = e.target.value.replace(/\./g, '');
                                setChosenAmounts(newValue);
                            }}
                            placeholder='Enter "[LINKS] x [AMOUNT]". For example: "50 x 1000, 25 x 5000".'
                        />

                        <p>
                            Total amount to send: {formatNumber(totalValue, 'compact')} {coinInfo.symbol}
                        </p>
                        {linkValues.map((lv, idx) => <p key={idx}>
                            {lv.count} link{lv.count > 1 ? 's' : ''} with {formatNumber(lv.value, 'compact')} {coinInfo.symbol}
                        </p>)}

                        <p>
                            Your balance: {formatBigInt(BigInt(chosenBalance.totalBalance), coinInfo.decimals, 'compact')}
                        </p>

                        {linkValuesErr &&
                        <div className='error-box'>
                            Error: {linkValuesErr}
                        </div>}

                        <button
                            className='btn'
                            onClick={ () => { createLinks(coinInfo, linkValues) }}
                            disabled={disableSendBtn}
                        >CREATE LINKS</button>
                    </>;
                })()}
            </>
        }
        if (pendingLinks) {
            const symbol = pendingLinks.coinInfo.symbol.toLowerCase();
            const count = pendingLinks.links.length;
            const allLinksStr = pendingLinks.links.reduce((txt, link) => txt + link.getLink() + '\n', '');
            return <>
                <p>Your {count === 1 ? 'link is' : `${count} links are`} ready.</p>
                <p>Copy or download the links before sending the assets.</p>

                <button className='btn' onClick={() => {
                    const filename = `zksend_${symbol}_${count}_links_${getCurrentDate()}.csv`;
                    // const csvRows = txbAndLinks.links.map(link => [link.getLink()]);
                    downloadFile(filename, allLinksStr, MIME_CSV);
                    setEnableExecution(true);
                }}>
                    Download
                </button>

                <button className='btn' onClick={async () => {
                    try {
                        await navigator.clipboard.writeText(allLinksStr);
                        // showCopyMessage('👍 Link copied');
                        setEnableExecution(true);
                    } catch (error) {
                        // showCopyMessage("❌ Oops, didn't work. Please copy the page URL manually.");
                    }
                }}>
                    Copy
                </button>

                {enableExecution &&
                <button className='btn' onClick={() => { executeTxb(pendingLinks.txb) }}>
                    Create links
                </button>}

                <textarea
                    readOnly
                    style={{height: '15rem', overflowWrap: 'normal'}}
                    onClick={(e: React.MouseEvent<HTMLTextAreaElement>) => { e.currentTarget.select() }}
                    value={allLinksStr}
                />
            </>;
        }
        return null;
    })()}

    {error &&
    <div className='error-box'>
        Something went wrong:<br/>{error}
    </div>}

    </div>;
};

/* Constants */

const MAX_LINKS = 300;
const MIME_CSV = 'text/csv;charset=utf-8;';

/* Types */

type PendingLinks = {
    txb: TransactionBlock,
    links: ZkSendLinkBuilder[],
    coinInfo: CoinInfo,
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
