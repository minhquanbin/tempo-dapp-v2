export const STABLECOINS = {
  AlphaUSD: {
    address: '0x20c0000000000000000000000000000000000001' as `0x${string}`,
    name: 'AlphaUSD',
    symbol: 'AUSD',
    decimals: 6,
  },
  BetaUSD: {
    address: '0x20c0000000000000000000000000000000000002' as `0x${string}`,
    name: 'BetaUSD',
    symbol: 'BUSD',
    decimals: 6,
  },
  ThetaUSD: {
    address: '0x20c0000000000000000000000000000000000003' as `0x${string}`,
    name: 'ThetaUSD',
    symbol: 'TUSD',
    decimals: 6,
  },
  PathUSD: {
    address: '0x20c0000000000000000000000000000000000000' as `0x${string}`,
    name: 'PathUSD',
    symbol: 'PUSD',
    decimals: 6,
  },
} as const

export type StablecoinKey = keyof typeof STABLECOINS

export const MEMO_PREFIX = 'INV123456'

export const TEMPO_TESTNET = {
  chainId: 41454,
  name: 'Tempo Testnet',
  explorer: 'https://explore.tempo.xyz',
}