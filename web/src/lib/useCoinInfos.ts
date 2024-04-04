import { SuiClient } from '@mysten/sui.js/client';
import { useEffect, useState } from 'react';
import { CoinInfo, getCoinInfo } from './getCoinInfo';
import { LinkAssets } from './zksend/utils';

type LinkBalance = LinkAssets['balances'][number];

export const useCoinInfos = (
    suiClient: SuiClient,
    balances: LinkBalance[],
): Record<string, CoinInfo | undefined> => {
    const [coinInfos, setCoinInfos] = useState<Record<string, CoinInfo | undefined>>({});

    useEffect(() => {
        const loadCoinInfos = async () => {
            const newCoinInfos: Record<string, CoinInfo|undefined> = {};
            const uniqueCoinTypes = Array.from(new Set(balances.map(bal => bal.coinType)));
            for (const coinType of uniqueCoinTypes) {
                try {
                    const info = await getCoinInfo(coinType, suiClient);
                    newCoinInfos[coinType] = info;
                } catch (err) {
                    console.error(`Failed to load coin info for ${coinType}: ${String(err)}`);
                    newCoinInfos[coinType] = undefined;
                }
            }
            setCoinInfos(currentInfos => ({ ...currentInfos, ...newCoinInfos }));
        };
        loadCoinInfos();
    }, [balances, suiClient]);

    return coinInfos;
};
