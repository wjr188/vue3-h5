// src/store/onlyfansH5.ts
import { defineStore } from 'pinia'
import {
  onlyfansH5Api,
  type H5OnlyFansCategory,
  type H5OnlyFansCreator,
  type H5OnlyFansMedia,
  type H5CreatorDetail,
  type H5MediaDetail,
  type H5SearchResult,
  type H5CreatorProfile,
  type H5CreatorMediaPage,
  type H5MediaImageItem,
  type H5MediaImagesPage
} from '@/api/onlyfansH5'

// 默认分页大小
const DEFAULT_PAGE_SIZE = 15
const DEFAULT_IMAGE_PAGE_SIZE = 12

interface OnlyfansH5State {
  // 分类相关
  categories: H5OnlyFansCategory[];
  currentCategory: H5OnlyFansCategory | null;
  creatorCache: Record<number, {
    list: H5OnlyFansCreator[];
    pagination: {
      page: number;
      page_size: number;
      total: number;
      has_more: boolean;
    };
  }>;

  // 合并接口：博主列表/详情
  creators: H5OnlyFansCreator[];
  currentCreator: H5CreatorDetail | null;
  creatorPagination: {
    page: number;
    page_size: number;
    total: number;
    has_more: boolean;
  };

  // 拆分接口：profile + media
  creatorProfile: H5CreatorProfile | null;
  creatorMedia: {
    image: {
      list: H5OnlyFansMedia[];
      pagination: { page: number; page_size: number; total: number; has_more: boolean };
      loading: boolean;
    },
    video: {
      list: H5OnlyFansMedia[];
      pagination: { page: number; page_size: number; total: number; has_more: boolean };
      loading: boolean;
    }
  };

  // 媒体详情 + 图集分页
  currentMedia: H5MediaDetail | null;
  mediaImages: {
    list: H5MediaImageItem[];
    pagination: { 
      page: number; 
      page_size: number; 
      total: number; 
      has_more: boolean;
      like_count?: number;      // ✅ 添加点赞数
      favorite_count?: number;  // ✅ 添加收藏数
    };
    loading: boolean;
  };

  // 搜索 + loading
  searchResult: H5SearchResult | null;
  searchHistory: string[];
  loading: {
    categories: boolean;
    creators: boolean;
    creatorDetail: boolean;
    mediaDetail: boolean;
    search: boolean;
  };
}

export const useOnlyfansH5Store = defineStore('onlyfansH5', {
  state: (): OnlyfansH5State => ({
    // 分类
    categories: [],
    currentCategory: null,
    creatorCache: {},

    // 合并接口
    creators: [],
    currentCreator: null,
    creatorPagination: {
      page: 1,
      page_size: DEFAULT_PAGE_SIZE,
      total: 0,
      has_more: false
    },

    // 拆分接口
    creatorProfile: null,
    creatorMedia: {
      image: {
        list: [],
        pagination: { page: 1, page_size: DEFAULT_PAGE_SIZE, total: 0, has_more: false },
        loading: false
      },
      video: {
        list: [],
        pagination: { page: 1, page_size: DEFAULT_PAGE_SIZE, total: 0, has_more: false },
        loading: false
      }
    },

    // 媒体详情 + 图集分页
    currentMedia: null,
    mediaImages: {
      list: [],
      pagination: { page: 1, page_size: DEFAULT_IMAGE_PAGE_SIZE, total: 0, has_more: false },
      loading: false
    },

    // 搜索
    searchResult: null,
    searchHistory: JSON.parse(localStorage.getItem('onlyfans_search_history') || '[]'),

    // loading
    loading: {
      categories: false,
      creators: false,
      creatorDetail: false,
      mediaDetail: false,
      search: false
    }
  }),

  getters: {
    // 合并接口：博主
    hasMoreCreators: (s): boolean => s.creatorPagination.has_more,
    currentCategoryCreatorCount: (s): number => s.currentCategory?.creator_count || 0,
    recentSearchHistory: (s): string[] => s.searchHistory.slice(0, 10),

    categoryOptions: (s) => s.categories.map(cat => ({
      label: cat.name,
      value: cat.id,
      count: cat.creator_count
    })),

    currentCategoryIndex: (s) => {
      if (!s.currentCategory) return 0
      return s.categories.findIndex(cat => cat.id === s.currentCategory!.id)
    },

    // 拆分接口：视频/图片列表状态
    videoList: (s) => s.creatorMedia.video.list,
    videoLoading: (s) => s.creatorMedia.video.loading,
    videoHasMore: (s) => s.creatorMedia.video.pagination.has_more,
    videoNoMore: (s) => !s.creatorMedia.video.pagination.has_more,

    imageList: (s) => s.creatorMedia.image.list,
    imageLoading: (s) => s.creatorMedia.image.loading,
    imageHasMore: (s) => s.creatorMedia.image.pagination.has_more,
    imageNoMore: (s) => !s.creatorMedia.image.pagination.has_more,

    // 图集分页
    mediaImageList: (s) => s.mediaImages.list,
    mediaImageUrls: (s) => s.mediaImages.list.map(i => i.url),
    mediaImageLoading: (s) => s.mediaImages.loading,
    mediaImageHasMore: (s) => s.mediaImages.pagination.has_more,
    mediaImageNoMore: (s) => !s.mediaImages.pagination.has_more
  },

  actions: {
    // ========= 分类 =========
    async fetchCategories() {
      this.loading.categories = true
      try {
        const categories = await onlyfansH5Api.getCategories()
        this.categories = categories
        return categories
      } catch (error) {
        console.error('获取分类列表失败:', error)
        throw error
      } finally {
        this.loading.categories = false
      }
    },

    setCurrentCategory(category: H5OnlyFansCategory, keyword?: string) {
      this.currentCategory = category
      if (!this.hydrateCreatorsFromCache(category.id, keyword)) {
        this.creators = []
        this.resetCreatorPagination()
      }
    },

    hydrateCreatorsFromCache(categoryId: number, keyword?: string) {
      if (keyword && keyword.trim()) return false
      const cache = this.creatorCache[categoryId]
      if (!cache) return false
      this.creators = [...cache.list]
      this.creatorPagination = { ...cache.pagination }
      return true
    },

    // ========= 合并接口：博主列表 =========
    async fetchCreators(
      categoryId: number,
      params?: { page?: number; page_size?: number; keyword?: string; loadMore?: boolean }
    ) {
      this.loading.creators = true
      try {
        const { loadMore = false, ...requestParams } = params || {}
        const requestPage = params?.page || (loadMore ? this.creatorPagination.page + 1 : 1)

        const response = await onlyfansH5Api.getCreatorsByCategory(categoryId, {
          page: requestPage,
          page_size: this.creatorPagination.page_size,
          ...requestParams
        })

        if (loadMore && response.page > 1) {
          const existed = new Set(this.creators.map(i => i.id))
          this.creators.push(...response.list.filter(i => !existed.has(i.id)))
        } else {
          this.creators = response.list
        }

        const computedHasMore =
          typeof response.has_more === 'boolean'
            ? response.has_more
            : (response.page * response.page_size < response.total)

        this.creatorPagination = {
          page: response.page,
          page_size: response.page_size,
          total: response.total,
          has_more: computedHasMore
        }

        if (!requestParams.keyword) {
          this.creatorCache[categoryId] = {
            list: [...this.creators],
            pagination: { ...this.creatorPagination }
          }
        }

        return response
      } catch (e) {
        console.error('获取博主列表失败:', e)
        throw e
      } finally {
        this.loading.creators = false
      }
    },

    async loadMoreCreators(categoryId: number, keyword?: string) {
      if (!this.creatorPagination.has_more || this.loading.creators) return
      await this.fetchCreators(categoryId, { keyword, loadMore: true })
    },

    // ========= 合并接口：博主详情 =========
    async fetchCreatorDetail(
      id: number,
      params?: { content_type?: 'all' | 'image' | 'video'; page?: number; page_size?: number }
    ) {
      this.loading.creatorDetail = true
      try {
        const creatorDetail = await onlyfansH5Api.getCreatorDetail(id, params)
        this.currentCreator = creatorDetail
        return creatorDetail
      } catch (error) {
        console.error('获取博主详情失败:', error)
        throw error
      } finally {
        this.loading.creatorDetail = false
      }
    },

    async loadMoreCreatorMedia(id: number, contentType?: 'all' | 'image' | 'video') {
      if (!this.currentCreator || !this.currentCreator.has_more || this.loading.creatorDetail) return
      const nextPage = this.currentCreator.page + 1

      this.loading.creatorDetail = true
      try {
        const response = await onlyfansH5Api.getCreatorDetail(id, {
          content_type: contentType,
          page: nextPage,
          page_size: this.currentCreator.page_size
        })

        this.currentCreator.media_list.push(...response.media_list)
        this.currentCreator.page = response.page
        this.currentCreator.has_more = response.has_more
        return response
      } catch (error) {
        console.error('加载更多内容失败:', error)
        throw error
      } finally {
        this.loading.creatorDetail = false
      }
    },

    // ========= 媒体详情 =========
    async fetchMediaDetail(id: number) {
      this.loading.mediaDetail = true
      try {
        // 切换内容时，重置图集分页容器
        const prevId = this.currentMedia?.media?.id
        if (prevId !== id) this.resetMediaImages()

        const mediaDetail = await onlyfansH5Api.getMediaDetail(id)
        this.currentMedia = mediaDetail
        return mediaDetail
      } catch (error) {
        console.error('获取媒体详情失败:', error)
        throw error
      } finally {
        this.loading.mediaDetail = false
      }
    },

    // ========= 搜索 =========
    async search(params: {
      keyword: string
      type?: 'all' | 'creator' | 'media'
      page?: number
      page_size?: number
      loadMore?: boolean
    }) {
      this.loading.search = true
      try {
        const { loadMore = false, ...requestParams } = params
        const result = await onlyfansH5Api.search(requestParams)

        if (loadMore && requestParams.page && requestParams.page > 1) {
          if (this.searchResult) {
            if (result.result.creators && this.searchResult.result.creators) {
              const set = new Set(this.searchResult.result.creators.list.map(i => i.id))
              this.searchResult.result.creators.list.push(
                ...result.result.creators.list.filter(i => !set.has(i.id))
              )
              this.searchResult.result.creators.has_more = result.result.creators.has_more
            }

            if (result.result.media && this.searchResult.result.media) {
              const existed = new Set(this.searchResult.result.media.list.map(i => i.id))
              this.searchResult.result.media.list.push(
                ...result.result.media.list.filter(i => !existed.has(i.id))
              )
              this.searchResult.result.media.has_more = result.result.media.has_more
            }
            this.searchResult.page = result.page
          }
        } else {
          this.searchResult = result
        }

        this.addSearchHistory(params.keyword)
        return result
      } catch (error) {
        console.error('搜索失败:', error)
        throw error
      } finally {
        this.loading.search = false
      }
    },

    async loadMoreSearch(type?: 'creator' | 'media') {
      if (!this.searchResult || this.loading.search) return
      const hasMore = type === 'creator'
        ? this.searchResult.result.creators?.has_more
        : this.searchResult.result.media?.has_more
      if (!hasMore) return

      const nextPage = this.searchResult.page + 1
      await this.search({
        keyword: this.searchResult.keyword,
        type: type || (this.searchResult.type as 'all' | 'creator' | 'media'),
        page: nextPage,
        page_size: this.searchResult.page_size,
        loadMore: true
      })
    },

    addSearchHistory(keyword: string) {
      if (!keyword.trim()) return
      const index = this.searchHistory.indexOf(keyword)
      if (index > -1) this.searchHistory.splice(index, 1)
      this.searchHistory.unshift(keyword)
      if (this.searchHistory.length > 20) this.searchHistory = this.searchHistory.slice(0, 20)
      localStorage.setItem('onlyfans_search_history', JSON.stringify(this.searchHistory))
    },

    clearSearchHistory() {
      this.searchHistory = []
      localStorage.removeItem('onlyfans_search_history')
    },

    removeSearchHistory(keyword: string) {
      const index = this.searchHistory.indexOf(keyword)
      if (index > -1) {
        this.searchHistory.splice(index, 1)
        localStorage.setItem('onlyfans_search_history', JSON.stringify(this.searchHistory))
      }
    },

    resetCreatorPagination() {
      this.creatorPagination = {
        page: 1,
        page_size: DEFAULT_PAGE_SIZE,
        total: 0,
        has_more: false
      }
    },

    switchToCategory(categoryIndex: number) {
      if (categoryIndex >= 0 && categoryIndex < this.categories.length) {
        const category = this.categories[categoryIndex]
        this.setCurrentCategory(category)
        return category
      }
      return null
    },

    updatePagination(pagination: Partial<OnlyfansH5State['creatorPagination']>) {
      this.creatorPagination = { ...this.creatorPagination, ...pagination }
    },

    clearCurrentData() {
      this.currentCreator = null
      this.currentMedia = null
      this.searchResult = null
      this.creatorProfile = null
      this.resetCreatorMedia()
      this.resetMediaImages()
    },

    clearCreators() {
      this.creators = []
      this.resetCreatorPagination()
    },

    clearAllData() {
      this.categories = []
      this.currentCategory = null
      this.creators = []
      this.currentCreator = null
      this.currentMedia = null
      this.searchResult = null
      this.creatorCache = {}
      this.resetCreatorPagination()
      this.creatorProfile = null
      this.resetCreatorMedia()
      this.resetMediaImages()
    },

    setBulkData(data: {
      categories?: H5OnlyFansCategory[]
      creators?: H5OnlyFansCreator[]
      currentCategory?: H5OnlyFansCategory | null
    }) {
      if (data.categories) this.categories = data.categories
      if (data.creators) this.creators = data.creators
      if (data.currentCategory !== undefined) this.currentCategory = data.currentCategory
    },

    async preloadNextPage(categoryId: number, keyword?: string) {
      if (!this.creatorPagination.has_more || this.loading.creators) return null
      try {
        const nextPage = this.creatorPagination.page + 1
        const response = await onlyfansH5Api.getCreatorsByCategory(categoryId, {
          page: nextPage,
          page_size: this.creatorPagination.page_size,
          keyword
        })
        return response
      } catch (error) {
        console.warn('预加载下一页失败:', error)
        return null
      }
    },

    // ========= 拆分接口：profile/media =========
    async fetchCreatorProfile(id: number) {
      this.loading.creatorDetail = true
      try {
        const res = await onlyfansH5Api.getCreatorProfile(id)
        this.creatorProfile = res
        return res
      } catch (e) {
        console.error('获取博主资料失败:', e)
        throw e
      } finally {
        this.loading.creatorDetail = false
      }
    },

    async fetchCreatorMedia(
      id: number,
      params: {
        type: 'image' | 'video';
        page?: number;
        page_size?: number;
        loadMore?: boolean;
        append?: boolean;
        force?: boolean;
      }
    ) {
      const t = params.type
      const bucket = this.creatorMedia[t]
      const loadMore = !!params.loadMore
      const append = !!params.append || loadMore
      const force = !!params.force

      if (!force && !append && bucket.list.length > 0 && (!params.page || params.page === 1)) {
        return {
          list: bucket.list,
          total: bucket.pagination.total,
          page: bucket.pagination.page,
          page_size: bucket.pagination.page_size,
          has_more: bucket.pagination.has_more,
          noMore: !bucket.pagination.has_more
        }
      }

      const requestPage = params.page ?? (append ? bucket.pagination.page + 1 : 1)
      const requestPageSize = Math.min(
        params.page_size ?? bucket.pagination.page_size,
        DEFAULT_PAGE_SIZE // 15，后端 creatorMedia 上限 15
      )

      bucket.loading = true
      this.loading.creatorDetail = true

      try {
        const resp: H5CreatorMediaPage = await onlyfansH5Api.getCreatorMedia(id, {
          type: t,
          page: requestPage,
          page_size: requestPageSize
        })

        if (append && resp.page > 1) {
          const existed = new Set(bucket.list.map(i => i.id))
          bucket.list.push(...resp.list.filter(i => !existed.has(i.id)))
        } else {
          bucket.list = resp.list
        }

        const computedHasMore =
          typeof resp.has_more === 'boolean'
            ? resp.has_more
            : (resp.page * resp.page_size < resp.total)

        bucket.pagination = {
          page: resp.page,
          page_size: resp.page_size,
          total: resp.total,
          has_more: computedHasMore
        }

        return {
          list: bucket.list,
          total: resp.total,
          page: resp.page,
          page_size: resp.page_size,
          has_more: computedHasMore,
          noMore: !computedHasMore
        }
      } catch (e) {
        console.error('获取博主媒体失败:', e)
        throw e
      } finally {
        bucket.loading = false
        this.loading.creatorDetail = false
      }
    },

    async loadMoreCreatorMediaSplit(id: number, type: 'image' | 'video') {
      const bucket = this.creatorMedia[type]
      if (bucket.loading || !bucket.pagination.has_more) return
      return this.fetchCreatorMedia(id, { type, loadMore: true })
    },

    resetCreatorMedia(type?: 'image' | 'video') {
      const resetOne = (t: 'image' | 'video') => {
        this.creatorMedia[t].list = []
        this.creatorMedia[t].pagination = {
          page: 1, page_size: DEFAULT_PAGE_SIZE, total: 0, has_more: false
        }
        this.creatorMedia[t].loading = false
      }
      if (type) resetOne(type)
      else { resetOne('image'); resetOne('video') }
    },

    // ========= 图集分页（/media/:id/images） =========
    async fetchMediaImages(
      mediaId: number,
      params?: { page?: number; page_size?: number; loadMore?: boolean; append?: boolean; force?: boolean }
    ) {
      const bucket = this.mediaImages
      const loadMore = !!params?.loadMore
      const append = !!params?.append || loadMore
      const force = !!params?.force

      if (!force && !append && bucket.list.length > 0 && (!params?.page || params?.page === 1)) {
        return {
          list: bucket.list,
          ...bucket.pagination,
          noMore: !bucket.pagination.has_more
        }
      }

      const page = params?.page ?? (append ? bucket.pagination.page + 1 : 1)
      const page_size = params?.page_size ?? bucket.pagination.page_size

      bucket.loading = true
      try {
        const resp: H5MediaImagesPage = await onlyfansH5Api.getMediaImages(mediaId, { page, page_size })

        if (append && resp.page > 1) {
          const existed = new Set(bucket.list.map(i => i.id))
          const toAppend = resp.list.filter(i => !existed.has(i.id))
          bucket.list.push(...toAppend)
        } else {
          bucket.list = resp.list
        }

        // ✅ 正确处理分页信息，包括点赞收藏数据
        bucket.pagination = {
          page: resp.page,
          page_size: resp.page_size,
          total: resp.total,
          has_more: resp.has_more ?? (resp.page * resp.page_size < resp.total),
          like_count: resp.like_count,      // ✅ 保存后端返回的点赞数
          favorite_count: resp.favorite_count // ✅ 保存后端返回的收藏数
        }

        console.log('📊 fetchMediaImages 成功:', {
          mediaId,
          page: resp.page,
          图片数量: bucket.list.length,
          点赞数: resp.like_count,
          收藏数: resp.favorite_count,
          总数: resp.total,
          有更多: resp.has_more
        })

        return {
          list: bucket.list,
          ...bucket.pagination,
          noMore: !bucket.pagination.has_more
        }
      } catch (e) {
        console.error('获取图集分页失败:', e)
        throw e
      } finally {
        bucket.loading = false
      }
    },

    async loadMoreMediaImages(mediaId: number) {
      const bucket = this.mediaImages
      if (bucket.loading || !bucket.pagination.has_more) return
      return this.fetchMediaImages(mediaId, { loadMore: true })
    },

    resetMediaImages() {
      this.mediaImages = {
        list: [],
        pagination: { 
          page: 1, 
          page_size: DEFAULT_IMAGE_PAGE_SIZE, 
          total: 0, 
          has_more: false,
          like_count: 0,      // ✅ 初始化点赞数
          favorite_count: 0   // ✅ 初始化收藏数
        },
        loading: false
      }
    }
  }
})

export default useOnlyfansH5Store
