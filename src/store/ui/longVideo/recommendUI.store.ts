import { defineStore } from 'pinia'

export const useRecommendUIStore = defineStore('recommendUI', {
  state: () => ({
    // 使用对象存储多个页面的状态
    pageStates: {} as Record<string, { 
      scrollTop: number; 
      currentPage: number 
    }>
  }),
  actions: {
    // 初始化页面状态
    initPageState(pageKey: string) {
      if (!this.pageStates[pageKey]) {
        this.pageStates[pageKey] = { 
          scrollTop: 0, 
          currentPage: 1 
        }
      }
    },
    
    setScrollPosition(pageKey: string, val: number) {
      this.initPageState(pageKey)
      this.pageStates[pageKey].scrollTop = val
    },
    
    setCurrentPage(pageKey: string, val: number) {
      this.initPageState(pageKey)
      this.pageStates[pageKey].currentPage = val
    },
    
    getScrollPosition(pageKey: string): number {
      this.initPageState(pageKey)
      return this.pageStates[pageKey].scrollTop
    },
    
    getCurrentPage(pageKey: string): number {
      this.initPageState(pageKey)
      return this.pageStates[pageKey].currentPage
    }
  },
  
  // 添加持久化插件
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'recommend-ui-state',
        storage: localStorage
      }
    ]
  }
})
