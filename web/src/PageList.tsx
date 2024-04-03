import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AppContext } from './App';
import { ErrorBox } from './lib/ErrorBox';
import { LogInToContinue } from './lib/LogInToContinue';
import { useZkBagContract } from './lib/useZkBagContract';
import { listCreatedLinks } from './lib/zksend/list-created-links';

export const PageList: React.FC = () =>
{
    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();

    const { network } = useOutletContext<AppContext>();
    const zkBagContract = useZkBagContract();

    const [ links, setLinks ] = useState<Awaited<ReturnType<typeof listCreatedLinks>>>();
    const [ errMsg, setErrMsg ] = useState<string>();

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
                        <p>claimed: {link.claimed ? 'yes' : 'no'}</p>
                        <p>createdAt: {link.createdAt}</p>
                        <p>digest: {link.digest}</p>
                        <p>address: {link.link.address}</p>
                        {link.assets.balances.map(bal =>
                            <p key={bal.coinType}>
                                Balance: {String(bal.amount)} {bal.coinType.split('::')[2]}
                            </p>
                        )}
                    </div>)
                }
            </>
        })())}
    </div>;
}
