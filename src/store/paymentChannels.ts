// src/store/paymentChannels.store.ts
import { defineStore } from 'pinia'
import { fetchH5PaymentChannels, type PaymentChannel } from '@/api/payment' // 你的API路径保持不变

// —— 类型与图标归一 —— //
function normalizeType(t: string | undefined): 'alipay' | 'wechat' | 'bank' | 'qq' | 'manual' | 'other' {
  const s = String(t || '').toLowerCase()
  if (!s) return 'other'
  if (['alipay', 'ali', 'zfb', '支付宝'].some(k => s.includes(k))) return 'alipay'
  if (['wechat', 'weixin', 'wx', '微信'].some(k => s.includes(k))) return 'wechat'
  if (['bank', 'card', '银行卡', '网银'].some(k => s.includes(k))) return 'bank'
  if (['qq', 'tenpay', '财付通'].some(k => s.includes(k))) return 'qq'
  if (['manual', 'kefu', '人工', '客服'].some(k => s.includes(k))) return 'manual'
  return 'other'
}
function iconByType(t: string | undefined): string {
  switch (normalizeType(t)) {
    case 'alipay': return '/icons/alipay1.svg'
    case 'wechat': return '/icons/wechat1.svg'
    case 'bank':   return '/icons/bank1.svg'
    case 'qq':     return '/icons/qq1.svg'
    case 'manual': return '/icons/kefu1.svg'
    default:       return '/icons/pay.svg'
  }
}

// —— 金额规范化（两位小数，传给后端做精确匹配）—— //
function normAmount(amount?: number | string | null): string | undefined {
  if (amount === null || amount === undefined || amount === '') return undefined
  const n = typeof amount === 'string' ? Number(amount) : amount
  if (Number.isNaN(n)) return undefined
  return n.toFixed(2)
}

export const usePaymentChannelsStore = defineStore('paymentChannels', {
  state: () => ({
    channels: [] as PaymentChannel[],
    loading: false,
    loaded: false,
    error: '' as string | null,
    selectedId: null as number | null,
    lastAmount: undefined as string | undefined, // 上一次用于筛选的金额（两位小数字符串）
  }),
  getters: {
    channelsWithIcon(state) {
      return state.channels.map(ch => ({
        ...ch,
        _icon: iconByType(ch.type),
        _normType: normalizeType(ch.type),
      }))
    },
    selectedChannel(): (PaymentChannel & { _icon?: string; _normType?: string }) | null {
      if (!this.selectedId) return null
      return this.channelsWithIcon.find(i => i.id === this.selectedId) || null
    },
    hasChannels: (state) => state.channels.length > 0,
  },
  actions: {
    /**
     * 拉取通道（可按金额筛选）
     * - amount: 元（number|string），会被规范为两位小数字符串
     * - force:  是否强制刷新（跳过缓存）
     */
    async fetch(amount?: number | string | null, force = false) {
      const amt = normAmount(amount)

      // 缓存命中：同金额且已加载则不再请求
      if (this.loaded && !force && this.lastAmount === amt) return

      this.loading = true
      this.error = ''
      try {
        const prevSelected = this.selectedId

        // 后端会按 amount 过滤（min/max/allow），不传则返回全部启用
        const list = await fetchH5PaymentChannels(amt)
        this.channels = list
        this.loaded = true
        this.lastAmount = amt

        // 尝试保留原选项，否则选中第一项
        if (prevSelected && list.some(i => i.id === prevSelected)) {
          this.selectedId = prevSelected
        } else {
          this.selectedId = list[0]?.id ?? null
        }
      } catch (e: any) {
        this.error = e?.message || '获取支付方式失败'
        this.channels = []
        this.loaded = false
        this.selectedId = null
      } finally {
        this.loading = false
      }
    },

    /** 组件里可直接用：根据“当前卡价格”刷新通道 */
    async fetchByCardPrice(price?: number | string | null, force = false) {
      await this.fetch(price, force)
    },

    /** 老方法兼容：不带金额拉取（不建议在付费场景用） */
    async fetchIfNeeded() {
      return this.fetch(undefined, false)
    },

    select(id: number) {
      this.selectedId = id
    },

    clear() {
      this.channels = []
      this.loaded = false
      this.selectedId = null
      this.error = ''
      this.lastAmount = undefined
    },
  },
})
