import { useOutletContext } from 'react-router-dom';
import { AppContext } from '../App';
import { MAINNET_CONTRACT_IDS, ZkBagContractOptions } from './zksend/zk-bag';

export const TESTNET_IDS: ZkBagContractOptions = {
    packageId: '0x036fee67274d0d85c3532f58296abe0dee86b93864f1b2b9074be6adb388f138',
    bagStoreId: '0x5c63e71734c82c48a3cb9124c54001d1a09736cfb1668b3b30cd92a96dd4d0ce',
    bagStoreTableId: '0x4e1bc4085d64005e03eb4eab2510d527aeba9548cda431cb8f149ff37451f870',
};

export const useZkBagContract = (): ZkBagContractOptions => {

    const { network } = useOutletContext<AppContext>();
    return network === 'mainnet' ? MAINNET_CONTRACT_IDS : TESTNET_IDS;
};
