import { defineStore } from 'pinia'
import { fetchDouyinVideos, fetchDouyinPlay, fetchDouyinDiscoverVideos, fetchDouyinVideoDetail, type PlayResponse } from '@/api/douyin.api' // 新增发现页接口
import { unlockDouyinVideo } from '@/api/unlock.api'
import { useUserStore } from '@/store/user'

export interface DouyinVideo {
  id: number
  cover: string
  author: string
  title: string
  tags: string[]
  duration: string
  avatar: string
  likes: number
  favorites: number
  coin: number
  vip: boolean
  isVip?: boolean
  unlocked?: boolean
  src?: string
  // 点赞和收藏相关字段
  liked?: boolean
  like_count?: number
  collected?: boolean
  collect_count?: number
}

// 发现页专用类型
export interface DiscoverVideo {
  id: number
  title: string
  cover: string
  cover_url?: string
  tags: string[]
  views: number
  play?: number
  duration: string | number
  vip: boolean
  coin: number
}

export const useDouyinVideosStore = defineStore('douyinVideos', {
  state: () => ({
    // 推荐页原有缓存
    videos: [] as DouyinVideo[],
    lastId: 0,
    loading: false,
    error: null as string | null,
    hasMore: true,

    // 发现页专用缓存
    discoverVideosMap: {} as Record<string, DiscoverVideo[]>,
    discoverPage: 1,
    discoverTotal: 0,
    discoverLoading: false,
    discoverError: null as string | null
  }),
  actions: {
    // 推荐页原有方法（不动）
    async loadVideos(params: { 
      pageSize?: number, 
      last_id?: number, 
      category_id?: number, 
      userId?: string,
      [key: string]: any 
    } = {}) {
      const userStore = useUserStore()
      if (!this.hasMore) return { list: [] }
      this.loading = true
      this.error = null
      try {
        // 优先使用传入的 userId，没有则使用 store 中的
        const userId = params.userId || userStore.uuid
        const res = await fetchDouyinVideos({ ...params, userId }) as any
        const list = res.list || []
        const mapped = list.map((item: any) => ({
          id: item.id,
          src: '', // 确保初始没有播放地址
          cover: item.cover_url || '',
          author: item.category_name || '',
          title: item.title || '',
          tags: item.tags || [],
          duration: '',
          avatar: item.parent_icon || '/images/666.webp',
          likes: item.like || 0,
          favorites: item.collect || 0,
          coin: item.coin || 0,
          vip: item.vip || false,
          unlocked: item.unlocked || false,
          // 添加点赞收藏状态
          liked: item.liked || false,
          like_count: item.like_count || item.like || 0,
          collected: item.collected || false,
          collect_count: item.collect_count || item.collect || 0
        }))
        if (list.length > 0) {
          this.videos = [...this.videos, ...mapped]
          this.lastId = res.last_id || 0
        } else {
          this.hasMore = false
        }
        // ★★★ 关键：返回映射后的数据
        return { list: mapped }
      } catch (err: any) {
        this.error = err.message || '加载失败'
        return { list: [] }
      } finally {
        this.loading = false
      }
    },
    async fetchPlayInfo(id: number, userId: string): Promise<PlayResponse> {
      return await fetchDouyinPlay({ id, userId })
    },
    reset() {
      this.videos = []
      this.lastId = 0
      this.hasMore = true
    },
    async buySingleVideo({ videoId, userId }: { videoId: number, userId: string }) {
      return await unlockDouyinVideo({ video_id: videoId })
    },

    // 发现页专用方法（修复数据缓存问题）
    async loadDiscoverVideos(category: string, page: number) {
      console.log(`Store开始加载: category=${category}, page=${page}`)
      
      let params: any = { page, pageSize: 20, category }
      if (category !== '最新' && category !== '最热') {
        params.tag = category
      }
      
      console.log('API请求参数:', params)
      
      const response = await fetchDouyinDiscoverVideos(params)
      const res = response as any // 处理响应数据
      
      console.log('API原始响应:', res)
      
      // ★统一映射字段
      const mapped = (res.list || []).map((item: any) => ({
        id: item.id,
        cover: item.cover_url || item.cover || '',
        title: item.title || '',
        tags: item.tags || [],
        views: item.play || item.views || 0,
        duration: item.duration || '',
        vip: item.vip || false,
        coin: item.coin || 0
      }))
      
      console.log(`Store映射后数据 ${category}:`, mapped)
      
      // 重要：如果是第一页，则重置该分类的缓存
      if (page === 1) {
        this.discoverVideosMap[category] = []
      }
      
      // 不要直接覆盖缓存，应该追加
      if (!this.discoverVideosMap[category]) {
        this.discoverVideosMap[category] = []
      }
      this.discoverVideosMap[category] = [...this.discoverVideosMap[category], ...mapped]
      this.discoverTotal = res.total || 0
      this.discoverPage = page
      
      console.log(`Store中 ${category} 最终数据量:`, this.discoverVideosMap[category].length)
      
      return mapped
    },
    
    resetDiscover() {
      console.log('重置发现页Store缓存')
      this.discoverVideosMap = {}
    },

    // 新增：获取单个视频详情（播放页用）
    async fetchVideoDetail(id: number | string, userId?: string) {
      const userStore = useUserStore()
      // 优先使用传入的 userId，没有则使用 store 中的
      const finalUserId = userId || userStore.uuid
      
      // item 已经是解包后的对象，不是 AxiosResponse
      const response = await fetchDouyinVideoDetail({ id, userId: finalUserId })
      const item = response as any // 处理响应数据
      return {
        id: item.id,
        src: '', // 确保初始没有播放地址
        cover: item.cover_url || '',
        author: item.category_name || '', // 博主名字来自 category_name
        title: item.title || '',
        tags: item.tags || [],
        duration: '',
        avatar: item.parent_icon || '/images/666.webp', // 博主头像来自 parent_icon
        likes: item.like || 0,
        favorites: item.collect || 0,
        coin: item.coin || 0,
        vip: item.vip || false,
        unlocked: item.unlocked || false,
        // 添加点赞收藏状态
        liked: item.liked || false,
        like_count: item.like_count || item.like || 0,
        collected: item.collected || false,
        collect_count: item.collect_count || item.collect || 0
      }
    }
  }
})