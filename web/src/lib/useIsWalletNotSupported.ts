import { useState, useEffect } from 'react';
import { useCurrentWallet } from '@mysten/dapp-kit';

export const useIsWalletNotSupported = (): boolean => {
    const currWallet = useCurrentWallet();
    const [ walletNotSupported, setWalletNotSupported ] = useState(false);

    useEffect(() => {
        const isEthosMobile = currWallet
            && currWallet.currentWallet?.name.startsWith('Ethos')
            && /mobile/i.test(navigator.userAgent);
        setWalletNotSupported(Boolean(isEthosMobile));
    }, [currWallet]);

    return walletNotSupported;
};
