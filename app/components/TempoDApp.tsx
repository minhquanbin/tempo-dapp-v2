'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract } from 'wagmi'
import { parseUnits, formatUnits, stringToHex, pad, type Address } from 'viem'
import { Wallet, Send, RefreshCw, LogOut, Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { Hooks } from 'tempo.ts/wagmi'

// Constants
const TEMPO_TESTNET = {
  name: 'Tempo Testnet',
  explorer: 'https://explore.tempo.xyz'
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

const MEMO_PREFIX = 'INV123456'

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }]
  }
] as const

export default function TempoDApp() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  // Use Tempo.ts useTransferSync for transfer with fee token support
  const sendPayment = Hooks.token.useTransferSync()

  // Get token balances using standard wagmi useReadContract
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

  // State
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState<StablecoinKey>('AlphaUSD')
  const [feeToken, setFeeToken] = useState<StablecoinKey>('BetaUSD')
  const [memo, setMemo] = useState('')
  const [txStatus, setTxStatus] = useState('')

  // Handle connection
  const handleConnect = () => {
    const injectedConnector = connectors.find(c => c.id === 'injected')
    if (injectedConnector) {
      connect({ connector: injectedConnector })
      setTxStatus('✅ Wallet đã kết nối!')
    }
  }

  // Refresh all balances
  const handleRefreshBalances = () => {
    refetchAlpha()
    refetchBeta()
    refetchTheta()
    refetchPath()
    setTxStatus('🔄 Đã làm mới số dư!')
  }

  // Handle send payment with FEE TOKEN SUPPORT
  const handleSendPayment = () => {
    if (!address || !recipient || !amount) {
      setTxStatus('⚠️ Vui lòng điền đầy đủ thông tin')
      return
    }

    const tokenConfig = STABLECOINS[selectedToken]
    const feeTokenConfig = STABLECOINS[feeToken]
    const amountInSmallestUnit = parseUnits(amount, tokenConfig.decimals)

    // Build memo if provided (32-byte format)
    let memoBytes: `0x${string}` | undefined
    if (memo && memo.trim()) {
      const fullMemo = `${MEMO_PREFIX} (${memo.trim()})`
      memoBytes = pad(stringToHex(fullMemo), { size: 32 })
    }

    setTxStatus(`⏳ Đang xử lý giao dịch...`)

    try {
      console.log('📝 Chi tiết giao dịch:')
      console.log('  - Token gửi:', selectedToken, tokenConfig.address)
      console.log('  - Token trả phí:', feeToken, feeTokenConfig.address)
      console.log('  - Số lượng:', amount)
      console.log('  - Memo:', memoBytes || 'No memo')

      // GỬI BẰNG TEMPO.TS HOOK VỚI FEE TOKEN SUPPORT
      sendPayment.mutate({
        amount: amountInSmallestUnit,
        to: recipient as Address,
        token: tokenConfig.address,
        feeToken: feeTokenConfig.address, // ← HOẠT ĐỘNG THẬT!
        ...(memoBytes && { memo: memoBytes })
      })

      setTxStatus(`💫 Đã gửi giao dịch! Token: ${selectedToken}, Fee: ${feeToken}`)
      
    } catch (error: any) {
      console.error('Lỗi giao dịch:', error)
      setTxStatus(`❌ Lỗi: ${error.message}`)
    }
  }

  // Handle transaction success
  useEffect(() => {
    if (sendPayment.data?.receipt) {
      const hash = sendPayment.data.receipt.transactionHash
      setTxStatus(`✅ Thanh toán thành công! TX: ${hash.substring(0, 10)}...`)
      
      // Clear form
      setRecipient('')
      setAmount('')
      setMemo('')

      // Refresh balances
      setTimeout(() => {
        handleRefreshBalances()
      }, 2000)
    }
  }, [sendPayment.data])

  // Handle errors
  useEffect(() => {
    if (sendPayment.error) {
      setTxStatus(`❌ Giao dịch thất bại: ${sendPayment.error.message}`)
    }
  }, [sendPayment.error])

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
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Tempo Wallet v3.0</h1>
            <p className="text-gray-600 mb-2">Real Fee Token Support</p>
            <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                {TEMPO_TESTNET.name}
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                tempo.ts v0.12
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

          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <h3 className="font-semibold text-sm text-gray-800 mb-2">🎉 Version 3.0 Features:</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>✅ Dùng tempo.ts/wagmi hooks</li>
              <li>✅ FEE TOKEN hoạt động thực sự!</li>
              <li>✅ Memo support với 32-byte format</li>
              <li>✅ Ổn định và production-ready</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800">
                <p className="font-semibold mb-1">Về tính năng Fee Token:</p>
                <p>App này sử dụng Hooks.token.useTransferSync() từ tempo.ts/wagmi, cho phép chọn token trả phí thực sự thông qua tham số feeToken.</p>
              </div>
            </div>
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
        <div className="mb-4 bg-white rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">{TEMPO_TESTNET.name}</span>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
              tempo.ts v0.12
            </span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
              Fee Token ✓
            </span>
          </div>
          <button
            onClick={() => disconnect()}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Ngắt kết nối
          </button>
        </div>

        <div className="space-y-6">
          {/* Wallet Info */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Tempo Wallet v3.0</h1>
            </div>
            
            <div className="bg-gradient-to-r from-purple-100 to-cyan-100 rounded-xl p-4 mb-4">
              <div className="text-sm text-gray-600 mb-1">Địa chỉ ví</div>
              <div className="font-mono text-sm text-gray-800 break-all">{address}</div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Số dư Stablecoin</h3>
                <button
                  onClick={handleRefreshBalances}
                  className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Làm mới
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
          </div>

          {/* Send Payment Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-purple-600" />
              Gửi thanh toán
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn Token để gửi
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

              {/* REAL FEE TOKEN SELECTION */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4">
                <label className="block text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                  💰 Trả phí bằng
                  <span className="px-2 py-0.5 bg-green-200 text-green-700 text-xs rounded-full font-semibold">WORKING!</span>
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
                <p className="text-xs text-green-700 mt-2 flex items-start gap-1">
                  <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Tính năng này hoạt động thực sự! Phí sẽ được trả bằng token bạn chọn.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Địa chỉ người nhận
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
                  Số lượng
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📝 Memo thanh toán (Tùy chọn)
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                    <span className="font-mono text-sm text-gray-700 font-semibold">{MEMO_PREFIX}</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-xs text-gray-500">Mã hóa đơn</span>
                  </div>
                  <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="Thêm ghi chú..."
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-700 flex items-start gap-1">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      Memo sẽ được gửi dưới dạng 32-byte hex string trong transaction.
                    </p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleSendPayment}
                disabled={sendPayment.isPending || !recipient || !amount}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white py-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {sendPayment.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Gửi thanh toán
                  </>
                )}
              </button>
            </div>
            
            {txStatus && (
              <div className="mt-4 p-4 rounded-lg text-sm bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 text-blue-800">
                {txStatus}
              </div>
            )}

            {sendPayment.data?.receipt && (
              <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-800 mb-1">Giao dịch thành công!</p>
                    <a 
                      href={`${TEMPO_TESTNET.explorer}/tx/${sendPayment.data.receipt.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 underline"
                    >
                      Xem trên Explorer →
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="font-semibold text-sm text-gray-800 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Version 3.0 - Production Ready
            </h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>✅ Sử dụng tempo.ts/wagmi v0.12 (stable)</li>
              <li>✅ Fee token: Hoạt động thực sự với feeToken param</li>
              <li>✅ Memo: Gửi dưới dạng 32-byte hex trong transaction</li>
              <li>✅ Hooks.token.useTransferSync() cho transfer</li>
              <li>✅ useReadContract() cho balance checking</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}