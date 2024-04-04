import { useState, useEffect } from 'react';
import { useCurrentWallet } from '@mysten/dapp-kit';

const unsupportedWallets = ['Ethos', 'Mofa'];

export const useIsSupportedWallet = (): boolean => {
    const currWallet = useCurrentWallet();
    const [ supported, setSupported ] = useState(true);

    useEffect(() => {
        const walletName = currWallet.currentWallet?.name;
        const notSupported =
            walletName
            && /mobile/i.test(navigator.userAgent) // is mobile browser
            && navigator.userAgent.includes('; wv') // is WebView in-wallet browser
            && unsupportedWallets.some(prefix => walletName.startsWith(prefix));
        setSupported(!notSupported);
    }, [currWallet.currentWallet?.name]);

    return supported;
};
