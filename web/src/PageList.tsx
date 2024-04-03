import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AppContext } from './App';
import { TESTNET_IDS } from './lib/constants';
import { listCreatedLinks } from './lib/zksend/list-created-links';
import { MAINNET_CONTRACT_IDS } from './lib/zksend/zk-bag';

export const PageList: React.FC = () =>
{
    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();

    const { network } = useOutletContext<AppContext>();

    const [ links, setLinks ] = useState<Awaited<ReturnType<typeof listCreatedLinks>>>();
    // const [ errMsg, setErrMsg ] = useState<string>(); // TODO

    useEffect(() => {
        const loadLinks = async () => {
            if (!currAcct) {
                setLinks(undefined);
            } else {
                const res = await listCreatedLinks({
                    address: currAcct.address,
                    contract: network === 'mainnet' ? MAINNET_CONTRACT_IDS : TESTNET_IDS,
                    // cursor?: string;
                    network,
                    host: window.location.origin,
                    path: '/claim',
                    client: suiClient,
                });
                setLinks(res);
                console.debug(res);
            }
        };
        loadLinks();
    }, [currAcct]);

    return <div id='page-list'>
        <h1>Your links</h1>
        {
            !links
            ?
                <p>Loading...</p>
            :
            links.links.map(link =>
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
    </div>;
}
