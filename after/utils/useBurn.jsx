import { useEffect, useState } from "react";
import { Contract } from "ethers";
import { useWallet } from "./useWallet";
import { useChainSelector } from "./useChainSelector";
import { useAppSupplies } from "./useAppSupplies";
import { useAppToast } from "./useAppToast";
import { useEthersSigner } from "./useEthersSigner";
import { CoinGeckoApi } from "./CoinGeckoApi";
import { ChainScanner } from "./ChainScanner";
import {
  fetchAddressForChain,
  isChainTestnet,
  parseEther,
  numberWithCommas,
} from "./utils";
import {
  mainnet,
  avalanche,
  fantom,
  sepolia,
  avalancheFuji,
  fantomTestnet,
} from "./constants";
import { oftAbi } from "./abis";
import { BurnTxProgress } from "./enums";

export const useBurnPage = () => {
  const [burnAmount, setBurnAmount] = useState("");
  const [txButton, setTxButton] =
    useState < BurnTxProgress > BurnTxProgress.default;
  const [txProgress, setTxProgress] = useState < boolean > false;
  const [burnTxHash, setBurnTxHash] = (useState < string) | (null > null);
  const { walletChain } = useWallet();
  const { openConnectModal } = useChainSelector();
  const {
    supplies,
    allSupplies,
    setSuppliesChain,
    suppliesChain,
    fetchSupplies,
  } = useAppSupplies(true);
  const ethersSigner = useEthersSigner({
    chainId: walletChain?.id ?? chainEnum.mainnet,
  });
  const { toastMsg, toastSev, showToast } = useAppToast();

  useEffect(() => {
    if (!walletChain) return;
    let isSubscribed = true;
    if (isSubscribed) setBurnTransactions([]);
    const isTestnet = isChainTestnet(walletChain?.id);
    let _chainObjects: any[] = [mainnet, avalanche, fantom];
    if (isTestnet) _chainObjects = [sepolia, avalancheFuji, fantomTestnet];
    Promise.all(ChainScanner.fetchAllTxPromises(isTestnet))
      .then((results: any) => {
        if (isSubscribed) {
          let new_chain_results: any[] = [];
          results.forEach((results_a: any[], index: number) => {
            new_chain_results.push(
              results_a.map((tx: any) => ({
                ...tx,
                chain: _chainObjects[index],
              }))
            );
          });
          let res = new_chain_results.flat();
          res = ChainScanner.sortOnlyBurnTransactions(res);
          res = res.sort((a: any, b: any) => b.timeStamp - a.timeStamp);
          setBurnTransactions(res);
        }
      })
      .catch((err) => {
        console.log(err);
      });
    return () => {
      isSubscribed = false;
    };
  }, [walletChain, isOldToken]);

  const onChangeBurnAmount = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === "") setBurnAmount("");
    if (isNaN(parseFloat(e.target.value))) return;
    setBurnAmount(e.target.value);
  };

  const executeBurn = async () => {
    if (!isWalletConnected) {
      openConnectModal();
    }
    if (burnAmount === "") {
      console.log("Enter amount to migrate");
      showToast("Enter amount to migrate", ToastSeverity.warning);
      return;
    }
    const newTokenAddress = fetchAddressForChain(walletChain?.id, "newToken");
    const oftTokenContract = new Contract(
      newTokenAddress,
      oftAbi,
      ethersSigner
    );
    let amount = parseEther(burnAmount);
    setTxButton(BurnTxProgress.burning);
    setTxProgress(true);
    try {
      const burnTx = await oftTokenContract.burn(amount);
      setBurnTxHash(burnTx.hash);
      console.log(burnTx, burnTx.hash);
      await burnTx.wait();
      setTxButton(BurnTxProgress.default);
      setTxProgress(false);
      refetchTransactions();
      fetchSupplies();
    } catch (err) {
      console.log(err);
      setTxButton(BurnTxProgress.default);
      setTxProgress(false);
      showToast("Burn Failed!", ToastSeverity.error);
      return;
    }
  };

  return {
    burnAmount,
    setBurnAmount,
    txButton,
    txProgress,
    burnTxHash,
    onChangeBurnAmount,
    executeBurn,
    walletChain,
    supplies,
    allSupplies,
    setSuppliesChain,
    suppliesChain,
    ethersSigner,
    toastMsg,
    toastSev,
    showToast,
  };
};
