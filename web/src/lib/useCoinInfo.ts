import { CoinBalance, SuiClient } from '@mysten/sui.js/client';
import { useEffect, useState } from 'react';
import { CoinInfo, getCoinInfo } from './getCoinInfo';

export const useCoinInfo = (
    suiClient: SuiClient,
    chosenBalance: CoinBalance|undefined,
) => {
    const [coinInfo, setCoinInfo] = useState<CoinInfo>();
    const [error, setError] = useState<string | undefined>();

    useEffect(() => {
        const loadCoinInfo = async () => {
            setCoinInfo(undefined);
            setError(undefined);
            if (!chosenBalance) {
                return;
            }
            try {
                const info = await getCoinInfo(chosenBalance.coinType, suiClient);
                setCoinInfo(info);
            } catch (err) {
                setError(`Failed to load coin info: ${String(err)}`);
            }
        };
        loadCoinInfo();
    }, [chosenBalance, suiClient]);

    return { coinInfo, error };
};
