import { useCurrentAccount } from '@mysten/dapp-kit';
import { ZkSendLink } from '@mysten/zksend';
import { shortenSuiAddress } from '@polymedia/suits';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AppContext } from './App';

type ListClaimableAssetsReturnType = Awaited<ReturnType<InstanceType<typeof ZkSendLink>['listClaimableAssets']>>;

export const PageClaim: React.FC = () =>
{
    const currAcct = useCurrentAccount();
    const { openConnectModal } = useOutletContext<AppContext>();
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
                        <>
                            <h1>Assets have already been claimed</h1>
                            <div>
                                <p>
                                The funds associated with this link are no longer available.
                                </p>
                            </div>
                        </>
                        :
                        <>
                            <h1>Assets are ready to be claimed</h1>
                            <div>
                                <p>
                                The person who shared this link with you is attempting to send you the following funds.
                                </p>
                            </div>
                            <div style={{marginBottom: '3rem'}}>
                                {claimableAssets.balances.length &&
                                <>
                                    <h3>Balances</h3>
                                    <div>
                                        {claimableAssets.balances.map(asset =>
                                            <div key={asset.coinType}>
                                                {String(asset.amount)} {shortenSuiAddress(asset.coinType, 3, 3, '0x', '...')}
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
                            </div>
                            <div>
                                {!currAcct
                                ? <button className='btn' onClick={openConnectModal}>LOG IN</button>
                                : <button className='btn' onClick={() => { void claimAssets() }}>CLAIM ASSETS</button>
                                }
                            </div>
                        </>
                    }
                </div>
            </>
        })()}
    </div>;
}
