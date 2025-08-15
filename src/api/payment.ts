import request from '@/utils/request'

export interface PaymentChannel {
  id: number
  name: string
  code?: string
  // 后端已规范为小写：alipay | wechat | manual
  type: 'alipay' | 'wechat' | 'manual' | string
}

/**
 * 获取启用的支付通道
 * - 不传 amount：返回全部启用
 * - 传 amount（元）：后端按 min/max/allow 过滤
 */
export async function fetchH5PaymentChannels(
  amount?: number | string
): Promise<PaymentChannel[]> {
  const params: Record<string, string> = {}

  // 统一两位小数 —— 后端按字符串精确比较更稳
  if (amount !== undefined && amount !== null && amount !== '') {
    const n = typeof amount === 'string' ? Number(amount) : amount
    if (!Number.isNaN(n)) params.amount = n.toFixed(2)
  }

  // 你的拦截器已返回 res.data，这里 data = { list: [...] }
  const data = await request.get('/api/payment_channels/h5', { params })
  const list = Array.isArray(data?.list) ? data.list : []

  // 兜底：小写化
  return list.map((it: PaymentChannel) => ({
    ...it,
    type: (it.type || '').toLowerCase() as PaymentChannel['type'],
  }))
}
