import { defineStore } from 'pinia'
import { unlockAnimeVideo } from '@/api/unlock.api'
import {
  fetchAnimeMainCategories,
  fetchAnimeGroup,
  fetchAnimeBySubCategory,
  fetchAnimeRecommendGroups,
  fetchAnimeGroupAnimes,
  fetchAnimeTags,
  fetchAnimeVideoList   // <--- 加这一行
} from '@/api/anime.api'

// 子分类（group）分页结构
export interface AnimeGroupPage {
  subCategories: any[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  noMore: boolean
  pagesLoaded: number[]
}

export interface SubAnimePage {
  list: any[]
  total: number
  page: number
  pageSize: number
}

// 推荐分组数据结构
export interface AnimeRecommendGroup {
  id: number
  name: string
  sort: number
  status: number
  remark?: string
  created_at?: string
  updated_at?: string
  animes: any[]
}
export interface RecommendGroupsPage {
  groups: AnimeRecommendGroup[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  noMore: boolean
}
export interface RecommendGroupAnimesPage {
  list: any[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  noMore: boolean
}

export interface AnimeState {
  mainCategories: any[]
  groupMap: Record<number, AnimeGroupPage> // key=parentId
  
  subAnimeMap: Record<number, SubAnimePage>
  // 新增推荐分组缓存
  recommendGroupsPage: RecommendGroupsPage
  recommendGroupAnimesMap: Record<number, RecommendGroupAnimesPage>
  loading: boolean
  animeTags: [],
  animeTagsLoading: false,
  animeVideoListCache: {}
}

export const useAnimeStore = defineStore('anime', {
  state: (): AnimeState => ({
  mainCategories: [],
  groupMap: {},
  subAnimeMap: {},
  // 推荐分组/动漫
  recommendGroupsPage: {
    groups: [],
    total: 0,
    page: 1,
    pageSize: 5,
    loading: false,
    noMore: false
  },
  recommendGroupAnimesMap: {},
  loading: false,
  animeTags: [],              // <--- 这行必须有
  animeTagsLoading: false,     // <--- 这行必须有
  animeVideoListCache: {}
}),

  actions: {
    // 拉主分类
    async loadMainCategories() {
      this.loading = true
      try {
        const res = await fetchAnimeMainCategories()
        this.mainCategories = res.mainCategories || []
      } finally {
        this.loading = false
      }
    },

    /**
     * 拉取分组（子分类模块）
     * @param parentId 父分类id
     * @param page 当前页码
     * @param pageSize 每页子分类数
     * @param limit 每个子分类下动漫数
     * @param append 是否追加到已加载
     */
    async loadGroup(parentId: number, page = 1, pageSize = 2, limit = 6, append = false) {
      if (!this.groupMap[parentId]) {
        this.groupMap[parentId] = {
          subCategories: [],
          total: 0,
          page: 0,
          pageSize: pageSize,
          loading: false,
          noMore: false,
          pagesLoaded: []
        }
      }
      const storeObj = this.groupMap[parentId]

      if (!append && storeObj.pagesLoaded.includes(page)) {
        return storeObj
      }

      storeObj.loading = true
      try {
        const res = await fetchAnimeGroup(parentId, page, pageSize, limit)
        const list = res.subCategories || []

        if (append) {
          storeObj.subCategories = storeObj.subCategories.concat(list)
        } else if (page === 1) {
          storeObj.subCategories = list
        } else {
          const startIdx = (page - 1) * pageSize
          for (let i = 0; i < list.length; i++) {
            storeObj.subCategories[startIdx + i] = list[i]
          }
        }

        storeObj.total = res.total || 0
        storeObj.page = page
        storeObj.pageSize = pageSize
        storeObj.noMore = storeObj.subCategories.length >= storeObj.total

        if (!storeObj.pagesLoaded.includes(page)) {
          storeObj.pagesLoaded.push(page)
        }

        return storeObj
      } finally {
        storeObj.loading = false
      }
    },

    async loadMoreGroup(parentId: number) {
      const storeObj = this.groupMap[parentId]
      if (!storeObj || storeObj.loading || storeObj.noMore) return storeObj
      const nextPage = storeObj.page + 1
      return this.loadGroup(parentId, nextPage, storeObj.pageSize, undefined, true)
    },

    // 获取某父分类下所有子分类（推荐/模块）
    getSubCategories(parentId: number) {
      return this.groupMap[parentId]?.subCategories || []
    },

    // 拉取某子分类下动漫列表（子分类点击后触发）
    async loadSubCategoryAnimes(subCategoryId: number, page = 1, pageSize = 15) {
      this.loading = true
      try {
        const res = await fetchAnimeBySubCategory(subCategoryId, page, pageSize)
        this.subAnimeMap[subCategoryId] = {
          list: res.list || [],
          total: res.total || 0,
          page: res.page || 1,
          pageSize: res.pageSize || pageSize
        }
        // 这里就 return 了，外部可直接拿数据
        return {
          list: res.list || [],
          total: res.total || 0
        }
      } finally {
        this.loading = false
      }
    },

    /**
     * 返回指定 subCategoryId 的分页动漫数据（取缓存）
     */
    getCategoryAnimes(subCategoryId: number) {
      const d = this.subAnimeMap[subCategoryId]
      return {
        list: d?.list || [],
        total: d?.total || 0,
        page: d?.page || 1,
        pageSize: d?.pageSize || 15
      }
    },

    // ========== 新增 推荐分组相关 ==========
    /**
     * 获取所有推荐分组及其下动漫（分页，每组前 N 条）
     */
    async loadRecommendGroups(page = 1, pageSize = 2, limit = 9, append = false) {
  const obj = this.recommendGroupsPage
  if (obj.loading || obj.noMore) return obj
  obj.loading = true
  try {
    const res = await fetchAnimeRecommendGroups(page, pageSize, limit)
    const newGroups = res.groups || []
    obj.total = res.total || 0
    obj.page = page
    obj.pageSize = pageSize

    if (append && page > 1) {
      // 追加到已有groups后面
      obj.groups = obj.groups.concat(newGroups)
    } else {
      // 刷新/首次加载/非追加模式，直接赋值
      obj.groups = newGroups
    }

    obj.noMore = obj.groups.length >= obj.total
    return obj
  } finally {
    obj.loading = false
  }
},
/**
     * 获取动漫标签列表
     * @param params 支持 keyword/group/status 三个可选参数
     */
    async loadAnimeTags(params?: { keyword?: string; group?: string; status?: number }) {
      this.animeTagsLoading = true
      try {
        const res = await fetchAnimeTags(params)
        // 你返回的是 { data: AnimeTag[] }
        this.animeTags = res.list || []
        return this.animeTags
      } finally {
        this.animeTagsLoading = false
      }
    },
     /**
 * H5动漫视频全局列表（多条件缓存，筛选/分页全支持）
 * @param params 支持各种筛选参数
 */
async loadAnimeVideoList(params: {
  keyword?: string
  parentId?: number
  categoryId?: number
  tagId?: number
  is_vip?: number
  coin?: number
  status?: number
  sort?: string
  page?: number
  pageSize?: number
  limit?: number
  append?: boolean
  force?: boolean // 这里加 force 用于缓存刷新判断，不传给接口
}) {
  const { append = false, force = false, ...pureParams } = params

  const cacheKey = JSON.stringify(pureParams)

  if (!force && this.animeVideoListCache[cacheKey]) {
    const cache = this.animeVideoListCache[cacheKey]
    if (!cache.loading) {
      return {
        list: cache.list,
        total: cache.total,
        page: cache.page,
        pageSize: cache.pageSize,
        noMore: cache.noMore
      }
    }
  }

  this.loading = true
  if (!this.animeVideoListCache[cacheKey]) {
    this.animeVideoListCache[cacheKey] = {
      list: [],
      total: 0,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
      params: pureParams,
      noMore: false,
      loading: true
    }
  } else {
    this.animeVideoListCache[cacheKey].loading = true
  }

  try {
    const res = await fetchAnimeVideoList(pureParams)
    const list = res.list || []
    const total = res.total || 0
    const page = res.page || params.page || 1
    const pageSize = res.pageSize || params.pageSize || 20
    const noMore = list.length < pageSize || list.length + (page - 1) * pageSize >= total

    if (append) {
      this.animeVideoListCache[cacheKey].list = [
        ...(this.animeVideoListCache[cacheKey].list || []),
        ...list
      ]
      this.animeVideoListCache[cacheKey].total = total
      this.animeVideoListCache[cacheKey].page = page
      this.animeVideoListCache[cacheKey].pageSize = pageSize
      this.animeVideoListCache[cacheKey].noMore = noMore
      this.animeVideoListCache[cacheKey].loading = false
      return {
        list: this.animeVideoListCache[cacheKey].list,
        total,
        page,
        pageSize,
        noMore
      }
    } else {
      this.animeVideoListCache[cacheKey] = {
        list,
        total,
        page,
        pageSize,
        params: pureParams,
        noMore,
        loading: false
      }
      return { list, total, page, pageSize, noMore }
    }
  } finally {
    this.loading = false
    if (this.animeVideoListCache[cacheKey]) {
      this.animeVideoListCache[cacheKey].loading = false
    }
  }
},

clearAnimeVideoListCache() {
      this.animeVideoListCache = {}
    },
    async unlockAnimeVideoById(video_id: number) {
      try {
        const res = await unlockAnimeVideo({ video_id })
        if (res.code === 0) {
          return { success: true, message: res.msg }
        } else {
          return { success: false, message: res.msg }
        }
      } catch (error) {
        return { success: false, message: '解锁失败，请稍后重试' }
      }
    },
    /**
     * 获取某个推荐分组下的动漫（分页）
     */
    async loadRecommendGroupAnimes(groupId: number, page = 1, pageSize = 15) {
      if (!this.recommendGroupAnimesMap[groupId]) {
        this.recommendGroupAnimesMap[groupId] = {
          list: [],
          total: 0,
          page: 1,
          pageSize: pageSize,
          loading: false,
          noMore: false
        }
      }
      const obj = this.recommendGroupAnimesMap[groupId]
      if (obj.loading || obj.noMore) return obj
      obj.loading = true
      try {
        const res = await fetchAnimeGroupAnimes(groupId, page, pageSize)
        obj.list = res.list || []
        obj.total = res.total || 0
        obj.page = page
        obj.pageSize = pageSize
        obj.noMore = obj.list.length >= obj.total
        return obj
      } finally {
        obj.loading = false
      }
    }
  }
})
