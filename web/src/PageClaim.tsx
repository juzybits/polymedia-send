import { useCurrentAccount } from '@mysten/dapp-kit';
import { ZkSendLink } from '@mysten/zksend';
import { useEffect, useState } from 'react';

type ListClaimableAssetsReturnType = Awaited<ReturnType<InstanceType<typeof ZkSendLink>['listClaimableAssets']>>;

export const PageClaim: React.FC = () =>
{
    const currAcct = useCurrentAccount();
    const [ claimableAssets, setClaimableAssets ] = useState<ListClaimableAssetsReturnType>();

    useEffect(() => {
        void loadClaimableAssets();
    }, []);

    const loadClaimableAssets = async () => {
        const link = await ZkSendLink.fromUrl(window.location.href);
        const assets = await link.listClaimableAssets('');
        console.debug('assets:', assets);
        setClaimableAssets(assets);
    };

    const claimAssets = async () => {
        if (!currAcct) return;
        const link = await ZkSendLink.fromUrl(window.location.href);
        const resp = await link.claimAssets(currAcct.address);
        console.debug('resp:', resp);
    };


    const ClaimableAssets: React.FC = () => {
        if (!claimableAssets) {
            return <>Loading...</>;
        }
        return <>
            <h3>Balances</h3>
            <div>
                {claimableAssets.balances.map(asset =>
                    <div key={asset.coinType}>
                        {String(asset.amount)} {asset.coinType}
                    </div>
                )}
            </div>
            <h3>Objects</h3>
            <div>
                {claimableAssets.nfts.map(asset =>
                    <div key={asset.objectId}>
                        {asset.objectId}<br/>
                        {asset.type}<br/>
                    </div>
                )}
            </div>
        </>
    };

    return <div id='page-send' className='page'>
        <h1>zkSend any Sui coin</h1>
        <div className='content'>
            <div>
                {currAcct && <button onClick={() => { void claimAssets() }}>Claim</button>}
            </div>
            <h2>Claimable assets:</h2>
            <ClaimableAssets />
        </div>
    </div>;
}
