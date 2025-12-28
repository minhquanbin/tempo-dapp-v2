import { http, createConfig } from 'wagmi'
import { defineChain } from 'viem'
import { injected } from 'wagmi/connectors'

// Define Tempo Testnet chain
export const tempoTestnet = defineChain({
  id: 41454,
  name: 'Tempo Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'TEMO',
    symbol: 'TEMO',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.tempo.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Tempo Explorer',
      url: 'https://explore.tempo.xyz',
    },
  },
  testnet: true,
})

export const config = createConfig({
  chains: [tempoTestnet],
  connectors: [
    injected(), // MetaMask connector
  ],
  transports: {
    [tempoTestnet.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}