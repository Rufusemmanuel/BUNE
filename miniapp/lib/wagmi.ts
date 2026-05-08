import { http, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";
import { BUILDER_DATA_SUFFIX } from "./builderAttribution";

// Choose chain based on env; default to Base mainnet.
export const CHAIN = (process.env.NEXT_PUBLIC_CHAIN || "base").toLowerCase() === "base-sepolia" ? baseSepolia : base;

export const wagmiConfig = createConfig({
  chains: [CHAIN],
  connectors: [miniAppConnector()],
  transports: {
    [CHAIN.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
  },
  dataSuffix: BUILDER_DATA_SUFFIX,
} as any);
