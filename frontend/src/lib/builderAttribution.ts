import { encodeFunctionData, toHex } from 'viem'

export const BUILDER_CODE = 'bc_prv2f8tm'
export const BUILDER_MAGIC = '80218021802180218021802180218021'
export const BUILDER_DATA_SUFFIX = encodeBuilderDataSuffix(BUILDER_CODE)

type Hex = `0x${string}`

export function encodeBuilderDataSuffix(code: string): Hex {
  const bytes = new TextEncoder().encode(code.trim())
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  const len = bytes.length.toString(16).padStart(2, '0')
  return `0x${hex}${len}00${BUILDER_MAGIC}` as Hex
}

export function hasBuilderDataSuffix(data?: Hex | string | null): boolean {
  return Boolean(data && data.toLowerCase().endsWith(BUILDER_DATA_SUFFIX.slice(2).toLowerCase()))
}

export function appendBuilderDataSuffix(data?: Hex | string | null): Hex {
  const base = (data && data !== '0x' ? data : '0x') as Hex
  if (hasBuilderDataSuffix(base)) return base
  return `${base}${BUILDER_DATA_SUFFIX.slice(2)}` as Hex
}

export function assertBuilderAttributed(data?: Hex | string | null): asserts data is Hex {
  if (!hasBuilderDataSuffix(data)) {
    throw new Error('Blocked unattributed transaction: missing Base Builder Code suffix')
  }
}

export async function supportsBuilderDataSuffix(provider?: any): Promise<boolean> {
  try {
    if (!provider?.request) return false
    const capabilities = await provider.request({ method: 'wallet_getCapabilities', params: [] })
    const serialized = JSON.stringify(capabilities).toLowerCase()
    return serialized.includes('datasuffix') || serialized.includes('data_suffix')
  } catch {
    return false
  }
}

export async function sendTransactionWithBuilderCode(provider: any, tx: Record<string, any>): Promise<Hex> {
  if (!provider?.request) throw new Error('No wallet provider available')
  await supportsBuilderDataSuffix(provider)
  const data = appendBuilderDataSuffix((tx.data || '0x') as Hex)
  assertBuilderAttributed(data)
  return provider.request({
    method: 'eth_sendTransaction',
    params: [{ ...tx, data }],
  }) as Promise<Hex>
}

export async function writeContractWithBuilderCode(
  provider: any,
  params: {
    from?: Hex
    address: Hex
    abi: any
    functionName: string
    args?: readonly unknown[]
    value?: bigint
    chainId?: number
  },
): Promise<Hex> {
  const data = encodeFunctionData({
    abi: params.abi,
    functionName: params.functionName,
    args: (params.args || []) as any,
  })

  return sendTransactionWithBuilderCode(provider, {
    from: params.from,
    to: params.address,
    data,
    ...(params.value !== undefined ? { value: toHex(params.value) } : {}),
    ...(params.chainId !== undefined ? { chainId: toHex(params.chainId) } : {}),
  })
}

export async function sendCallsWithBuilderCode(
  options: {
    sendCallsAsync?: (args: any) => Promise<any>
    provider?: any
    from?: Hex
    chainId: number
    calls: Array<{ to: Hex; data?: Hex; value?: bigint }>
  },
): Promise<any> {
  await supportsBuilderDataSuffix(options.provider)
  const calls = options.calls.map((call) => ({
    ...call,
    data: appendBuilderDataSuffix(call.data || '0x'),
  }))
  calls.forEach((call) => assertBuilderAttributed(call.data))

  if (options.sendCallsAsync) {
    try {
      return await options.sendCallsAsync({
        calls,
        chainId: options.chainId,
        capabilities: { dataSuffix: BUILDER_DATA_SUFFIX },
      })
    } catch {
      // Fall through to provider methods with manual suffixing.
    }
  }

  if (!options.provider?.request) throw new Error('No wallet provider available')
  const chainId = toHex(options.chainId)
  try {
    return await options.provider.request({
      method: 'wallet_sendCalls',
      params: [{
        chainId,
        from: options.from,
        calls: calls.map((call) => ({
          to: call.to,
          data: call.data,
          ...(call.value !== undefined ? { value: toHex(call.value) } : {}),
        })),
        capabilities: { dataSuffix: BUILDER_DATA_SUFFIX },
      }],
    })
  } catch (error) {
    const first = calls[0]
    if (!first || calls.length > 1) throw error
    return sendTransactionWithBuilderCode(options.provider, {
      from: options.from,
      to: first.to,
      data: first.data,
      ...(first.value !== undefined ? { value: toHex(first.value) } : {}),
      chainId,
    })
  }
}
