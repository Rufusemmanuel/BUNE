"use client";

import { useAccount, useSendTransaction, useWriteContract } from "wagmi";
import { useSendCalls } from "wagmi/experimental";
import {
  sendCallsWithBuilderCode,
  sendTransactionWithBuilderCode,
  writeContractWithBuilderCode,
} from "./builderAttribution";

async function getProvider(connector: any) {
  return connector?.getProvider ? connector.getProvider() : (globalThis as any)?.ethereum;
}

export function useBuilderSendCalls() {
  const { address, connector } = useAccount() as any;
  const sendCalls = useSendCalls() as any;

  return {
    ...sendCalls,
    sendCallsAsync: async (params: any) =>
      sendCallsWithBuilderCode({
        ...params,
        from: params.from || address,
        sendCallsAsync: sendCalls.sendCallsAsync,
        provider: await getProvider(connector),
      }),
  };
}

export function useBuilderSendTransaction() {
  const { connector } = useAccount() as any;
  const sendTx = useSendTransaction() as any;

  return {
    ...sendTx,
    sendTransactionAsync: async (tx: any) =>
      sendTransactionWithBuilderCode(await getProvider(connector), tx),
  };
}

export function useBuilderWriteContract() {
  const { address, connector } = useAccount() as any;
  const write = useWriteContract() as any;

  return {
    ...write,
    writeContractAsync: async (params: any) =>
      writeContractWithBuilderCode(await getProvider(connector), {
        from: params.account || address,
        ...params,
      }),
  };
}
