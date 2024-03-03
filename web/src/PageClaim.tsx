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

    return <div id='page-send' className='page'>
        {(() => {
            if (!claimableAssets) {
                return <h1>Loading...</h1>;
            }
            return <>
                <div className='content'>
                    {
                        (!claimableAssets.balances.length && !claimableAssets.nfts.length)
                        ?
                        <h1>Assets have already been claimed</h1>
                        :
                        <>
                            <h1>Assets are ready to be claimed</h1>
                            <div>
                                {currAcct && <button onClick={() => { void claimAssets() }}>Claim</button>}
                            </div>
                            {claimableAssets.balances.length &&
                            <>
                                <h3>Balances</h3>
                                <div>
                                    {claimableAssets.balances.map(asset =>
                                        <div key={asset.coinType}>
                                            {String(asset.amount)} {asset.coinType}
                                        </div>
                                    )}
                                </div>
                            </>
                            }
                            {claimableAssets.nfts.length &&
                            <>
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
                            }
                        </>
                    }
                </div>
            </>
        })()}
    </div>;
}
