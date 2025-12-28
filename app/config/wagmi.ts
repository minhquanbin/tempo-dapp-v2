import { http, createConfig } from 'wagmi'
import { injected } from 'wagmi/connectors'
// Import chain từ tempo.ts thay vì tự define
import { tempoTestnet } from 'tempo.ts/chains'

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