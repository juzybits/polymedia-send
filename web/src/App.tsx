import {
    ConnectModal,
    SuiClientProvider,
    WalletProvider,
    createNetworkConfig,
    useCurrentAccount,
    useDisconnectWallet,
} from '@mysten/dapp-kit';
import '@mysten/dapp-kit/dist/index.css';
import { getFullnodeUrl } from '@mysten/sui.js/client';
import { NetworkName, shortenSuiAddress } from '@polymedia/suits';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter, Link, Outlet, Route, Routes } from 'react-router-dom';
import './App.less';
import { PageClaim } from './PageClaim';
import { PageNotFound } from './PageNotFound';
import { PageSend } from './PageSend';

/* AppWrapRouter */

export const AppWrapRouter: React.FC = () => {
    return (
    <BrowserRouter>
        <Routes>
            <Route path='/' element={<AppWrapSui />} >
                <Route index element={<PageSend />} />
                <Route path='/claim' element={<PageClaim />} />
                <Route path='*' element={<PageNotFound />} />
            </Route>
        </Routes>
    </BrowserRouter>
    );
}

/* AppWrapSui */

const { networkConfig } = createNetworkConfig({
    localnet: { url: getFullnodeUrl('localnet') },
    devnet: { url: getFullnodeUrl('devnet') },
    testnet: { url: getFullnodeUrl('testnet') },
    mainnet: { url: getFullnodeUrl('mainnet') },
});

const queryClient = new QueryClient();
const AppWrapSui: React.FC = () => {
    // Sui zkSend is only supported on mainnet as of 2024-03-03
    const [ network ] = useState<NetworkName>('mainnet');
    return (
    <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networkConfig} network={network}>
            <WalletProvider autoConnect={true}>
                <App network={network} />
            </WalletProvider>
        </SuiClientProvider>
    </QueryClientProvider>
    );
}

/* App */

export type AppContext = {
    network: NetworkName,
};

const App: React.FC<{
    network: NetworkName,
}> = ({
    network,
}) =>
{
    const currentAccount = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();
    const [ showConnectModal, setShowConnectModal ] = useState(false);

    const appContext: AppContext = {
        network,
    };

    const ConnectButton: React.FC = () => {
        return !currentAccount
        ?
        <div onClick={() => { setShowConnectModal(true) }}>
            LOG IN
        </div>
        :
        <div onClick={() => { disconnect() }}>
            {shortenSuiAddress(currentAccount.address)}
        </div>;
    }

    return <>
    <ConnectModal
        trigger={<></>}
        open={showConnectModal}
        onOpenChange={isOpen => { setShowConnectModal(isOpen) }}
    />

    <div id='layout'>

        <nav id='nav'>
            <ConnectButton />
            <div><Link to='/'>HOME</Link></div>
        </nav>

        <main id='main'>
            <Outlet context={appContext} />
        </main>

    </div>
    </>;
}
