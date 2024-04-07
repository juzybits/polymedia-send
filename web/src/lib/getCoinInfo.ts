import { SuiClient } from '@mysten/sui.js/client';
import { initialCoinInfo } from './initialCoinInfo';

/**
 * A subset of `CoinMetadata<T>`.
 */
export type CoinInfo = {
    coinType: string,
    symbol: string,
    decimals: number,
    iconUrl: string|null,
};

const coinInfoCache = new Map<string, CoinInfo>(
    initialCoinInfo.map(info => [info.coinType, info])
);

export async function getCoinInfo(coinType: string, client: SuiClient): Promise<CoinInfo> {
    const cachedInfo = coinInfoCache.get(coinType);
    if (cachedInfo) {
        return cachedInfo;
    }

    const coinMeta = await client.getCoinMetadata({ coinType });
    if (!coinMeta) {
        throw new Error(`[getCoinInfo] CoinMetadata not found for type: ${coinType}`);
    }

    const coinInfo: CoinInfo = {
        coinType,
        symbol: coinMeta.symbol,
        decimals: coinMeta.decimals,
        iconUrl: coinMeta.iconUrl ?? null,
    };
    coinInfoCache.set(coinType, coinInfo);

    return coinInfo;
}
