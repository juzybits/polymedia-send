import { useCurrentAccount } from '@mysten/dapp-kit';
import { CoinBalance, SuiClient } from '@mysten/sui.js/client';
import { useEffect, useState } from 'react';

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
                setError(`[useCoinBalances] Failed to load user balances: ${String(err)}`);
            }
        };
        loadUserBalances();
    }, [currAcct, suiClient]);

    return { userBalances, error };
};
