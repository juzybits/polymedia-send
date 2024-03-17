import { useCurrentAccount } from '@mysten/dapp-kit';
import { CoinBalance, SuiClient } from '@mysten/sui.js/client';
import { useEffect, useState } from 'react';
import { CoinInfo, getCoinInfo } from './coininfo';

export const useCoinBalances = (
    suiClient: SuiClient,
    currAcct: ReturnType<typeof useCurrentAccount>,
) => {
    const [userBalances, setUserBalances] = useState<CoinBalance[]>();
    const [error, setError] = useState<string>();

    useEffect(() => {
        const loadUserBalances = async () => {
            setUserBalances(undefined);
            setError(undefined);
            if (!currAcct) {
                return;
            }
            try {
                const balances = await suiClient.getAllBalances({ owner: currAcct.address });
                const nonZeroBalances = balances.filter(bal => BigInt(bal.totalBalance) > 0n);
                setUserBalances(nonZeroBalances);
            } catch (err) {
                setError(`Failed to load user balances: ${String(err)}`);
            }
        };
        loadUserBalances();
    }, [currAcct, suiClient]);

    return { userBalances, error };
};

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
