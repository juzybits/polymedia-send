import { useCurrentAccount, useSignTransaction, useSuiClient } from "@mysten/dapp-kit";
import { CoinBalance } from "@mysten/sui/client";
import { useCoinMetas } from "@polymedia/coinmeta-react";
import { formatBalance, stringToBalance } from "@polymedia/suitcase-core";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { Button } from "./lib/Button";
import { ErrorBox } from "./lib/ErrorBox";
import { LogInToContinue } from "./lib/LogInToContinue";
import { SelectCoin } from "./lib/SelectCoin";
import { useCoinBalances } from "./lib/useCoinBalances";
import { useIsSupportedWallet } from "./lib/useIsSupportedWallet";
import { ZkSendLinkBuilder } from "./lib/zksend";

export const PageSend: React.FC = () =>
{
    const navigate = useNavigate();

    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutateAsync: signTransaction } = useSignTransaction();

    const { inProgress, setInProgress, setModalContent } = useOutletContext<AppContext>();
    const isSupportedWallet = useIsSupportedWallet();

    const [ errMsg, setErrMsg ] = useState<string|null>(null);
    const [ chosenBalance, setChosenBalance ] = useState<CoinBalance>(); // dropdown
    const [ chosenAmount, setChosenAmount ] = useState(""); // numeric input

    // fetch all balances in the user's wallet
    const { userBalances, error: errBalances } = useCoinBalances(suiClient, currAcct);
    // extract the coin types from the user balances
    const allCoinTypes = useMemo(() => userBalances?.map(bal => bal.coinType), [userBalances]);
    // get the CoinMetadata for each coin type
    const { coinMetas, errorCoinMetas } = useCoinMetas(suiClient, allCoinTypes);
    // pick the CoinMetadata for selected balance
    const coinMeta = (!chosenBalance || !coinMetas) ? null : coinMetas.get(chosenBalance.coinType);

    useEffect(() => {
        const resetState = () => {
            setInProgress(false);
            setErrMsg(null);
            setChosenBalance(undefined);
            setChosenAmount("");
        };
        resetState();
    }, [currAcct, suiClient]);

    const createLink = async (coinType: string, amountWithDec: bigint) => {
        setErrMsg(null);

        if (!currAcct)
            return;

        setInProgress(true);
        try {
            const link = new ZkSendLinkBuilder({
                host: window.location.origin,
                path: "/claim",
                // mist?: number;
                // keypair?: Keypair;
                client: suiClient,
                sender: currAcct.address,
                // redirect?: ZkSendLinkRedirect;
            });

            link.addClaimableBalance(coinType, amountWithDec);

            const tx = await link.createSendTransaction();

            const signedTx = await signTransaction({
                transaction: tx,
            });

            setModalContent("⏳ Creating link...");

            const resp = await suiClient.executeTransactionBlock({
                transactionBlock: signedTx.bytes,
                signature: signedTx.signature,
                options: { showEffects: true },
            });
            console.debug("resp:", resp);

            if (resp.errors || resp.effects?.status.status !== "success") {
                setErrMsg(`Txn digest: ${resp.digest}\n`
                    + `Txn status: ${resp.effects?.status.status}\n`
                    + `Txn errors: ${JSON.stringify(resp.errors)}`);
            } else {
                const url = link.getLink();
                const secret = url.split("#")[1];
                navigate("/claim#" + secret, {
                    state: { createdLinkUrl: url }
                });
            }
        } catch (err) {
            setErrMsg(String(err));
        } finally {
            setInProgress(false);
            setModalContent(null);
        }
    };

    const error = errMsg ?? errBalances ?? errorCoinMetas ?? null;

    return <div id="page-content">

    <h1>Create one link</h1>

    {(() => {
        if (!isSupportedWallet) {
            return <p>This wallet is not supported.</p>;
        }

        if (!currAcct) {
            return <LogInToContinue />;
        }

        if (!userBalances) {
            return <p>Loading balances...</p>;
        }

        return <>
            {coinMetas && <SelectCoin
                userBalances={userBalances}
                chosenBalance={chosenBalance}
                coinMetas={coinMetas}
                setChosenBalance={setChosenBalance}
                inProgress={inProgress}
            />}

            {(() => {
                if (!chosenBalance) {
                    return <></>;
                }

                if (!coinMetas || !coinMeta) {
                    return <p>Loading coin info...</p>;
                }

                // Validate amount
                const amountStr = chosenAmount === "." ? "0" : chosenAmount;
                const amountWithDec = stringToBalance(amountStr, coinMeta.decimals);
                const amountErr = (() => {
                    if (chosenAmount === "" || chosenAmount === ".") {
                        return "";
                    }
                    if (amountWithDec === 0n) {
                        return "Amount can't be 0";
                    }
                    const userBalanceWithDec = BigInt(chosenBalance.totalBalance);
                    if (amountWithDec > userBalanceWithDec) {
                        return "Not enough balance";
                    }
                    return "";
                })();

                const disableSendBtn = chosenAmount === "" || chosenAmount === "." || amountErr !== "" || inProgress;

                return <>
                <div>
                    <input type="text" inputMode="numeric" pattern={`^[0-9]*\\.?[0-9]{0,${coinMeta.decimals}}$`}
                        value={chosenAmount} disabled={inProgress}
                        onChange={e => { setChosenAmount(e.target.validity.valid ? e.target.value : chosenAmount); }}
                        onKeyDown={e => { if (e.key === "Enter" && !disableSendBtn) { createLink(chosenBalance.coinType, amountWithDec); } }}
                        placeholder="enter amount"
                    />
                </div>

                <div className="tight">
                    <p>
                        Your balance: {formatBalance(BigInt(chosenBalance.totalBalance), coinMeta.decimals, "compact")} {coinMeta.symbol}
                    </p>
                    <p>
                        Amount to send: {formatBalance(amountWithDec, coinMeta.decimals, "compact")} {coinMeta.symbol}
                    </p>
                </div>

                {amountErr &&
                <div className="error-box">
                    Error: {amountErr}
                </div>}

                <Button
                    disabled={disableSendBtn}
                    onClick={() => { createLink(chosenBalance.coinType, amountWithDec);}}
                >CREATE LINK</Button>
                </>;
            })()}
        </>;
    })()}

    <ErrorBox err={error} />

    </div>;
};
