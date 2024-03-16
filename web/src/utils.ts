import { SuiClient } from '@mysten/sui.js/client';

/**
 * A subset of `CoinMetadata<T>`.
 */
export type CoinInfo = {
    coinType: string,
    symbol: string,
    decimals: number,
    iconUrl: string|null,
};

const coinInfoCache: CoinInfo[] = [
    // mainnet
    {
        coinType: '0x2::sui::SUI',
        symbol: 'SUI', decimals: 9, iconUrl: null,
    },
    {
        coinType: '0x76cb819b01abed502bee8a702b4c2d547532c12f25001c9dea795a5e631c26f1::fud::FUD',
        symbol: 'FUD', decimals: 5, iconUrl: null,
    },
    // testnet
    {
        coinType: '0x1fe2bdb8d9dba5bb2f8f1d987fcb9ab53d0f38b8a42445ebed736d6708ca59d6::fud::FUD',
        symbol: 'FUD', decimals: 5, iconUrl: null,
    },
];

export async function getCoinInfo(coinType: string, client: SuiClient): Promise<CoinInfo> {
    for (const cachedInfo of coinInfoCache) {
        if (cachedInfo.coinType === coinType) {
            return cachedInfo;
        }
    }
    const coinMeta = await client.getCoinMetadata({coinType});
    if (!coinMeta) {
        throw new Error(`CoinMetadata not found for type: ${coinType}`);
    }
    const coinInfo: CoinInfo = {
        coinType,
        symbol: coinMeta.symbol,
        decimals: coinMeta.decimals,
        iconUrl: coinMeta.iconUrl ?? null,
    };
    coinInfoCache.push(coinInfo);
    return coinInfo;
}
