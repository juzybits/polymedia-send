import { useCurrentAccount } from '@mysten/dapp-kit';
import { useEffect, useState } from 'react';
import { listCreatedLinks } from './lib/zksend/list-created-links';

export const PageList: React.FC = () =>
{
    const [ links, setLinks ] = useState<Awaited<ReturnType<typeof listCreatedLinks>>>();
    const currAcct = useCurrentAccount();

    useEffect(() => {
        const loadLinks = async () => {
            if (!currAcct) {
                setLinks(undefined);
            } else {
                const res = await listCreatedLinks({
                    address: currAcct.address,
                });
                setLinks(res);
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
                        <p>Balance: {String(bal.amount)} {bal.coinType.split('::')[2]}</p>
                    )}
                </div>)
            }
    </div>;
}
