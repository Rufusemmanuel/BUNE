import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider, http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'viem/chains'
import type { Chain } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './ui/App'
import './style.css'

const chainId = Number(import.meta.env.VITE_CHAIN_ID || 84532)
const chains = [baseSepolia, base] as const satisfies readonly [Chain, ...Chain[]]
const rpcUrl = import.meta.env.VITE_RPC_URL

const config = createConfig({
  chains,
  connectors: [
    injected({ shimDisconnect: true })
  ],
  transports: {
    [base.id]: http(rpcUrl),
    [baseSepolia.id]: http(rpcUrl)
  },
  ssr: false,
  syncConnectedChain: true
})

const qc = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={qc}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
)

// Signal readiness to Farcaster/Base Mini App hosts so splash hides
try {
  if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
    const msgVariants = [
      { type: 'miniapp.ready' },
      { type: 'miniapp_ready' },
      { type: 'base.miniapp.ready' },
      { type: 'ready' },
      // Farcaster Mini Apps SDK compatibility
      { type: 'sdk.actions.ready' },
      { type: 'actions.ready' }
    ]
    const signal = () => {
      if ((window as any).__miniappReadySignalled) return
      ;(window as any).__miniappReadySignalled = true
      msgVariants.forEach((m) => { try { window.parent.postMessage(m, '*') } catch {} })
      try {
        const g: any = (window as any)
        if (g.sdk && g.sdk.actions && typeof g.sdk.actions.ready === 'function') g.sdk.actions.ready()
        if (g.actions && typeof g.actions.ready === 'function') g.actions.ready()
      } catch {}
    }

    // Initial attempt right after mount
    signal()

    // Reply to potential handshake/ping messages from host
    try {
      window.addEventListener('message', (ev: MessageEvent) => {
        const t = (ev?.data && (ev.data.type || ev.data.event || ev.data.action) || '').toString().toLowerCase()
        if (t.includes('ready') || t.includes('init') || t.includes('ping') || t.includes('load') || t.includes('miniapp')) signal()
      })
    } catch {}

    // Poll for SDK injection for a few seconds and call when available
    let tries = 0
    const iv = setInterval(() => {
      tries += 1
      try {
        const g: any = (window as any)
        if (g.sdk && g.sdk.actions && typeof g.sdk.actions.ready === 'function') {
          g.sdk.actions.ready(); signal(); clearInterval(iv)
        } else if (g.actions && typeof g.actions.ready === 'function') {
          g.actions.ready(); signal(); clearInterval(iv)
        } else {
          // re-signal via postMessage until SDK listens
          msgVariants.forEach((m) => { try { window.parent.postMessage(m, '*') } catch {} })
        }
      } catch {}
      if (tries > 20) clearInterval(iv)
    }, 250)
  }
} catch {}
