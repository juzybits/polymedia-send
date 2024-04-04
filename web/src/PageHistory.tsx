import { useCurrentAccount, useSignAndExecuteTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { formatBigInt } from '@polymedia/suits';
import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AppContext } from './App';
import { ErrorBox } from './lib/ErrorBox';
import { LogInToContinue } from './lib/LogInToContinue';
import { useCoinInfos } from './lib/useCoinInfos';
import { useZkBagContract } from './lib/useZkBagContract';
import { ZkSendLink } from './lib/zksend/claim';
import { listCreatedLinks } from './lib/zksend/list-created-links';
import './styles/history.less';

export const PageHistory: React.FC = () =>
{
    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutateAsync: signAndExecuteTxb } = useSignAndExecuteTransactionBlock();

    const { network, inProgress, setInProgress } = useOutletContext<AppContext>();
    const zkBagContract = useZkBagContract();

    const [ links, setLinks ] = useState<Awaited<ReturnType<typeof listCreatedLinks>>>();
    const [ errMsg, setErrMsg ] = useState<string>();

    const allCoinTypes = useMemo(() =>
        links?.links.flatMap(link => link.assets.balances.map(bal => bal.coinType))
    , [links]);
    const { coinInfos, error: errCoinInfo } = useCoinInfos(suiClient, allCoinTypes);

    useEffect(() => {
        const loadLinks = async () => {
            setLinks(undefined);
            if (!currAcct)
                return;
            try {
                const res = await listCreatedLinks({
                    address: currAcct.address,
                    contract: zkBagContract,
                    // cursor?: string;
                    network,
                    host: window.location.origin,
                    path: '/claim',
                    client: suiClient,
                });
                setLinks(res);
                console.debug(res);
            } catch (err) {
                setErrMsg(String(err))
            }
        };
        loadLinks();
    }, [currAcct, suiClient]);

    const reclaimLink = async (link: ZkSendLink) => {
        setErrMsg(undefined);

        if (!currAcct)
            return;

        setInProgress(true);
        try {
            const txb = link.createClaimTransaction(currAcct.address, { reclaim: true });
            const resp = await signAndExecuteTxb({
                transactionBlock: txb,
                options: { showEffects: true }
            });
            console.debug('resp:', resp);

            if (resp.errors || resp.effects?.status.status !== 'success') {
                setErrMsg(`Txn digest: ${resp.digest}\n`
                    + `Txn status: ${resp.effects?.status.status}\n`
                    + `Txn errors: ${JSON.stringify(resp.errors)}`);
            }
        } catch (err) {
            setErrMsg(String(err));
        } finally {
            setInProgress(false);
        }
    }

    const error = errMsg ?? errCoinInfo ?? null;

    return <div id='page-history'>
        <h1>Your links</h1>
        <p><i>Note: only single links are shown. Bulk-created links will be supported later on.</i></p>
        { error && <ErrorBox err={error} /> }
        {((() => {
            if (!currAcct) {
                return <LogInToContinue />;
            }
            if (!links) {
                return <p>Loading...</p>;
            }

            return <div id='history-table'>
                {links.links.map(link =>
                    <div key={link.digest} className='history-link'>
                        <p>{formatDate(link.createdAt)}</p>
                        {/*
                        <p>digest: {link.digest}</p>
                        <p>address: {link.link.address}</p>
                        */}
                        {link.assets.balances.map(bal => {
                            const info = coinInfos[bal.coinType];
                            return <p key={bal.coinType}>
                                {!info
                                ? <>Loading...</>
                                : <>{ formatBigInt(bal.amount, info.decimals, 'compact')} {info.symbol}</>
                                }
                            </p>
                        })}
                        <p>
                            {link.claimed
                            ?   <span className={link.assets.coins.length === 0 ? 'reclaimed' : 'claimed'}>
                                    {link.assets.coins.length === 0 ? 'RECLAIMED' : 'CLAIMED'}
                                </span>
                            :   <button className='btn  ' disabled={inProgress} onClick={() => {
                                    reclaimLink(link.link)
                                }}>
                                    RECLAIM
                                </button>
                            }
                        </p>
                    </div>)
                }
            </div>
        })())}
    </div>;
}

/* Functions */

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();

    // Format month and time parts
    const month = date.toLocaleString('default', { month: 'short' });
    const time = date.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' });

    // Check if the date is from the current year or a previous year
    if (date.getFullYear() === now.getFullYear()) {
        return `${month} ${date.getDate()} ${time}`;
    } else {
        return `${month} ${date.getDate()} ${date.getFullYear()}`;
    }
}
