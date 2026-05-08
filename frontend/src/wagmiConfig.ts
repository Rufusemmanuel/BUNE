import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'
import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { base } from 'wagmi/chains'
import { BUILDER_DATA_SUFFIX } from './lib/builderAttribution'

const rpcUrl = import.meta.env.VITE_RPC_URL

export const farcasterConnector = farcasterMiniApp()
export const injectedConnector = injected({ shimDisconnect: false })

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [farcasterConnector, injectedConnector],
  transports: {
    [base.id]: http(rpcUrl),
  },
  dataSuffix: BUILDER_DATA_SUFFIX,
  ssr: false,
  syncConnectedChain: true,
} as any)
