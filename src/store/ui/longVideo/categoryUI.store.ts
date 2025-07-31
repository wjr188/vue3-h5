import { defineStore } from 'pinia'

export const useCategoryUIStore = defineStore('categoryUI', {
  state: () => ({
    // key: 分类名或id，value: 该分类的UI状态
    pageStates: {} as Record<string, {
      scrollTop: number
      currentPage: number
      hasMore: boolean
      isLoading: boolean
    }>
  }),
  actions: {
    initPageState(categoryKey: string) {
      if (!this.pageStates[categoryKey]) {
        this.pageStates[categoryKey] = {
          scrollTop: 0,
          currentPage: 1,
          hasMore: true,
          isLoading: false
        }
      }
    },
    setScrollTop(categoryKey: string, val: number) {
      this.initPageState(categoryKey)
      this.pageStates[categoryKey].scrollTop = val
    },
    setCurrentPage(categoryKey: string, val: number) {
      this.initPageState(categoryKey)
      this.pageStates[categoryKey].currentPage = val
    },
    setHasMore(categoryKey: string, val: boolean) {
      this.initPageState(categoryKey)
      this.pageStates[categoryKey].hasMore = val
    },
    setIsLoading(categoryKey: string, val: boolean) {
      this.initPageState(categoryKey)
      this.pageStates[categoryKey].isLoading = val
    },
    getState(categoryKey: string) {
      this.initPageState(categoryKey)
      return this.pageStates[categoryKey]
    }
  },
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'category-ui-state',
        storage: localStorage
      }
    ]
  }
})