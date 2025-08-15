import { defineStore } from 'pinia'
import { fetchPopupConfig } from '@/api/popupConfig.api'

type RawResp = any
type PopupRow = {
  id: number
  popup_type?: string
  type?: string
  key?: string
  value?: any
  config_value?: any
  config_json?: any
  config?: any
  sort_order?: number
}

/** 统一拿列表：兼容 axios {data:{code,data}} / 直接 {code,data} / 纯数组 */
function takeList(resp: RawResp): PopupRow[] {
  const r = resp?.data ?? resp
  const data = r?.data ?? r
  return Array.isArray(data) ? data : []
}

/** 深层解 JSON & 解出真正的配置体（最多 8 层，防御式） */
function deepUnwrap(input: any): any {
  let v = input

  // 先从常见字段里捞出“真正的值容器”
  const pickRaw = (o: any) =>
    o?.value ?? o?.config_value ?? o?.config_json ?? o?.config ?? o

  v = pickRaw(v)

  for (let i = 0; i < 8; i++) {
    // 1) 字符串且像 JSON，就尝试 parse
    if (typeof v === 'string') {
      const s = v.trim()
      const looksJson =
        s.startsWith('{') ||
        s.startsWith('[') ||
        (s.startsWith('"') && s.endsWith('"') && (s.includes('{') || s.includes('[')))
      if (looksJson) {
        try { v = JSON.parse(s); continue } catch { /* 不是合法 JSON，跳过 */ }
      }
    }

    // 2) 对象里又包了一层 config_value/value
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const inner = pickRaw(v)
      if (inner !== v) { v = inner; continue }
    }

    break
  }
  return v
}

export const usePopupConfigStore = defineStore('popupConfig', {
  state: () => ({
    configs: [] as Array<PopupRow & { parsedValue?: any }>,
    loading: false,
    error: '' as string | null,
    initedTypes: new Set<string>(),
  }),

  actions: {
    /** 加载指定类型；force=true 时强制重新拉取 */
    async loadPopupConfig(type: string, force = false) {
      if (!force && this.initedTypes.has(type)) return
      this.loading = true
      this.error = ''
      try {
        const resp = await fetchPopupConfig(type)
        const list = takeList(resp)

        this.configs = list.map((row) => {
          const raw = row?.value ?? row?.config_value ?? row?.config_json ?? row?.config ?? null
          const parsedValue = deepUnwrap(raw)
          return {
            ...row,
            popup_type: row.popup_type ?? row.type ?? type,
            parsedValue,
          }
        })

        this.initedTypes.add(type)
      } catch (e: any) {
        this.error = e?.msg || e?.message || '请求失败'
        this.configs = []
      } finally {
        this.loading = false
      }
    },

    /** 取第一条；传 type 时按类型过滤，否则取全局第一条 */
    getFirstConfig(type?: string) {
      if (!type) return this.configs[0] ?? null
      return this.configs.find((x) => (x.popup_type ?? x.type) === type) ?? null
    },
  },
})
