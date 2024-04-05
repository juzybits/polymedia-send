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

type ListCreatedLinksReturn = Awaited<ReturnType<typeof listCreatedLinks>>;
type ListCreatedLinksLink = ListCreatedLinksReturn['links'][number];

export const PageHistory: React.FC = () =>
{
    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutateAsync: signAndExecuteTxb } = useSignAndExecuteTransactionBlock();

    const { network, inProgress, setInProgress } = useOutletContext<AppContext>();
    const zkBagContract = useZkBagContract();

    const [ links, setLinks ] = useState<ListCreatedLinksReturn>();
    const [ reclaimedDigests, setReclaimedDigests ] = useState<string[]>([]);
    const [ errMsg, setErrMsg ] = useState<string>();

    const allCoinTypes = useMemo(() =>
        links?.links.flatMap(link => link.assets.balances.map(bal => bal.coinType))
    , [links]);
    const { coinInfos, error: errCoinInfo } = useCoinInfos(suiClient, allCoinTypes);

    useEffect(() => {
        setLinks(undefined);
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
            console.debug(resp);
            setLinks(currLinks => {
                if (currLinks) {
                    resp.links = [...currLinks.links, ...resp.links];
                }
                return resp;
            });
        } catch (err) {
            setErrMsg(String(err))
        }
    };

    const reclaimLink = async (link: ListCreatedLinksLink) => {
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
                const digest = link.digest; // TypeScript complains below if we use link.digest
                digest && setReclaimedDigests(prevDigests => [...prevDigests, digest]);
            }
        } catch (err) {
            setErrMsg(String(err));
        } finally {
            setInProgress(false);
        }
    }

    const error = errMsg ?? errCoinInfo ?? null;

    return <div id='page-history'>
        <h1>History</h1>
        { error && <ErrorBox err={error} /> }
        {((() => {
            if (!currAcct) {
                return <LogInToContinue />;
            }
            if (!links) {
                return <p>Loading...</p>;
            }

            return <>
            <p style={{fontSize: '1em'}}><i>Only single links are shown. Links created in bulk will be supported later on.</i></p>
            <div id='history-table'>
                {links.links.map(link =>
                    <div key={link.digest} className='history-link'>
                        <p>{formatDate(link.createdAt)}</p>
                        {link.assets.balances.map(bal => { // in practice balances.length is 1
                            const info = coinInfos[bal.coinType];
                            return <p key={bal.coinType}>
                                {!info
                                ? <>Loading...</>
                                : <>{ formatBigInt(bal.amount, info.decimals, 'compact')} {info.symbol}</>
                                }
                            </p>
                        })}
                        <p>
                        {(() => {
                            let linkStatus: 'unclaimed' | 'claimed' | 'reclaimed';
                            if ( !link.assets.coins.length || ( link.digest && reclaimedDigests.includes(link.digest) ) ) {
                                linkStatus = 'reclaimed';
                            } else if (link.claimed) {
                                linkStatus = 'claimed';
                            } else {
                                linkStatus = 'unclaimed';
                            }

                            if (linkStatus === 'unclaimed') {
                                return (
                                    <button className='btn' disabled={inProgress} onClick={() => { reclaimLink(link)}}>
                                        RECLAIM
                                    </button>
                                );
                            } else {
                                return (
                                    <span className={linkStatus}>
                                        {linkStatus.toLocaleUpperCase()}
                                    </span>
                                );
                            }
                            return <></>
                        })()}
                        </p>
                        {/*
                        <p>digest: {link.digest}</p>
                        <p>address: {link.link.address}</p>
                        */}
                    </div>)
                }
            </div>

            {links.hasNextPage &&
                <button className='btn' onClick={() => {
                    loadLinks(links.cursor ?? undefined)
                }}>
                        LOAD MORE
                </button>
            }

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
