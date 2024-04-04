import { SuiClient } from '@mysten/sui.js/client';
import { useEffect, useState } from 'react';
import { CoinInfo, getCoinInfo } from './getCoinInfo';

export const useCoinInfos = (
    suiClient: SuiClient,
    coinTypes: string[] | undefined,
) => {
    const [coinInfos, setCoinInfos] = useState<Record<string, CoinInfo>>({});
    const [error, setError] = useState<string|undefined>();

    useEffect(() => {
        const loadCoinInfo = async () =>
        {
            setCoinInfos({});
            setError(undefined);

            if (typeof coinTypes === 'undefined') {
                return;
            }

            const newInfos: Record<string, CoinInfo> = {};
            const uniqueCoinTypes = Array.from(new Set(coinTypes));
            const errors: string[] = [];
            for (const coinType of uniqueCoinTypes) {
                try {
                    const info = await getCoinInfo(coinType, suiClient); // has internal cache
                    newInfos[coinType] = info;
                } catch (err) {
                    const errMsg = `Failed to load coin info for ${coinType}: ${String(err)}`;
                    errors.push(errMsg);
                    console.error(`[useCoinInfo] ${errMsg}`);
                }
            }

            if (errors.length > 0) {
                setError(errors.join('\n'));
            }

            setCoinInfos(newInfos);
        };

        loadCoinInfo();
    }, [coinTypes, suiClient]);

    return { coinInfos, error };
};
