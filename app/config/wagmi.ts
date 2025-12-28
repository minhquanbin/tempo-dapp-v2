import { http, createConfig } from 'wagmi'
import { tempo } from 'tempo.ts/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [tempo],
  connectors: [
    injected(), // MetaMask connector
  ],
  transports: {
    [tempo.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}