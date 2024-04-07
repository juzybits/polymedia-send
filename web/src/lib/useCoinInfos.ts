import { SuiClient } from '@mysten/sui.js/client';
import { useEffect, useState } from 'react';
import { CoinInfo, getCoinInfo } from './getCoinInfo';

export const useCoinInfos = (
    suiClient: SuiClient,
    coinTypes: string[] | undefined,
) => {
    const [coinInfos, setCoinInfos] = useState(new Map<string, CoinInfo|undefined>());
    const [error, setError] = useState<string|undefined>();

    useEffect(() => {
        const loadCoinInfos = async () => {
            setCoinInfos(new Map<string, CoinInfo|undefined>());
            setError(undefined);

            if (typeof coinTypes === 'undefined') {
                return;
            }

            const newCoinInfos = new Map<string, CoinInfo|undefined>();
            const uniqueCoinTypes = Array.from(new Set(coinTypes));
            const errors: string[] = [];
            for (const coinType of uniqueCoinTypes) {
                try {
                    const info = await getCoinInfo(coinType, suiClient); // has internal cache
                    newCoinInfos.set(coinType, info);
                } catch (err) {
                    newCoinInfos.set(coinType, undefined);
                    const errMsg = `Failed to load coin info for ${coinType}: ${String(err)}`;
                    errors.push(errMsg);
                    console.error(`[useCoinInfos] ${errMsg}`);
                }
            }

            if (errors.length > 0) {
                setError(errors.join('\n'));
            }

            setCoinInfos(newCoinInfos);
        };

        loadCoinInfos();
    }, [coinTypes, suiClient]);

    return { coinInfos, error };
};
