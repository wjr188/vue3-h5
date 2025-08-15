import { defineStore } from 'pinia'
import { getBrowseHistory, type BrowseHistoryItem, type BrowseHistoryUnpackedResponse } from '@/api/browseHistory.api'
import { useUserStore } from '@/store/user'

export interface BrowseHistoryState {
  // 按类型分组存储浏览记录数据
  browseHistoryData: Record<string, BrowseHistoryItem[]>
  // 分页信息
  pagination: Record<string, {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }>
  // 加载状态
  loading: Record<string, boolean>
}

export const useBrowseHistoryStore = defineStore('browseHistory', {
  state: (): BrowseHistoryState => ({
    browseHistoryData: {},
    pagination: {},
    loading: {}
  }),

  getters: {
    // 获取指定类型的浏览记录
    getBrowseHistoryByType: (state) => (type?: string) => {
      const key = type || 'all'
      return state.browseHistoryData[key] || []
    },

    // 获取指定类型的分页信息
    getPaginationByType: (state) => (type?: string) => {
      const key = type || 'all'
      return state.pagination[key] || {
        page: 1,
        limit: 20,
        total: 0,
        hasMore: true
      }
    },

    // 获取指定类型的加载状态
    getLoadingByType: (state) => (type?: string) => {
      const key = type || 'all'
      return state.loading[key] || false
    },

    // 是否还有更多数据
    hasMore: (state) => (type?: string) => {
      const key = type || 'all'
      const pagination = state.pagination[key]
      return pagination ? pagination.hasMore : true
    }
  },

  actions: {
    // 设置浏览记录数据
    setBrowseHistoryData(type: string | undefined, data: BrowseHistoryItem[], append = false) {
      const key = type || 'all'
      
      if (append) {
        // ✅ 追加时进行去重
        const existingData = this.browseHistoryData[key] || []
        const newData = data.filter(newItem => 
          !existingData.some(existingItem => 
            existingItem.id === newItem.id && 
            existingItem.content_id === newItem.content_id &&
            existingItem.content_type === newItem.content_type
          )
        )
        this.browseHistoryData[key] = [...existingData, ...newData]
      } else {
        // ✅ 覆盖时也进行去重（防止API返回的数据本身就有重复）
        const uniqueData = data.filter((item, index, arr) =>
          arr.findIndex(other => 
            other.id === item.id && 
            other.content_id === item.content_id &&
            other.content_type === item.content_type
          ) === index
        )
        this.browseHistoryData[key] = uniqueData
      }
    },

    // 设置分页信息
    setPagination(type: string | undefined, pagination: Partial<BrowseHistoryState['pagination'][string]>) {
      const key = type || 'all'
      this.pagination[key] = {
        ...this.pagination[key],
        ...pagination
      }
    },

    // 设置加载状态
    setLoading(type: string | undefined, loading: boolean) {
      const key = type || 'all'
      this.loading[key] = loading
    },

    // 加载浏览记录（首次加载或刷新）
    async loadBrowseHistory(type?: string, page = 1, refresh = false): Promise<boolean> {
      const key = type || 'all'
      
      console.log('🚀 Store loadBrowseHistory 被调用:', {
        type,
        key,
        page,
        refresh,
        hasExistingData: this.browseHistoryData[key]?.length > 0
      })
      
      // 如果不是刷新且已有数据，直接返回
      if (!refresh && this.browseHistoryData[key]?.length > 0) {
        console.log('✅ 已有数据且非刷新，直接返回')
        return true
      }

      this.setLoading(type, true)
      
      try {
        // 使用 userStore 获取用户UUID
        const userStore = useUserStore()
        const userUuid = userStore.uuid
        console.log('🚀 用户UUID (store):', userUuid)
        console.log('🚀 用户信息 (store):', userStore.userInfo)
        
        if (!userUuid) {
          throw new Error('用户未登录')
        }

        const params = {
          user_uuid: userUuid,
          type,
          page,
          limit: 20
        }
        
        console.log('🚀 调用API，参数:', params)

        const response: BrowseHistoryUnpackedResponse = await getBrowseHistory(params)
        
        console.log('🚀 API响应:', response)

        // 由于拦截器自动解包了一层data，response直接就是数据内容
        if (response && response.list) {  // 修复：直接检查list字段存在
          console.log('🚀 响应数据结构:', response)
          
          // 设置数据
          this.setBrowseHistoryData(type, response.list, false)  // 修复：直接使用response.list
          
          // 设置分页信息
          this.setPagination(type, {
            page: response.page,        // 修复：直接使用response.page
            limit: response.limit,      // 修复：直接使用response.limit
            total: response.total,
            hasMore: response.has_more  // 修复：直接使用response.has_more
          })
          
          console.log('✅ 数据加载成功:', {
            dataCount: response.list.length,
            total: response.total,
            page: response.page,
            hasMore: response.has_more
          })
          
          return true
        } else {
          throw new Error('数据格式错误')
        }
      } catch (error) {
        console.error('❌ 加载浏览记录失败:', error)
        // 设置空数据和无更多数据状态
        this.setBrowseHistoryData(type, [], false)
        this.setPagination(type, {
          page: 1,
          limit: 20,
          total: 0,
          hasMore: false
        })
        throw error
      } finally {
        this.setLoading(type, false)
      }
    },

    // 加载更多浏览记录
    async loadMore(type?: string): Promise<boolean> {
      const key = type || 'all'
      const currentPagination = this.getPaginationByType(type)
      
      // 如果没有更多数据，直接返回
      if (!currentPagination.hasMore) {
        return false
      }

      this.setLoading(type, true)
      
      try {
        // 使用 userStore 获取用户UUID
        const userStore = useUserStore()
        const userUuid = userStore.uuid
        if (!userUuid) {
          throw new Error('用户未登录')
        }

        const nextPage = currentPagination.page + 1
        const response: BrowseHistoryUnpackedResponse = await getBrowseHistory({
          user_uuid: userUuid,
          type,
          page: nextPage,
          limit: currentPagination.limit
        })

        if (response && response.list) {  // 修复：直接检查list字段存在
          // 追加数据
          this.setBrowseHistoryData(type, response.list, true)  // 修复：直接使用response.list
          
          // 更新分页信息
          this.setPagination(type, {
            page: response.page,
            hasMore: response.has_more
          })
          
          return response.list.length > 0
        } else {
          throw new Error('数据格式错误')
        }
      } catch (error) {
        console.error('加载更多浏览记录失败:', error)
        // 设置无更多数据状态
        this.setPagination(type, { hasMore: false })
        throw error
      } finally {
        this.setLoading(type, false)
      }
    },

    // 刷新浏览记录
    async refreshBrowseHistory(type?: string): Promise<boolean> {
      // 重置分页信息
      this.setPagination(type, {
        page: 1,
        hasMore: true
      })
      
      // 加载第一页数据
      return this.loadBrowseHistory(type, 1, true)
    },

    // 从浏览记录中移除项目
    removeFromBrowseHistory(id: number, type?: string) {
      const key = type || 'all'
      if (this.browseHistoryData[key]) {
        this.browseHistoryData[key] = this.browseHistoryData[key].filter(item => item.id !== id)
        
        // 更新总数
        const pagination = this.pagination[key]
        if (pagination) {
          this.setPagination(type, {
            total: Math.max(0, pagination.total - 1)
          })
        }
      }
    },

    // 清空指定类型的缓存
    clearCache(type?: string) {
      const key = type || 'all'
      this.browseHistoryData[key] = []
      this.pagination[key] = {
        page: 1,
        limit: 20,
        total: 0,
        hasMore: true
      }
      this.loading[key] = false
    },

    // 清空所有缓存
    clearAllCache() {
      this.browseHistoryData = {}
      this.pagination = {}
      this.loading = {}
    }
  }
})
