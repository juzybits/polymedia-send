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
import { LinkExternal, NetworkSelector, isLocalhost, loadNetwork } from '@polymedia/webutils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter, Link, Outlet, Route, Routes } from 'react-router-dom';
import './App.less';
import { PageClaim } from './PageClaim';
import { PageHome } from './PageHome';
import { PageNotFound } from './PageNotFound';
import { PageSend } from './PageSend';

/* AppWrapRouter */

export const AppWrapRouter: React.FC = () => {
    return (
    <BrowserRouter>
        <Routes>
            <Route path='/' element={<AppWrapSui />} >
                <Route index element={<PageHome />} />
                <Route path='/send' element={<PageSend />} />
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
    const [network, setNetwork] = useState<NetworkName>(loadNetwork());
    return (
    <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networkConfig} network={network}>
            <WalletProvider autoConnect={true}>
                <App network={network} setNetwork={setNetwork} />
            </WalletProvider>
        </SuiClientProvider>
    </QueryClientProvider>
    );
}

/* App */

export type AppContext = {
    network: NetworkName,
    openConnectModal: () => void,
};

const App: React.FC<{
    network: NetworkName,
    setNetwork: React.Dispatch<React.SetStateAction<NetworkName>>,
}> = ({
    network,
    setNetwork,
}) =>
{
    const currAcct = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();
    const [ showConnectModal, setShowConnectModal ] = useState(false);

    const appContext: AppContext = {
        network,
        openConnectModal: () => { setShowConnectModal(true) },
    };

    const ConnectButton: React.FC = () => {
        return !currAcct
        ?
        <a onClick={() => { setShowConnectModal(true) }}>
            LOG IN
        </a>
        :
        <a onClick={() => { disconnect() }}>
            {shortenSuiAddress(currAcct.address, 3, 3)}
        </a>;
    }

    return <>
    <ConnectModal
        trigger={<></>}
        open={showConnectModal}
        onOpenChange={isOpen => { setShowConnectModal(isOpen) }}
    />

    <div id='layout'>

    <header>
        <h1>
        <img alt='polymedia' src='https://assets.polymedia.app/img/all/logo-nomargin-transparent-512x512.webp' className='logo' />
        zkSend&nbsp;<i>anything</i>
        </h1>
    </header>

    <main>

        <nav>
            <div className='nav-section'>
                <div>
                    <ConnectButton />
                </div>
            </div>

            <div className='nav-section'>
                <NetworkSelector
                    currentNetwork={network}
                    supportedNetworks={isLocalhost() ? undefined : ['mainnet', 'testnet']}
                    onSwitch={newNetwork => { setNetwork(newNetwork) }}
                />
            </div>

            <div className='nav-section'>
                <div>
                    <Link to='/' className={location.pathname == '/' ? 'selected' : ''}>
                        HOME
                    </Link>
                </div>
                <div>
                    <Link to='/send' className={location.pathname == '/send' ? 'selected' : ''}>
                        SEND
                    </Link>
                </div>
            </div>

            {/* <div className='nav-section'>
                <div>
                    <LinkExternal href='https://github.com/juzybits/polymedia-zksend' follow={true}>
                        <img alt='github' src={GITHUB_LOGO} className='logo' />
                    </LinkExternal>
                </div>
                <div>
                    <LinkExternal href='https://polymedia.app' follow={true}>
                        <img alt='polymedia' src='https://assets.polymedia.app/img/all/logo-nomargin-transparent-512x512.webp' className='logo' />
                    </LinkExternal>
                </div>
            </div> */}
        </nav>

        <div id='page'>
            <Outlet context={appContext} />
        </div>

    </main>

    </div>
    </>;
}

const GITHUB_LOGO = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nOTgnIGhlaWdodD0nOTYnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc+PHBhdGggZmlsbC1ydWxlPSdldmVub2RkJyBjbGlwLXJ1bGU9J2V2ZW5vZGQnIGQ9J000OC44NTQgMEMyMS44MzkgMCAwIDIyIDAgNDkuMjE3YzAgMjEuNzU2IDEzLjk5MyA0MC4xNzIgMzMuNDA1IDQ2LjY5IDIuNDI3LjQ5IDMuMzE2LTEuMDU5IDMuMzE2LTIuMzYyIDAtMS4xNDEtLjA4LTUuMDUyLS4wOC05LjEyNy0xMy41OSAyLjkzNC0xNi40Mi01Ljg2Ny0xNi40Mi01Ljg2Ny0yLjE4NC01LjcwNC01LjQyLTcuMTctNS40Mi03LjE3LTQuNDQ4LTMuMDE1LjMyNC0zLjAxNS4zMjQtMy4wMTUgNC45MzQuMzI2IDcuNTIzIDUuMDUyIDcuNTIzIDUuMDUyIDQuMzY3IDcuNDk2IDExLjQwNCA1LjM3OCAxNC4yMzUgNC4wNzQuNDA0LTMuMTc4IDEuNjk5LTUuMzc4IDMuMDc0LTYuNi0xMC44MzktMS4xNDEtMjIuMjQzLTUuMzc4LTIyLjI0My0yNC4yODMgMC01LjM3OCAxLjk0LTkuNzc4IDUuMDE0LTEzLjItLjQ4NS0xLjIyMi0yLjE4NC02LjI3NS40ODYtMTMuMDM4IDAgMCA0LjEyNS0xLjMwNCAxMy40MjYgNS4wNTJhNDYuOTcgNDYuOTcgMCAwIDEgMTIuMjE0LTEuNjNjNC4xMjUgMCA4LjMzLjU3MSAxMi4yMTMgMS42MyA5LjMwMi02LjM1NiAxMy40MjctNS4wNTIgMTMuNDI3LTUuMDUyIDIuNjcgNi43NjMuOTcgMTEuODE2LjQ4NSAxMy4wMzggMy4xNTUgMy40MjIgNS4wMTUgNy44MjIgNS4wMTUgMTMuMiAwIDE4LjkwNS0xMS40MDQgMjMuMDYtMjIuMzI0IDI0LjI4MyAxLjc4IDEuNTQ4IDMuMzE2IDQuNDgxIDMuMzE2IDkuMTI2IDAgNi42LS4wOCAxMS44OTctLjA4IDEzLjUyNiAwIDEuMzA0Ljg5IDIuODUzIDMuMzE2IDIuMzY0IDE5LjQxMi02LjUyIDMzLjQwNS0yNC45MzUgMzMuNDA1LTQ2LjY5MUM5Ny43MDcgMjIgNzUuNzg4IDAgNDguODU0IDB6JyBmaWxsPScjMjQyOTJmJy8+PC9zdmc+';
