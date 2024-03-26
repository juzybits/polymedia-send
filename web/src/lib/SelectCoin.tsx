import { CoinBalance } from '@mysten/sui.js/client';
import { shortenSuiAddress } from '@polymedia/suits';
import { useState } from 'react';

export const SelectCoin: React.FC<{
    userBalances: CoinBalance[],
    chosenBalance: CoinBalance|undefined,
    setChosenBalance: React.Dispatch<React.SetStateAction<CoinBalance|undefined>>,
    inProgress: boolean,
}> = ({
    userBalances,
    chosenBalance,
    setChosenBalance,
    inProgress,
}) =>
{
    const [ open, setOpen ] = useState(false);
    const [ searchCoin, setSearchCoin ] = useState(''); // TODO

    return <div className={'dropdown' + (open ? ' open' : '')}>
        <input className='dropdown-input'
            type='text'
            value={searchCoin}
            onChange={(e) => { setSearchCoin(e.target.value) }}
            disabled={inProgress || userBalances.length === 0}
            onFocus={() => { setOpen(true) }}
            placeholder={ chosenBalance
                ? shortenSuiAddress(chosenBalance.coinType)
                : (userBalances.length > 0 ? 'choose a coin' : 'no coins found')
            }
            spellCheck='false' autoCorrect='off' autoComplete='off'
        />
        {(() => {
            if (!open) {
                return null;
            }
            if (typeof userBalances === 'undefined') {
                return <div className='dropdown-options'>
                    <div>Loading...</div>
                </div>
            }
            return <div className='dropdown-options'>
                {userBalances.map(bal =>
                <div className='dropdown-option' key={bal.coinType}
                    onClick={() => { setChosenBalance(bal); setOpen(false); }}>
                    {shortenSuiAddress(bal.coinType)}
                </div>)}
            </div>;
        })()}
    </div>;
}