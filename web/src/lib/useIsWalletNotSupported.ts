import { useState, useEffect } from 'react';
import { useCurrentWallet } from '@mysten/dapp-kit';

export const useIsWalletNotSupported = (): boolean => {
    const currWallet = useCurrentWallet();
    const [ walletNotSupported, setWalletNotSupported ] = useState(false);

    useEffect(() => {
        const isEthosMobileApp = currWallet
            && currWallet.currentWallet?.name.startsWith('Ethos') // is Ethos Wallet
            && /mobile/i.test(navigator.userAgent) // is mobile browser
            && navigator.userAgent.includes('; wv'); // is WebView in-app browser
        setWalletNotSupported(Boolean(isEthosMobileApp));
    }, [currWallet]);

    return walletNotSupported;
};
