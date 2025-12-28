'use client'

import { useState } from 'react'
import { Hooks } from 'tempo.ts/wagmi'
import { useAccount, useConnect, useDisconnect, useReadContract } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { Wallet, Send, RefreshCw, LogOut, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

// Constants
const TEMPO_TESTNET = {
  name: 'Tempo Testnet',
  explorer: 'https://explore.tempo.xyz'
}

const STABLECOINS = {
  AlphaUSD: {
    address: '0x20c0000000000000000000000000000000000001' as `0x${string}`,
    symbol: 'AUSD',
    decimals: 6
  },
  BetaUSD: {
    address: '0x20c0000000000000000000000000000000000002' as `0x${string}`,
    symbol: 'BUSD',
    decimals: 6
  },
  ThetaUSD: {
    address: '0x20c0000000000000000000000000000000000003' as `0x${string}`,
    symbol: 'TUSD',
    decimals: 6
  },
  PathUSD: {
    address: '0x20c0000000000000000000000000000000000000' as `0x${string}`,
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

const MEMO_PREFIX = 'INV123456'

export default function TempoDApp() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  // State
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState<StablecoinKey>('AlphaUSD')
  const [feeToken, setFeeToken] = useState<StablecoinKey>('BetaUSD')
  const [memo, setMemo] = useState('')

  // Tempo.ts Hooks - Token Transfer với Fee Token
  const sendPayment = Hooks.token.useTransferSync()
  
  // KHÔNG DÙNG tempo.ts hooks nữa - có vấn đề với chain
  // Dùng wagmi hooks thay thế
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

  // Faucet hook
  const { mutate: fundAccount, isPending: isFunding } = Hooks.faucet.useFundSync()

  // Handle connection
  const handleConnect = () => {
    const injectedConnector = connectors.find(c => c.id === 'injected')
    if (injectedConnector) {
      connect({ connector: injectedConnector })
    }
  }

  // Handle refresh balances
  const handleRefreshBalances = () => {
    refetchAlpha()
    refetchBeta()
    refetchTheta()
    refetchPath()
  }

  // Handle add funds
  const handleAddFunds = () => {
    if (address) {
      fundAccount({ account: address })
    }
  }

  // Handle send payment with fee token
  const handleSendPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!address || !recipient || !amount) {
      return
    }

    const tokenConfig = STABLECOINS[selectedToken]
    const feeTokenConfig = STABLECOINS[feeToken]
    const amountInSmallestUnit = parseUnits(amount, tokenConfig.decimals)

    // Build full memo
    const fullMemo = memo && memo.trim() 
      ? `${MEMO_PREFIX} (${memo.trim()})` 
      : MEMO_PREFIX

    console.log('📝 Gửi giao dịch:')
    console.log('  - Token gửi:', selectedToken, tokenConfig.address)
    console.log('  - Token trả phí:', feeToken, feeTokenConfig.address)
    console.log('  - Số lượng:', amount)
    console.log('  - Memo:', fullMemo)

    // QUAN TRỌNG: Dùng Hooks.token.useTransferSync với feeToken
    sendPayment.mutate({ 
      amount: amountInSmallestUnit, 
      feeToken: feeTokenConfig.address, // ← FEE TOKEN Ở ĐÂY!
      to: recipient as `0x${string}`, 
      token: tokenConfig.address,
      // Note: Tempo.ts chưa hỗ trợ memo trong useTransferSync
      // Bạn có thể dùng useSendTransactionSync với custom data nếu cần memo
    })
  }

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
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Tempo Wallet v3</h1>
            <p className="text-gray-600 mb-2">Powered by tempo.ts</p>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                {TEMPO_TESTNET.name}
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                Fee Token ✓
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

          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-300">
            <h3 className="font-semibold text-sm text-green-800 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Đã tích hợp tempo.ts!
            </h3>
            <ul className="text-xs text-green-700 space-y-1">
              <li>✅ Hook useTransferSync hỗ trợ feeToken</li>
              <li>✅ Không cần config RPC thủ công</li>
              <li>✅ Type-safe với TypeScript</li>
              <li>✅ Tự động xử lý fee token</li>
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
              tempo.ts
            </span>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
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
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Tempo Wallet v3</h1>
            </div>
            
            <div className="bg-gradient-to-r from-purple-100 to-cyan-100 rounded-xl p-4 mb-4">
              <div className="text-sm text-gray-600 mb-1">Địa chỉ ví</div>
              <div className="font-mono text-sm text-gray-800 break-all">{address}</div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Số dư Stablecoin</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddFunds}
                    disabled={isFunding}
                    className="text-sm bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-2 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    {isFunding ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang nạp...
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4" />
                        Nạp testnet
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleRefreshBalances}
                    className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Làm mới
                  </button>
                </div>
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
            
            <form onSubmit={handleSendPayment} className="space-y-4">
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

              {/* TRẢ PHÍ BẰNG TOKEN BẤT KỲ - HOẠT ĐỘNG VỚI TEMPO.TS */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4">
                <label className="block text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                  🎯 Trả phí bằng
                  <span className="px-2 py-0.5 bg-green-200 text-green-700 text-xs rounded-full font-semibold">tempo.ts</span>
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
                <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Fee token được truyền qua Hooks.token.useTransferSync!
                </p>
                {selectedToken !== feeToken && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Tuyệt! Bạn đang gửi {selectedToken} và trả phí bằng {feeToken}
                  </p>
                )}
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
                  required
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
                  required
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
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs text-yellow-700">
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                      Lưu ý: useTransferSync chưa hỗ trợ memo. Dùng useSendTransactionSync nếu cần memo.
                    </p>
                  </div>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={sendPayment.isPending || !recipient || !amount}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white py-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {sendPayment.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Gửi thanh toán
                  </>
                )}
              </button>
            </form>
            
            {sendPayment.isSuccess && sendPayment.data && (
              <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-800 mb-1">
                      Giao dịch thành công!
                    </p>
                    <p className="text-xs text-green-700 mb-2">
                      Đã gửi {amount} {selectedToken} và trả phí bằng {feeToken}
                    </p>
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

            {sendPayment.isError && (
              <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800 mb-1">Lỗi giao dịch</p>
                    <p className="text-xs text-red-700">
                      {sendPayment.error?.message || 'Đã xảy ra lỗi'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="font-semibold text-sm text-gray-800 mb-2">✨ Tính năng tempo.ts:</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>✅ Hook <span className="font-mono bg-gray-100 px-1">useTransferSync</span> hỗ trợ tham số <span className="font-mono bg-gray-100 px-1">feeToken</span></li>
              <li>✅ Tự động xử lý phí bằng token bạn chọn</li>
              <li>✅ Không cần config RPC custom</li>
              <li>✅ Type-safe với TypeScript</li>
              <li>📚 Docs: <a href="https://docs.tempo.xyz" target="_blank" className="text-blue-600 underline">docs.tempo.xyz</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}