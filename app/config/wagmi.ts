import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { defineChain } from 'viem'
import { tempoActions } from 'tempo.ts/viem'

// Define Tempo Testnet chain
export const tempoTestnet = defineChain({
  id: 88194,
  name: 'Tempo Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'TEMO',
    symbol: 'TEMO',
  },
  rpcUrls: {
    default: {
      http: ['https://tempo-testnet.calderachain.xyz/http'],
      webSocket: ['wss://tempo-testnet.calderachain.xyz/ws'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explore.tempo.xyz' },
  },
  testnet: true,
})

// Create and export wagmi config with Tempo support
export const config = createConfig({
  chains: [tempoTestnet],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [tempoTestnet.id]: http(),
  },
  ssr: true,
})

// Export config with Tempo actions for direct client usage
export const tempoClient = config.getClient({ chainId: tempoTestnet.id }).extend(tempoActions())

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}