import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { convertBigIntToNumber } from '@polymedia/suits';
import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AppContext } from './App';
import { ErrorBox } from './lib/ErrorBox';
import { LogInToContinue } from './lib/LogInToContinue';
import { useCoinInfos } from './lib/useCoinInfos';
import { useZkBagContract } from './lib/useZkBagContract';
import { listCreatedLinks } from './lib/zksend/list-created-links';

export const PageHistory: React.FC = () =>
{
    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();

    const { network } = useOutletContext<AppContext>();
    const zkBagContract = useZkBagContract();

    const [ links, setLinks ] = useState<Awaited<ReturnType<typeof listCreatedLinks>>>();
    const [ errMsg, setErrMsg ] = useState<string>();

    const allCoinTypes = useMemo(() =>
        links?.links.flatMap(link => link.assets.balances.map(bal => bal.coinType))
    , [links]);
    const { coinInfos, error: _errCoinInfo } = useCoinInfos(suiClient, allCoinTypes);

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

    return <div id='page-list'>
        <h1>Your links</h1>
        <p><i>Note: only single links are shown. Bulk-created links will be supported later on.</i></p>
        {((() => {
            if (errMsg) {
                return <ErrorBox err={errMsg} />
            }
            if (!currAcct) {
                return <LogInToContinue />;
            }
            if (!links) {
                return <p>Loading...</p>;
            }
            return <>
                {links.links.map(link =>
                    <div key={link.digest} className='tight'>
                        <p>{link.claimed ? 'claimed' : 'unclaimed'}</p>
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
                                : <>{ convertBigIntToNumber(bal.amount, info.decimals)} {info.symbol}</>
                                }
                            </p>
                        })}
                    </div>)
                }
            </>
        })())}
    </div>;
}

/* Functions */

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();

    // Format month and time parts
    const month = date.toLocaleString('default', { month: 'short' });
    // const time = date.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' });

    // Check if the date is from the current year or a previous year
    if (date.getFullYear() === now.getFullYear()) {
        return `${month} ${date.getDate()}`;
    } else {
        return `${month} ${date.getDate()} ${date.getFullYear()}`;
    }
}
