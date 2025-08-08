// 新建 e:\mamama\vue3-h5\src\store\douyinTags.store.ts
import { defineStore } from 'pinia'
import { fetchDouyinTags } from '@/api/douyin.api'

export const useDouyinTagsStore = defineStore('douyinTags', {
  state: () => ({
    tags: [] as string[],
    loaded: false
  }),
  actions: {
    async loadTags() {
      if (this.loaded) return
      const res = await fetchDouyinTags()
      this.tags = res.list || []
      this.loaded = true
    }
  }
})