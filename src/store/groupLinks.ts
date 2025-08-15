import { defineStore } from 'pinia'
import { apiGetGroupLinks, type GroupLinksData, type GroupSection, type GroupItem } from '@/api/groupLinks'

function pick(sections: GroupSection[], pred: (s: GroupSection) => boolean): GroupItem[] {
  const out: GroupItem[] = []
  for (const s of sections) if (pred(s) && Array.isArray(s.items)) out.push(...s.items)
  return out
}

export const useGroupLinksStore = defineStore('groupLinks', {
  state: () => ({
    loading: false as boolean,
    enabled: 1 as 0|1,
    version: '' as string,
    sections: [] as GroupSection[],
  }),
  getters: {
    // 下面四个给你当前页面直接用
    officialGroups(state) {
      return pick(state.sections, s => s.title.includes('官方') || s.title.includes('交流'))
    },
    businessGroups(state) {
      return pick(state.sections, s => s.title.includes('推广') || s.title.includes('商务'))
    },
    adGroups(state) {
      return pick(state.sections, s => s.title.includes('广告'))
    },
    downloadTools(state) {
      return pick(state.sections, s => s.title.includes('下载'))
    },
  },
  actions: {
    /** 加载；force=true 强制刷新（带时间戳） */
    async load(force = false) {
      if (this.loading) return
      this.loading = true
      try {
        const data = await apiGetGroupLinks(force) // 拦截器已返回 data
        this.enabled  = data.enabled ?? 1
        this.version  = data.version ?? ''
        this.sections = Array.isArray(data.sections) ? data.sections : []
      } finally {
        this.loading = false
      }
    },
    async refresh() { await this.load(true) },
  }
})
