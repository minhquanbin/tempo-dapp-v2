'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useBalance, useReadContract, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits, encodeFunctionData, type Address } from 'viem'
import { Wallet, Send, RefreshCw, LogOut, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { STABLECOINS, MEMO_PREFIX, TEMPO_TESTNET, type StablecoinKey, ERC20_ABI } from '@/app/config/constants'

export default function TempoDApp() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { sendTransaction, data: hash, error: writeError, isPending: isWriting } = useSendTransaction()

  // State
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState<StablecoinKey>('AlphaUSD')
  const [feeToken, setFeeToken] = useState<StablecoinKey>('BetaUSD')
  const [memo, setMemo] = useState('')
  const [txStatus, setTxStatus] = useState('')

  // Native balance
  const { data: nativeBalance, refetch: refetchNative } = useBalance({
    address: address,
  })

  // Token balances
  const { data: alphaBalance, refetch: refetchAlpha } = useReadContract({
    address: STABLECOINS.AlphaUSD.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  const { data: betaBalance, refetch: refetchBeta } = useReadContract({
    address: STABLECOINS.BetaUSD.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  const { data: thetaBalance, refetch: refetchTheta } = useReadContract({
    address: STABLECOINS.ThetaUSD.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  const { data: pathBalance, refetch: refetchPath } = useReadContract({
    address: STABLECOINS.PathUSD.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Handle connection
  const handleConnect = () => {
    const injectedConnector = connectors.find(c => c.id === 'injected')
    if (injectedConnector) {
      connect({ connector: injectedConnector })
      setTxStatus('✅ Wallet connected!')
    }
  }

  // Refresh all balances
  const handleRefreshBalances = () => {
    refetchNative()
    refetchAlpha()
    refetchBeta()
    refetchTheta()
    refetchPath()
    setTxStatus('🔄 Balances refreshed!')
  }

  // Handle send payment with memo
  const handleSendPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!address || !recipient || !amount) {
      setTxStatus('⚠️ Please fill all required fields')
      return
    }

    const tokenConfig = STABLECOINS[selectedToken]
    const amountInSmallestUnit = parseUnits(amount, tokenConfig.decimals)

    // Build full memo
    const fullMemo = memo && memo.trim() 
      ? `${MEMO_PREFIX} (${memo.trim()})` 
      : MEMO_PREFIX

    setTxStatus(`⏳ Processing payment with memo: "${fullMemo}"...`)

    try {
      // Step 1: Encode ERC20 transfer function
      const transferData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [recipient as Address, amountInSmallestUnit],
      })

      // Step 2: Append memo as hex to transaction data
      const memoBytes = new TextEncoder().encode(fullMemo)
      const memoHex = Array.from(memoBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      
      const dataWithMemo = (transferData + memoHex) as `0x${string}`

      console.log('📝 Transaction data breakdown:')
      console.log('  - Transfer function:', transferData)
      console.log('  - Memo text:', fullMemo)
      console.log('  - Memo hex:', memoHex)
      console.log('  - Full data:', dataWithMemo)

      // Step 3: Send transaction with memo appended
      // Note: Fee token selection is UI-ready but requires Tempo's custom RPC integration
      sendTransaction({
        to: tokenConfig.address,
        data: dataWithMemo,
        value: BigInt(0),
      })

      setTxStatus(`💫 Transaction submitted! Memo: "${fullMemo}" | Fee token: ${feeToken}`)
    } catch (error: any) {
      console.error('Transaction error:', error)
      setTxStatus(`❌ Error: ${error.message}`)
    }
  }

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && hash) {
      setTxStatus(`✅ Payment sent with memo! TX: ${hash.substring(0, 10)}...`)
      
      // Clear form
      setRecipient('')
      setAmount('')
      setMemo('')

      // Refresh balances
      setTimeout(() => {
        handleRefreshBalances()
      }, 3000)
    }
  }, [isConfirmed, hash])

  useEffect(() => {
    if (writeError) {
      setTxStatus(`❌ Transaction failed: ${writeError.message}`)
    }
  }, [writeError])

  // Format balance helper
  const formatBalance = (balance: bigint | undefined, decimals: number = 6) => {
    if (!balance) return '0.00'
    return parseFloat(formatUnits(balance, decimals)).toFixed(2)
  }

  // Not connected view
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-purple-600 to-cyan-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Tempo Wallet v2</h1>
            <p className="text-gray-600 mb-2">With Onchain Memo Support</p>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                {TEMPO_TESTNET.name}
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                Memo Enabled
              </span>
            </div>
          </div>
          
          <button
            onClick={handleConnect}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Wallet className="w-5 h-5" />
            Connect MetaMask
          </button>

          <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-sm text-gray-800 mb-2">✨ Features:</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• 📝 Onchain memo support (stored in tx data)</li>
              <li>• 🎯 Pay fees in ANY stablecoin (UI Ready)</li>
              <li>• ⚡ Pure Wagmi + Viem implementation</li>
              <li>• 🔄 ERC20 token transfers</li>
              <li>• 💪 Type-safe transactions</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // Connected view
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Network Status Banner */}
        <div className="mb-4 bg-white rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">{TEMPO_TESTNET.name}</span>
            </div>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
              Wagmi v2
            </span>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
              Memo ✓
            </span>
          </div>
          <button
            onClick={() => disconnect()}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>

        <div className="space-y-6">
          {/* Wallet Info */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Tempo Wallet v2</h1>
            </div>
            
            <div className="bg-gradient-to-r from-purple-100 to-cyan-100 rounded-xl p-4 mb-4">
              <div className="text-sm text-gray-600 mb-1">Connected Address</div>
              <div className="font-mono text-sm text-gray-800 break-all">{address}</div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Stablecoin Balances</h3>
                <button
                  onClick={handleRefreshBalances}
                  className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                  <div className="text-xs text-gray-600 mb-1">AlphaUSD</div>
                  <div className="text-xl font-bold text-gray-800">
                    {formatBalance(alphaBalance as bigint)}
                  </div>
                  <div className="text-xs text-gray-500">AUSD</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
                  <div className="text-xs text-gray-600 mb-1">BetaUSD</div>
                  <div className="text-xl font-bold text-gray-800">
                    {formatBalance(betaBalance as bigint)}
                  </div>
                  <div className="text-xs text-gray-500">BUSD</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
                  <div className="text-xs text-gray-600 mb-1">ThetaUSD</div>
                  <div className="text-xl font-bold text-gray-800">
                    {formatBalance(thetaBalance as bigint)}
                  </div>
                  <div className="text-xs text-gray-500">TUSD</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border-2 border-orange-200">
                  <div className="text-xs text-gray-600 mb-1">PathUSD</div>
                  <div className="text-xl font-bold text-gray-800">
                    {formatBalance(pathBalance as bigint)}
                  </div>
                  <div className="text-xs text-gray-500">PUSD</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border-2 border-yellow-200">
              <div className="text-sm text-gray-600 mb-1">Native Balance (TEMO)</div>
              <div className="text-2xl font-bold text-gray-800">
                {nativeBalance ? formatUnits(nativeBalance.value, 18) : '0.0000'}
              </div>
            </div>
          </div>

          {/* Send Payment Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-purple-600" />
              Send Payment with Memo
            </h2>
            
            <form onSubmit={handleSendPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Token to Send
                </label>
                <select
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value as StablecoinKey)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {Object.keys(STABLECOINS).map(key => (
                    <option key={key} value={key}>
                      {key} ({STABLECOINS[key as StablecoinKey].symbol})
                    </option>
                  ))}
                </select>
              </div>

              {/* PAY FEES IN ANY STABLECOIN - UI FEATURE */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4">
                <label className="block text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                  🎯 Pay Fees With (Select Different Token!)
                  <span className="px-2 py-0.5 bg-green-200 text-green-700 text-xs rounded-full font-semibold">FEATURE</span>
                </label>
                <select
                  value={feeToken}
                  onChange={(e) => setFeeToken(e.target.value as StablecoinKey)}
                  className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                >
                  {Object.keys(STABLECOINS).map(key => (
                    <option key={key} value={key}>
                      {key} ({STABLECOINS[key as StablecoinKey].symbol})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-green-700 mt-2">
                  ✅ UI ready for fee token selection. Integrate with Tempo's RPC for full support.
                </p>
                {selectedToken === feeToken && (
                  <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Try selecting a different fee token!
                  </p>
                )}
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
                  required
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
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📝 Payment Memo (Stored Onchain)
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                    <span className="font-mono text-sm text-gray-700 font-semibold">{MEMO_PREFIX}</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-xs text-gray-500">Invoice prefix (fixed)</span>
                  </div>
                  <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="Add custom note (optional)..."
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-700">
                      <span className="font-semibold">Memo Preview:</span> {memo && memo.trim() ? `${MEMO_PREFIX} (${memo.trim()})` : MEMO_PREFIX}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      💡 This memo will be appended to transaction data and visible on block explorer
                    </p>
                  </div>
                </div>
              </div>
              
              <button
                type="submit"
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
                    Send Payment with Memo
                  </>
                )}
              </button>
            </form>
            
            {txStatus && (
              <div className="mt-4 p-4 rounded-lg text-sm bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 text-blue-800">
                {txStatus}
              </div>
            )}

            {isConfirmed && hash && (
              <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-800 mb-1">Transaction Successful!</p>
                    <a 
                      href={`${TEMPO_TESTNET.explorer}/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 underline"
                    >
                      View on Explorer (Check "Input Data" for memo) →
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="font-semibold text-sm text-gray-800 mb-2">ℹ️ How Onchain Memo Works:</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Memo is encoded as UTF-8 and appended to transaction data</li>
              <li>• Visible in block explorer under "Input Data" field</li>
              <li>• Permanently stored on blockchain</li>
              <li>• Can be decoded by anyone to read the message</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}