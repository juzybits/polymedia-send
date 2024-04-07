import { useCurrentAccount, useSignAndExecuteTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { formatBigInt } from '@polymedia/suits';
import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AppContext } from './App';
import { ErrorBox } from './lib/ErrorBox';
import { LogInToContinue } from './lib/LogInToContinue';
import { useCoinInfos } from './lib/useCoinInfos';
import { useZkBagContract } from './lib/useZkBagContract';
import { listCreatedLinks } from './lib/zksend/list-created-links';
import './styles/history.less';

type CreatedLinksPage = Awaited<ReturnType<typeof listCreatedLinks>>;
type CreatedLink = CreatedLinksPage['links'][number];

export const PageHistory: React.FC = () =>
{
    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutateAsync: signAndExecuteTxb } = useSignAndExecuteTransactionBlock();

    const { network, inProgress, setInProgress } = useOutletContext<AppContext>();
    const zkBagContract = useZkBagContract();

    const [ createdLinksPage, setCreatedLinksPage ] = useState<CreatedLinksPage>();
    const [ reclaimedDigests, setReclaimedDigests ] = useState<string[]>([]);
    const [ errMsg, setErrMsg ] = useState<string>();

    const allCoinTypes = useMemo(() =>
        createdLinksPage?.links.flatMap(link => link.assets.balances.map(bal => bal.coinType))
    , [createdLinksPage]);
    const { coinInfos, error: errCoinInfo } = useCoinInfos(suiClient, allCoinTypes);

    useEffect(() => {
        setCreatedLinksPage(undefined);
        loadLinks();
    }, [currAcct, suiClient]);

    const loadLinks = async (cursor?: string) => {
        if (!currAcct)
            return;
        try {
            const resp = await listCreatedLinks({
                address: currAcct.address,
                contract: zkBagContract,
                cursor,
                network,
                host: window.location.origin,
                path: '/claim',
                client: suiClient,
            });
            // console.debug(resp);
            setCreatedLinksPage(currLinks => {
                if (currLinks) {
                    resp.links = [...currLinks.links, ...resp.links];
                }
                return resp;
            });
        } catch (err) {
            setErrMsg(String(err))
        }
    };

    const reclaimLink = async (link: CreatedLink) => {
        setErrMsg(undefined);

        if (!currAcct)
            return;

        setInProgress(true);
        try {
            const txb = link.link.createClaimTransaction(currAcct.address, { reclaim: true });
            const resp = await signAndExecuteTxb({
                transactionBlock: txb,
                options: { showEffects: true }
            });
            console.debug('resp:', resp);

            if (resp.errors || resp.effects?.status.status !== 'success') {
                setErrMsg(`Txn digest: ${resp.digest}\n`
                    + `Txn status: ${resp.effects?.status.status}\n`
                    + `Txn errors: ${JSON.stringify(resp.errors)}`);
            } else {
                const digest = link.digest;
                digest && setReclaimedDigests(prevDigests => [...prevDigests, digest]);
            }
        } catch (err) {
            setErrMsg(String(err));
        } finally {
            setInProgress(false);
        }
    }

    const error = errMsg ?? errCoinInfo ?? null;

    const HistoryTable: React.FC = () => {
        if (!createdLinksPage) {
            return null;
        }

        const debug = coinInfos.size > 0;
        debug && console.debug('========== LINKS ============');

        const formattedLinks = createdLinksPage.links.map(link => {
            let linkStatus: 'unclaimed' | 'claimed' | 'reclaimed';
            if ( !link.assets.coins.length || ( link.digest && reclaimedDigests.includes(link.digest) ) ) {
                linkStatus = 'reclaimed';
            } else if (link.claimed) {
                linkStatus = 'claimed';
            } else {
                linkStatus = 'unclaimed';
            }

            const foLi = {
                link: link,
                status: linkStatus,
                date: formatDate(link.createdAt),
                balances: link.assets.balances.map(bal => {
                    if (linkStatus === 'reclaimed') {
                        return '';
                    }
                    const info = coinInfos.get(bal.coinType);
                    if (!info) {
                        return 'Loading...';
                    }
                    return formatBigInt(bal.amount, info.decimals, 'compact') + ' ' + info.symbol;
                }),
            };

            debug && console.debug((() => {
                return `### ${foLi.status} | `
                    + `${[...foLi.balances.values()]} | `
                    + `${foLi.link.digest}\n`
                    + JSON.stringify(foLi.link, null, 2);
            })());

            return foLi;
        });

        return <div id='history-table'>
        {formattedLinks.map(foLi =>
            <div key={foLi.link.digest} className='history-link'>

                <p>{foLi.date}</p>

                {foLi.balances.map(bal => // in practice balances.length is 1
                <p key={bal}>{bal}</p>
                )}

                <p>
                {foLi.status === 'unclaimed'
                    ?
                    <button className='btn' disabled={inProgress} onClick={() => { reclaimLink(foLi.link)}}>
                        RECLAIM
                    </button>
                    :
                    <span className={foLi.status}>
                        {foLi.status.toLocaleUpperCase()}
                    </span>
                }
                </p>

                {/*
                <p>digest: {link.digest}</p>
                <p>address: {link.link.address}</p>
                */}
            </div>)
        }
        </div>;
    }

    return <div id='page-content'>

        <h1>History</h1>

        { error && <ErrorBox err={error} /> }

        {((() => {
            if (!currAcct) {
                return <LogInToContinue />;
            }
            if (!createdLinksPage) {
                return <p>Loading...</p>;
            }
            return <>
                <p style={{fontSize: '1em', fontStyle: 'italic'}}>
                    Only single links are shown. Links created in bulk will be supported later on.
                </p>

                <HistoryTable />

                {createdLinksPage.hasNextPage &&
                <button className='btn' onClick={() => { loadLinks(createdLinksPage.cursor ?? undefined) }}>
                    LOAD MORE
                </button>}
            </>
        })())}
    </div>;
}

/* Functions */

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();

    const month = date.toLocaleString('default', { month: 'short' });
    const time = date.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit', hour12: false });

    if (date.getFullYear() === now.getFullYear()) {
        return `${month} ${date.getDate()} ${time}`;
    } else {
        return `${month} ${date.getDate()} ${date.getFullYear()}`;
    }
}
