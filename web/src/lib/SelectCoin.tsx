import { CoinBalance, CoinMetadata } from "@mysten/sui.js/client";
import { useEffect, useRef, useState } from "react";
import { ReactSetter } from "../App";
import { useClickOutside } from "@polymedia/webutils";

export const SelectCoin: React.FC<{
    userBalances: CoinBalance[],
    chosenBalance: CoinBalance|undefined,
    coinMetas: Map<string, CoinMetadata | null>,
    setChosenBalance: ReactSetter<CoinBalance|undefined>,
    inProgress: boolean,
}> = ({
    userBalances,
    chosenBalance,
    coinMetas,
    setChosenBalance,
    inProgress,
}) =>
{
    const [ open, setOpen ] = useState(false);
    const [ searchCoin, setSearchCoin ] = useState("");

    const selectorRef = useRef(null);
    useClickOutside(selectorRef, () => { setOpen(false) });

    const sortedBalances = userBalances.sort((a, b) => {
        const symbolA = a.coinType.split("::")[2];
        const symbolB = b.coinType.split("::")[2];
        return symbolA.localeCompare(symbolB);
    });

    const foundBalances = searchCoin.length < 2 ? sortedBalances :
    sortedBalances.filter(bal => {
        const search = searchCoin.toLowerCase();
        const coinType = bal.coinType.toLowerCase();
        return coinType.includes(search);
    });

    useEffect(() => {
    //     const fud = sortedBalances.filter(b => b.coinType.endsWith('::fud::FUD'));
    //     fud.length && setChosenBalance(fud[0]);
    }, []);

    const chosenCoinMeta = chosenBalance && coinMetas.get(chosenBalance.coinType);
    const chosenCoinSymbol = chosenBalance && (chosenCoinMeta?.symbol ?? chosenBalance.coinType.split("::")[2]);

    return <div>
    <div className={"dropdown" + (open ? " open" : "")} ref={selectorRef}>
        <input className='dropdown-input'
            type='text'
            value={searchCoin}
            onChange={(e) => { setSearchCoin(e.target.value) }}
            onClick={() => { setSearchCoin("") }}

            disabled={inProgress || sortedBalances.length === 0}
            onFocus={() => { setOpen(true) }}
            placeholder={ chosenBalance
                ? chosenCoinSymbol
                : (sortedBalances.length > 0 ? "choose a coin" : "no coins found")
            }
            spellCheck='false' autoCorrect='off' autoComplete='off'
        />
        {(() => {
            if (!open) {
                return null;
            }
            return <div className='dropdown-options'>
                {foundBalances.map(bal => {
                const coinMeta = coinMetas.get(bal.coinType);
                const coinSymbol = coinMeta?.symbol ?? bal.coinType.split("::")[2];
                return (
                <div className='dropdown-option' key={bal.coinType}
                    onClick={() => {
                        setChosenBalance(bal);
                        setSearchCoin(coinSymbol);
                        setOpen(false);
                    }}>
                    {<img src={coinMeta?.iconUrl ?? ""} height="30" width="30" />}
                    <span>{coinSymbol}</span>
                </div>
                )})}
            </div>;
        })()}
    </div>
    </div>;
}
