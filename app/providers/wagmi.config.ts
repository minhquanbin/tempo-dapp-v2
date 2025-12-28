import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { defineChain } from 'viem'

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

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}