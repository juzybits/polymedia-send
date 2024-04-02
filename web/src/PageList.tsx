import { useCurrentAccount } from '@mysten/dapp-kit';
import { listCreatedLinks } from './lib/zksend/list-created-links';
import { useEffect } from 'react';

export const PageList: React.FC = () =>
{
    const currAcct = useCurrentAccount();
    useEffect(() => {
        if (currAcct) {
            (async () => {
                const { links, /*hasNextPage, cursor*/ } = await listCreatedLinks({
                    address: currAcct.address,
                });
                console.log("=== LINKS ===");
                for (const link of links) {
                    // const { nfts, balances } = await links[0].assets;
                    console.log(link);
                }
            })();
        }
    }, [currAcct]);

    return <div id='page-list'>
        <h1>Your links</h1>
        <p>Soon...</p>
    </div>;
}
