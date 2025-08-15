import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getMyCollections } from '@/api/userAction.api'

export interface FavoriteVideo {
  id: number
  content_id: string | number
  content_type: string
  action_type: string
  created_at: string
  video: {
    id: string | number
    title: string
    cover: string
    duration: string
  }
}

export const useFavoritesStore = defineStore('favorites', () => {
  // 状态
  const favoritesList = ref<FavoriteVideo[]>([])
  const loading = ref(false)
  const currentPage = ref(1)
  const hasMore = ref(true)
  const total = ref(0)

  // 缓存不同类型的数据
  const favoritesCache = ref<Record<string, {
    list: FavoriteVideo[]
    page: number
    hasMore: boolean
    total: number
  }>>({})

  // 获取收藏列表
  const loadFavorites = async (type?: string, page = 1, refresh = false) => {
    if (loading.value && !refresh) return

    const cacheKey = type || 'all'
    
    // 如果是刷新或者没有缓存，重置状态
    if (refresh || !favoritesCache.value[cacheKey]) {
      favoritesCache.value[cacheKey] = {
        list: [],
        page: 1,
        hasMore: true,
        total: 0
      }
    }

    const cache = favoritesCache.value[cacheKey]
    
    // 如果不是刷新且没有更多数据，直接返回
    if (!refresh && !cache.hasMore) {
      return { list: cache.list, hasMore: false }
    }

    loading.value = true

    try {
      const targetPage = refresh ? 1 : page
      const response = await getMyCollections(targetPage, 20, type)
      
      // 拦截器已经解包了 data，直接使用 response
      const { list, total: responseTotal, has_more } = response
      
      // 如果是刷新，替换数据；否则追加
      if (refresh || targetPage === 1) {
        cache.list = list || []
        cache.page = 1
      } else {
        cache.list = [...cache.list, ...(list || [])]
      }
      
      cache.hasMore = has_more
      cache.total = responseTotal || 0
      cache.page = targetPage

      // 更新当前显示的数据
      favoritesList.value = cache.list
      currentPage.value = cache.page
      hasMore.value = cache.hasMore
      total.value = cache.total

      return {
        list: cache.list,
        hasMore: cache.hasMore,
        total: cache.total
      }
    } catch (error) {
      console.error('加载收藏列表失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 加载更多
  const loadMore = async (type?: string) => {
    const cacheKey = type || 'all'
    const cache = favoritesCache.value[cacheKey]
    
    if (!cache || !cache.hasMore || loading.value) {
      return false
    }

    await loadFavorites(type, cache.page + 1, false)
    return true
  }

  // 刷新列表
  const refreshFavorites = async (type?: string) => {
    return await loadFavorites(type, 1, true)
  }

  // 获取指定类型的收藏列表
  const getFavoritesByType = (type?: string) => {
    const cacheKey = type || 'all'
    const cache = favoritesCache.value[cacheKey]
    
    // 如果没有缓存，返回空数组
    if (!cache) {
      return []
    }
    
    return cache.list || []
  }

  // 从列表中移除收藏项
  const removeFromFavorites = (id: number, type?: string) => {
    const cacheKey = type || 'all'
    
    // 从指定类型的缓存中删除
    if (favoritesCache.value[cacheKey]) {
      const cache = favoritesCache.value[cacheKey]
      const originalLength = cache.list.length
      cache.list = cache.list.filter(item => item.id !== id)
      
      // 只有确实删除了项目才更新总数
      if (cache.list.length < originalLength) {
        cache.total = Math.max(0, cache.total - 1)
        
        // 如果当前显示的是这个类型，也要更新全局状态
        if ((!type && cacheKey === 'all') || (type && cacheKey === type)) {
          favoritesList.value = cache.list
          total.value = cache.total
        }
        
        console.log(`[Store] 删除收藏项 ${id} 从 ${cacheKey}，剩余: ${cache.list.length}`)
      }
    }
    
    // 同时也从 'all' 缓存中删除（如果存在且不是已经处理的类型）
    if (type && type !== 'all' && favoritesCache.value['all']) {
      const allCache = favoritesCache.value['all']
      const originalLength = allCache.list.length
      allCache.list = allCache.list.filter(item => item.id !== id)
      
      if (allCache.list.length < originalLength) {
        allCache.total = Math.max(0, allCache.total - 1)
        console.log(`[Store] 也从 all 缓存删除收藏项 ${id}，剩余: ${allCache.list.length}`)
      }
    }
  }

  // 清空缓存
  const clearCache = () => {
    favoritesCache.value = {}
    favoritesList.value = []
    currentPage.value = 1
    hasMore.value = true
    total.value = 0
  }

  return {
    // 状态
    favoritesList,
    loading,
    currentPage,
    hasMore,
    total,
    
    // 方法
    loadFavorites,
    loadMore,
    refreshFavorites,
    getFavoritesByType,
    removeFromFavorites,
    clearCache
  }
})
