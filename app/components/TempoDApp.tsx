'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits, type Address } from 'viem'
import { Wallet, Send, RefreshCw, LogOut, Loader2, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'

const TEMPO_TESTNET = {
  name: 'Tempo Testnet',
  explorer: 'https://explore.tempo.xyz',
  rpcUrl: 'https://rpc.testnet.tempo.xyz',
  chainId: 41454
}

const STABLECOINS = {
  AlphaUSD: {
    address: '0x20c0000000000000000000000000000000000001' as Address,
    symbol: 'AUSD',
    decimals: 6
  },
  BetaUSD: {
    address: '0x20c0000000000000000000000000000000000002' as Address,
    symbol: 'BUSD',
    decimals: 6
  },
  ThetaUSD: {
    address: '0x20c0000000000000000000000000000000000003' as Address,
    symbol: 'TUSD',
    decimals: 6
  },
  PathUSD: {
    address: '0x20c0000000000000000000000000000000000000' as Address,
    symbol: 'PUSD',
    decimals: 6
  }
}

type StablecoinKey = keyof typeof STABLECOINS

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }]
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: 'success', type: 'bool' }]
  }
] as const

export default function TempoDApp() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { writeContract, data: hash, error: writeError, isPending: isWriting } = useWriteContract()

  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState<StablecoinKey>('AlphaUSD')
  const [txStatus, setTxStatus] = useState('')

  const { data: nativeBalance, refetch: refetchNative } = useBalance({
    address: address,
  })

  const { data: alphaBalance, refetch: refetchAlpha, isLoading: alphaLoading } = useReadContract({
    address: STABLECOINS.AlphaUSD.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  })

  const { data: betaBalance, refetch: refetchBeta, isLoading: betaLoading } = useReadContract({
    address: STABLECOINS.BetaUSD.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  })

  const { data: thetaBalance, refetch: refetchTheta, isLoading: thetaLoading } = useReadContract({
    address: STABLECOINS.ThetaUSD.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  })

  const { data: pathBalance, refetch: refetchPath, isLoading: pathLoading } = useReadContract({
    address: STABLECOINS.PathUSD.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  })

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const handleConnect = () => {
    const injectedConnector = connectors.find(c => c.id === 'injected')
    if (injectedConnector) {
      connect({ connector: injectedConnector })
      setTxStatus('✅ Kết nối ví thành công!')
    }
  }

  const handleRefreshBalances = () => {
    refetchNative()
    refetchAlpha()
    refetchBeta()
    refetchTheta()
    refetchPath()
    setTxStatus('🔄 Đã làm mới số dư!')
    setTimeout(() => setTxStatus(''), 2000)
  }

  const handleSendPayment = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!address || !recipient || !amount) {
      setTxStatus('⚠️ Vui lòng điền đầy đủ thông tin')
      return
    }

    if (!recipient.startsWith('0x') || recipient.length !== 42) {
      setTxStatus('⚠️ Địa chỉ người nhận không hợp lệ')
      return
    }

    const tokenConfig = STABLECOINS[selectedToken]
    const amountInSmallestUnit = parseUnits(amount, tokenConfig.decimals)

    setTxStatus(`⏳ Đang gửi ${amount} ${tokenConfig.symbol}...`)

    try {
      writeContract({
        address: tokenConfig.address,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [recipient as Address, amountInSmallestUnit],
      })
    } catch (error: any) {
      console.error('Transaction error:', error)
      setTxStatus(`❌ Lỗi: ${error.message}`)
    }
  }

  useEffect(() => {
    if (isConfirmed && hash) {
      setTxStatus(`✅ Giao dịch thành công!`)
      setRecipient('')
      setAmount('')
      setTimeout(() => {
        handleRefreshBalances()
      }, 2000)
    }
  }, [isConfirmed, hash])

  useEffect(() => {
    if (writeError) {
      setTxStatus(`❌ Giao dịch thất bại: ${writeError.message}`)
    }
  }, [writeError])

  const formatBalance = (balance: bigint | undefined, decimals: number = 6, loading: boolean = false) => {
    if (loading) return '...'
    if (!balance) return '0.00'
    return parseFloat(formatUnits(balance, decimals)).toFixed(2)
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-purple-600 to-cyan-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Tempo Wallet</h1>
            <p className="text-gray-600 mb-2">Pure Wagmi v3.0</p>
            <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                {TEMPO_TESTNET.name}
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                Fixed Balance
              </span>
            </div>
          </div>
          
          <button
            onClick={handleConnect}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Wallet className="w-5 h-5" />
            Kết nối MetaMask
          </button>

          <div className="mt-6 space-y-4">
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-sm text-gray-800 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                v3.0 Improvements:
              </h3>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>✅ Fixed balance loading with query enabled</li>
                <li>✅ Address validation</li>
                <li>✅ Loading states for all balances</li>
                <li>✅ Auto refresh after transaction</li>
                <li>✅ Better error handling</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-800">
                  <p className="font-semibold mb-1">Setup Required:</p>
                  <p className="mb-1">Add Tempo Testnet to MetaMask:</p>
                  <ul className="space-y-0.5 ml-3">
                    <li>• RPC: {TEMPO_TESTNET.rpcUrl}</li>
                    <li>• Chain ID: {TEMPO_TESTNET.chainId}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 bg-white rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">{TEMPO_TESTNET.name}</span>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
              v3.0 Fixed
            </span>
          </div>
          <button
            onClick={() => disconnect()}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Disconnect</span>
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">My Wallet</h1>
            </div>
            
            <div className="bg-gradient-to-r from-purple-100 to-cyan-100 rounded-xl p-4 mb-4">
              <div className="text-sm text-gray-600 mb-1">Wallet Address</div>
              <div className="font-mono text-sm text-gray-800 break-all">{address}</div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Stablecoin Balances
                </h3>
                <button
                  onClick={handleRefreshBalances}
                  className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                  <div className="text-xs text-gray-600 mb-1">AlphaUSD</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {formatBalance(alphaBalance as bigint, 6, alphaLoading)}
                  </div>
                  <div className="text-xs text-gray-500">AUSD</div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
                  <div className="text-xs text-gray-600 mb-1">BetaUSD</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {formatBalance(betaBalance as bigint, 6, betaLoading)}
                  </div>
                  <div className="text-xs text-gray-500">BUSD</div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
                  <div className="text-xs text-gray-600 mb-1">ThetaUSD</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {formatBalance(thetaBalance as bigint, 6, thetaLoading)}
                  </div>
                  <div className="text-xs text-gray-500">TUSD</div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border-2 border-orange-200">
                  <div className="text-xs text-gray-600 mb-1">PathUSD</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {formatBalance(pathBalance as bigint, 6, pathLoading)}
                  </div>
                  <div className="text-xs text-gray-500">PUSD</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border-2 border-yellow-200">
              <div className="text-sm text-gray-600 mb-1">Native Balance (TEMO)</div>
              <div className="text-2xl font-bold text-gray-800">
                {nativeBalance ? parseFloat(formatUnits(nativeBalance.value, 18)).toFixed(4) : '0.0000'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Used for transaction fees
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-purple-600" />
              Send Payment
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Token
                </label>
                <select
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value as StablecoinKey)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                >
                  {Object.entries(STABLECOINS).map(([key, config]) => (
                    <option key={key} value={key}>
                      {key} ({config.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <button
                onClick={handleSendPayment}
                disabled={isWriting || isConfirming || !recipient || !amount}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white py-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {(isWriting || isConfirming) ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isWriting ? 'Signing...' : 'Confirming...'}
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Payment
                  </>
                )}
              </button>
            </div>
            
            {txStatus && (
              <div className={`mt-4 p-4 rounded-lg text-sm ${
                txStatus.includes('❌') 
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : txStatus.includes('✅')
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-blue-50 border border-blue-200 text-blue-800'
              }`}>
                {txStatus}
              </div>
            )}

            {isConfirmed && hash && (
              <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-800 mb-2">Transaction Successful!</p>
                    <div className="space-y-1">
                      <p className="text-xs text-green-700 font-mono break-all">
                        TX: {hash}
                      </p>
                      <a 
                        href={`${TEMPO_TESTNET.explorer}/tx/${hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-xs text-blue-600 hover:text-blue-700 underline"
                      >
                        View on Tempo Explorer →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-sm text-gray-800 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              Version 3.0 Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
              <div>
                <p className="font-semibold text-gray-700 mb-1">✅ Fixed:</p>
                <ul className="space-y-1">
                  <li>• Token balance loading (added query.enabled)</li>
                  <li>• Address validation</li>
                  <li>• Clear loading states</li>
                  <li>• Auto refresh after tx</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-1">⚡ Tech Stack:</p>
                <ul className="space-y-1">
                  <li>• Pure Wagmi v2 hooks</li>
                  <li>• No tempo.ts dependency</li>
                  <li>• Standard ERC20 interface</li>
                  <li>• Tempo Testnet ready</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}