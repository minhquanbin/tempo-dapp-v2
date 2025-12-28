import { createConfig, http } from 'wagmi'
import { tempoTestnet } from 'viem/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [tempoTestnet],
  connectors: [injected()],
  transports: {
    [tempoTestnet.id]: http(),
  },
})