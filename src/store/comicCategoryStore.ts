import { defineStore } from 'pinia'
import { unlockComicChapter,getUnlockedComicChapters, unlockComicWhole } from '@/api/unlock.api'

import {
  fetchComicCategories,
  addComicCategory,
  updateComicCategory,
  deleteComicCategory,
  batchDeleteComicCategory,
  toggleComicCategoryStatus,
  batchSetComicCategoryStatus,
  fetchComicChapters,
  fetchChapterImages,
  fetchComicDetail,
  fetchComicList,
  fetchAllRecommendGroupsWithComics,
  fetchRecommendGroups,
  addRecommendGroup,
  updateRecommendGroup,
  deleteRecommendGroup,
  sortRecommendGroups,
  fetchRecommendGroupComics,
  saveRecommendGroupComics,
  fetchUnGroupedComics,
  fetchAllComics,
  fetchMainRecommendCategories,
  fetchChildRecommendCategories,
  fetchSubCategoryComics,
  fetchComicTagList,
  fetchComicRankList,
  fetchDailyUpdates,
  fetchWeeklyUpdates,
  fetchWeeklyAllUpdates, // 新增
  // recordComicUpdate // 删除这个导入
} from '@/api/comicCategory.api'

export interface ComicItem {
  id: number | string
  name: string
  cover?: string
  author?: string
  coin?: number
  is_vip?: number
  [key: string]: any
}
export interface SubCategoryComicsPage {
  list: ComicItem[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  finished: boolean
}
export interface CategoryItem {
  id: number
  name: string
  parent_id: number
  sort: number
  status: number
  remark?: string
  comic_count?: number
  comics?: ComicItem[]
}
export interface RecommendGroupItem {
  id: number | string
  name: string
  sort: number
  comic_count?: number
  is_protected?: number
  layout_type?: string
  icon?: string
  [key: string]: any
}
// 推荐分组分页结构
export interface RecommendGroupComicsPage {
  list: ComicItem[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  finished: boolean
}
export interface SubCategoryPage {
  subCategories: CategoryItem[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  noMore: boolean
}
export interface CategoryState {
  mainCategories: CategoryItem[]
  subCategoriesMap: Record<number, SubCategoryPage>  // 这里 key 是 parentId
  subCategoryComicsMap: Record<number, SubCategoryComicsPage>
  loading: boolean
  comicDetail: any
  comicDetailCache: Record<number, any>
  chapterList: any[]
  chapterListCache: Record<number, any[]>
  previewChapterList: any[]
  previewChapterCache: Record<number, any[]>
  guessLikeList: ComicItem[]
  chapterImagesCache: Record<number, string[]>
  unlockedChaptersMap: Record<number, string[]>
   comicTags: any[];             // 标签列表
  comicTagsTotal: number;       // 标签总数

  // 推荐分组相关
  recommendGroups: RecommendGroupItem[]
  recommendGroupsTotal: number
  recommendGroupComicsMap: Record<number, RecommendGroupComicsPage>
  unGroupedComics: ComicItem[]
  allRecommendGroups: RecommendGroupItem[]
  comicLibraryCache: Record<string, {
    list: ComicItem[],
    total: number,
    page: number,
    pageSize: number,
    noMore: boolean
  }>
}

export const useComicCategoryStore = defineStore('comicCategory', {
  state: (): CategoryState => ({
    mainCategories: [],
    subCategoriesMap: {},
    loading: false,
    comicDetail: {},
    comicDetailCache: {},
    chapterList: [],
    chapterListCache: {},
    previewChapterList: [],
    previewChapterCache: {},
    guessLikeList: [],
    chapterImagesCache: {},
    subCategoryComicsMap: {},
    unlockedChaptersMap: {} as Record<string, string[]>,
    comicTags: [],
    comicTagsTotal: 0,
    comicLibraryCache: {},


    // 推荐分组相关
    recommendGroups: [],
    recommendGroupsTotal: 0,
    recommendGroupComicsMap: {},
    unGroupedComics: [],
    allRecommendGroups: [],
  }),

  actions: {
    async loadMainCategories(params?: { keyword?: string; status?: number }) {
      this.loading = true
      try {
        const data = await fetchComicCategories({ onlyMain: 1, ...params })
        this.mainCategories = data.mainCategories || []
      } finally {
        this.loading = false
      }
    },
    async loadCategories(params?: { keyword?: string; status?: number }) {
      this.loading = true
      try {
        const data = await fetchComicCategories(params)
        this.mainCategories = data.mainCategories || []
      } finally {
        this.loading = false
      }
    },
    async loadSubCategoriesWithComics(
  parentId: number,
  opt: { limit?: number, page?: number, pageSize?: number, append?: boolean } = {}
) {
  const { limit = 9, page = 1, pageSize = 2, append = false } = opt;
  if (!this.subCategoriesMap[parentId]) {
    this.subCategoriesMap[parentId] = {
      subCategories: [],
      total: 0,
      page: 0,
      pageSize,
      loading: false,
      noMore: false
    }
  }
  const storeObj = this.subCategoriesMap[parentId]
  storeObj.loading = true
  try {
    // 后端要返回 subCategories + total + page + pageSize
    const data = await fetchComicCategories({ parentId, limit, page, pageSize })
    const list = data.subCategories || []
    storeObj.subCategories = append ? storeObj.subCategories.concat(list) : list
    storeObj.total = data.total || 0
    storeObj.page = page
    storeObj.pageSize = pageSize
    storeObj.noMore = storeObj.subCategories.length >= storeObj.total
    return storeObj
  } finally {
    storeObj.loading = false
  }
},
async loadMoreSubCategories(parentId: number) {
  const storeObj = this.subCategoriesMap[parentId]
  if (!storeObj || storeObj.loading || storeObj.noMore) return storeObj
  const nextPage = storeObj.page + 1
  return this.loadSubCategoriesWithComics(parentId, {
    limit: storeObj.pageSize,
    page: nextPage,
    pageSize: storeObj.pageSize,
    append: true
  })
},
getSubCategories(parentId: number): CategoryItem[] {
  return this.subCategoriesMap[parentId]?.subCategories || []
},
clearSubCategories(parentId: number) {
  delete this.subCategoriesMap[parentId]
},

    async loadComicDetail(manga_id: number | string) {
      manga_id = Number(manga_id)
      if (this.comicDetailCache[manga_id]) {
        this.comicDetail = { ...this.comicDetailCache[manga_id] }
        return this.comicDetail
      }
      this.loading = true
      try {
        const raw = await fetchComicDetail(manga_id)
        this.comicDetail = { ...raw }
        this.comicDetailCache[manga_id] = { ...raw }
        return this.comicDetail
      } catch (e) {
        this.comicDetail = {}
      } finally {
        this.loading = false
      }
    },
    async loadAllChapters(manga_id: number | string) {
      manga_id = Number(manga_id)
      if (this.chapterListCache[manga_id]) {
        this.chapterList = [...this.chapterListCache[manga_id]]
        return { list: this.chapterList }
      }
      this.loading = true
      try {
        const res = await fetchComicChapters({ manga_id, page: 1, pageSize: 999 })
        this.chapterList = res.list || []
        this.chapterListCache[manga_id] = [...this.chapterList]
        return res
      } finally {
        this.loading = false
      }
    },
    async loadPreviewChapters(manga_id: number | string, count = 3) {
      manga_id = Number(manga_id)
      if (this.previewChapterCache[manga_id]) {
        this.previewChapterList = [...this.previewChapterCache[manga_id]]
        return { list: this.previewChapterList }
      }
      this.loading = true
      try {
        const res = await fetchComicChapters({ manga_id, page: 1, pageSize: count })
        this.previewChapterList = res.list || []
        this.previewChapterCache[manga_id] = [...this.previewChapterList]
        return res
      } finally {
        this.loading = false
      }
    },
    async loadComicChapters(manga_id: number, page = 1, pageSize = 10) {
      manga_id = Number(manga_id)
      this.loading = true
      try {
        const res = await fetchComicChapters({ manga_id, page, pageSize })
        this.chapterList = res.list || []
        return res
      } catch (err) {
        this.chapterList = []
      } finally {
        this.loading = false
      }
    },
    async loadChapterList(manga_id: number | string) {
      return this.loadAllChapters(Number(manga_id))
    },
    async loadChapterImages(chapterId: number) {
      if (this.chapterImagesCache[chapterId]) {
        return this.chapterImagesCache[chapterId]
      }
      this.loading = true
      try {
        const res = await fetchChapterImages(chapterId)
        this.chapterImagesCache[chapterId] = res.images || []
        return this.chapterImagesCache[chapterId]
      } finally {
        this.loading = false
      }
    },
    async loadGuessLikeList(categoryId: number, excludeId: number | string, limit = 6) {
      this.loading = true
      try {
        const res = await fetchComicList({
          category_id: categoryId,
          page: 1,
          page_size: limit * 2,
          status: 1,
        })
        let list = (res.list || []).filter(item => item.id != excludeId)
        if (list.length > limit) {
          list = list.sort(() => Math.random() - 0.5).slice(0, limit)
        }
        this.guessLikeList = list
        return list
      } finally {
        this.loading = false
      }
    },
    /**
     * 解锁漫画章节（金币扣除）
     * @param chapterId 章节ID
     */
    async buyComicChapter(chapterId: number) {
      try {
        const res = await unlockComicChapter({ chapter_id: chapterId })
        // 解锁成功后建议自动刷新本章节内容（如果你页面有用到）
        // 比如刷新章节图片、金币余额等
        // await this.loadChapterImages(chapterId)
        // await useUserStore().loadUserInfo() // 如果有金币相关页面
        return res
      } catch (e) {
        // 可以加弹窗、toast 提示错误
        throw e
      }
    },
/**
   * 拉取某本漫画下，用户已解锁的所有章节ID
   */
  async loadUnlockedChapters(comicId) {
  const cid = String(comicId)
  try {
    const res = await getUnlockedComicChapters({ comic_id: Number(comicId) })
    // res.unlocked，res.can_view_vip_video...
    if (res && Array.isArray(res.unlocked)) {
      this.unlockedChaptersMap[cid] = res.unlocked.map(String)
      return this.unlockedChaptersMap[cid]
    } else {
      this.unlockedChaptersMap[cid] = []
      return []
    }
  } catch (e) {
    this.unlockedChaptersMap[cid] = []
    return []
  }
},

    /**
     * 拉取漫画标签列表
     * @param params 支持 keyword/status/page/page_size
     */
    async loadComicTags(params = {}) {
      this.loading = true
      try {
        const res = await fetchComicTagList(params)
        this.comicTags = res.list || []
        this.comicTagsTotal = res.total || 0
        return res
      } finally {
        this.loading = false
      }
    },


addUnlockedChapter(comicId: number | string, chapterId: number | string) {
  const cid = String(comicId)
  if (!this.unlockedChaptersMap[cid]) this.unlockedChaptersMap[cid] = []
  const chId = String(chapterId)
  if (!this.unlockedChaptersMap[cid].includes(chId)) {
    this.unlockedChaptersMap[cid].push(chId)
  }
},
/**
 * 推荐页批量拉取所有推荐分组及分组下漫画（支持分页、累加、loading、noMore）
 * @param {number} page 页码（默认1）
 * @param {number} pageSize 每页分组数（默认2或你自己定）
 * @param {boolean} force 是否强制刷新
 * @returns 分组列表、总数、是否全部加载完
 */
async loadAllRecommendGroupsWithComics({ page = 1, pageSize = 2, force = false } = {}) {
  // force 或第一页时重置
  if (force || page === 1) {
    this.allRecommendGroups = []
    this.recommendGroupsTotal = 0
  }
  this.loading = true
  try {
    // 支持传分页参数给接口
    const res = await fetchAllRecommendGroupsWithComics({ page, pageSize })
    let groups = Array.isArray(res.groups) ? res.groups : []
    // ★ 累加分组
    if (page === 1) {
      this.allRecommendGroups = groups
    } else {
      // 合并新老分组，防止重复
      const oldIds = new Set(this.allRecommendGroups.map(g => g.id))
      this.allRecommendGroups = [
        ...this.allRecommendGroups,
        ...groups.filter(g => !oldIds.has(g.id))
      ]
    }
    // 记录总数
    const total = res.total || 0
    this.recommendGroupsTotal = total
    // 判断是否全部加载完
    const noMore = (this.allRecommendGroups.length >= total)
    return {
      groups: this.allRecommendGroups,
      total,
      noMore
    }
  } finally {
    this.loading = false
  }
},

    /**
     * 分页拉取子分类下的漫画（“更多”页专用）
     * @param subCategoryId 子分类id
     * @param opt.page 页码，默认1
     * @param opt.pageSize 每页多少条，默认15
     * @param opt.append 是否追加
     */
    // 你的 store 里更新 loadSubCategoryComics 方法来正确处理分页缓存
async loadSubCategoryComics(
  subCategoryId: number,
  {
    page = 1,
    pageSize = 15,
    append = false,
  }: { page?: number; pageSize?: number; append?: boolean } = {}
) {
  // 无缓存逻辑：每次都初始化
  if (!this.subCategoryComicsMap[subCategoryId]) {
    this.subCategoryComicsMap[subCategoryId] = {
      list: [],
      total: 0,
      page: 0,
      pageSize,
      loading: false,
      finished: false,
    }
  }

  const catObj = this.subCategoryComicsMap[subCategoryId]
  catObj.loading = true

  try {
    const res = await fetchSubCategoryComics({ subCategoryId, page, pageSize })

    catObj.list = append ? catObj.list.concat(res.list || []) : (res.list || [])
    catObj.total = res.total || 0
    catObj.page = page
    catObj.pageSize = pageSize
    catObj.finished = catObj.list.length >= catObj.total

    return catObj
  } finally {
    catObj.loading = false
  }
},

// 清理缓存时，添加更多清理逻辑
clearCategoryCache(subCategoryId: number) {
  if (this.subCategoryComicsMap[subCategoryId]) {
    this.subCategoryComicsMap[subCategoryId] = {
      list: [],
      total: 0,
      page: 0,
      pageSize: 15,
      loading: false,
      finished: false,
    }
  }
},

 /**
     * 整部解锁漫画（打折批量解锁）
     */
    async buyComicWhole(comicId: number | string) {
      const cid = String(comicId)
      try {
        const res = await unlockComicWhole({ comic_id: Number(comicId) })
        // 解锁成功后，本地更新 unlockedChaptersMap，直接全部章节标记为已解锁
        if (res && res.code === 0 && Array.isArray(this.chapterListCache[cid])) {
          const allChapterIds = this.chapterListCache[cid].map(chap => String(chap.id))
          this.unlockedChaptersMap[cid] = allChapterIds
        }
        return res
      } catch (e) {
        throw e
      }
    },
  
    /**
     * 子分类“更多”下拉加载更多（自动翻页，追加）
     */
    async loadMoreSubCategoryComics(subCategoryId: number) {
      const catObj = this.subCategoryComicsMap[subCategoryId]
      if (!catObj || catObj.finished || catObj.loading) return catObj
      const nextPage = catObj.page + 1
      return this.loadSubCategoryComics(subCategoryId, {
        page: nextPage,
        pageSize: catObj.pageSize,
        append: true,
      })
    },

    async addCategory(payload: {
      name: string
      parent_id: number
      sort?: number
      status?: number
      remark?: string
    }) {
      return addComicCategory(payload)
    },
    async updateCategory(payload: {
      id: number
      name: string
      parent_id: number
      sort?: number
      status?: number
      remark?: string
    }) {
      return updateComicCategory(payload)
    },
    async deleteCategory(id: number) {
      return deleteComicCategory({ id })
    },
    async batchDelete(ids: number[]) {
      return batchDeleteComicCategory({ ids })
    },
    async toggleStatus(id: number) {
      return toggleComicCategoryStatus({ id })
    },
    async batchSetStatus(ids: number[], status: number) {
      return batchSetComicCategoryStatus({ ids, status })
    },
/**
 * 加载漫画榜单数据（支持人气/点赞/收藏+日/周/月/年，带分页，自动缓存）
 */
async loadComicRankList({
  action = 'view',
  range = 'day',
  page = 1,
  pageSize = 15,
  append = false,
}: {
  action?: 'view' | 'like' | 'collect',
  range?: 'day' | 'week' | 'month' | 'year',
  page?: number,
  pageSize?: number,
  append?: boolean
} = {}) {
  const cacheKey = `${action}_${range}`;
  if (!this.comicLibraryCache[cacheKey]) {
    this.comicLibraryCache[cacheKey] = {
      list: [],
      total: 0,
      page: 0,
      pageSize,
      loading: false,
      noMore: false,
    }
  }
  const state = this.comicLibraryCache[cacheKey];
  if (state.loading) return state;
  state.loading = true;
  try {
    // 这里action/range类型已被收紧，不会有TS警告
    const res = await fetchComicRankList({ action, range, page, pageSize });
    
    if (append) {
      // 🔥 关键修复：使用Map去重，避免重复数据
      const existingIds = new Set(state.list.map((item: any) => item.id));
      const newUniqueItems = (res.list || []).filter((item: any) => !existingIds.has(item.id));
      
      
      if (newUniqueItems.length > 0) {
        state.list = state.list.concat(newUniqueItems);
      } else {
        // 如果没有新的唯一数据，标记为没有更多
        state.noMore = true;
      }
    } else {
      // 首次加载，直接使用API返回的数据
      state.list = res.list || [];
    }
    
    state.total = res.total || 0;
    state.page = page;
    state.pageSize = pageSize;
    
    // 🔥 关键修复：更准确的noMore判断
    // 1. 如果当前已加载的数据量 >= 总数量，则没有更多
    // 2. 如果API返回的数据少于请求的pageSize，说明已到末尾
    // 3. 如果是append模式但没有获得新的唯一数据，也标记为结束
    const reachedTotal = state.list.length >= state.total;
    const apiReturnedLess = (res.list?.length || 0) < pageSize;
    const noNewData = append && (res.list?.length || 0) === 0;
    
    state.noMore = reachedTotal || apiReturnedLess || noNewData;
    
    return state;
  } finally {
    state.loading = false;
  }
},

/**
 * 榜单分页加载更多
 */
async loadMoreComicRankList(
  action: 'view' | 'like' | 'collect',
  range: 'day' | 'week' | 'month' | 'year'
) {
  const cacheKey = `${action}_${range}`;
  const state = this.comicLibraryCache[cacheKey];
  if (!state || state.loading || state.noMore) return state;
  const nextPage = state.page + 1;
  return this.loadComicRankList({
    action,
    range,
    page: nextPage,
    pageSize: state.pageSize,
    append: true
  });
},

    // --- 推荐分组相关 ---
    async loadRecommendGroups(params = {}) {
      this.loading = true
      try {
        const res = await fetchRecommendGroups(params)
        this.recommendGroups = res.list || []
        this.recommendGroupsTotal = res.total || 0
        return res
      } finally {
        this.loading = false
      }
    },
    async addRecommendGroup(payload) {
      return addRecommendGroup(payload)
    },
    async updateRecommendGroup(id, payload) {
      return updateRecommendGroup(id, payload)
    },
    async deleteRecommendGroup(id) {
      return deleteRecommendGroup(id)
    },
    async sortRecommendGroups(data) {
      return sortRecommendGroups(data)
    },

    // ------------- 分组下漫画分页加载支持 ---------------
    /**
     * 推荐分组下漫画分页加载（首次/更多都用这个）
     * @param groupId 推荐分组ID
     * @param opt.page 页码，默认1
     * @param opt.pageSize 每页多少条，默认15
     * @param opt.append 是否追加到已加载列表
     */
    async loadRecommendGroupComics(
  groupId: number,
  { page = 1, pageSize = 15, append = false } = {}
) {
  // 缓存每个分组的数据
  const cacheKey = `group_${groupId}_page_${page}`

  // 检查是否已经有缓存的数据
  if (this.recommendGroupComicsMap[cacheKey]) {
    // 如果有缓存，直接返回缓存的内容
    return this.recommendGroupComicsMap[cacheKey]
  }

  const groupObj = {
    list: [],
    total: 0,
    page: 0,
    pageSize,
    loading: false,
    finished: false,
  }

  // 将加载状态设置为 true，防止重复加载
  groupObj.loading = true
  try {
    // 请求接口获取数据
    const res = await fetchRecommendGroupComics(groupId, { page, pageSize })

    // 如果是追加数据，拼接到原数据，否则覆盖原数据
    if (append) {
      groupObj.list = groupObj.list.concat(res.list || [])
    } else {
      groupObj.list = res.list || []
    }

    // 更新缓存的数据
    groupObj.total = res.total || 0
    groupObj.page = page
    groupObj.pageSize = pageSize
    groupObj.finished = groupObj.list.length >= groupObj.total  // 判断是否加载完所有数据

    // 将数据存入缓存
    this.recommendGroupComicsMap[cacheKey] = groupObj

    return groupObj
  } finally {
    groupObj.loading = false
  }
},

/**
 * 下拉加载更多（自动翻页，追加）
 */
async loadMoreRecommendGroupComics(groupId: number) {
  const groupObj = this.recommendGroupComicsMap[`group_${groupId}_page_${groupId}`]

  // 检查是否需要加载更多，避免重复请求
  if (!groupObj || groupObj.finished || groupObj.loading) return groupObj

  // 计算下一页页码
  const nextPage = groupObj.page + 1

  // 加载下一页数据并追加
  return this.loadRecommendGroupComics(groupId, {
    page: nextPage,
    pageSize: groupObj.pageSize,
    append: true,
  })
},

    async saveRecommendGroupComics(groupId, comics) {
      return saveRecommendGroupComics(groupId, comics)
    },
    async loadUnGroupedComics() {
      this.loading = true
      try {
        const res = await fetchUnGroupedComics()
        this.unGroupedComics = res.list || []
        return this.unGroupedComics
      } finally {
        this.loading = false
      }
    },
    async loadAllComics(params) {
      return fetchAllComics(params)
    },
    async loadMainRecommendCategories() {
      return fetchMainRecommendCategories()
    },
    async loadChildRecommendCategories() {
      return fetchChildRecommendCategories()
    },
async loadLibraryComicsWithCache(opt: {
  categoryId: number,
  tagId: number,
  sort: string,
  page: number,
  pageSize?: number,
  force?: boolean // 强制刷新
}) {
  const { categoryId, tagId, sort, page, pageSize = 15, force = false } = opt
  const cacheKey = `${categoryId}_${tagId}_${sort}_${page}`
  // 优先返回缓存
  if (!force && this.comicLibraryCache[cacheKey]) {
    return this.comicLibraryCache[cacheKey]
  }
  // 拉接口
  const params: any = {
    page,
    pageSize,
    sort,
  }
  if (categoryId && categoryId !== 0) params.category_id = categoryId
  if (tagId && tagId !== 0) params.tag_id = tagId
  const res = await fetchAllComics(params)
  const data = {
    list: res?.list || [],
    total: res?.total || 0,
    page,
    pageSize,
    noMore: (res?.list?.length || 0) < pageSize || (res?.list?.length || 0) + (page - 1) * pageSize >= res?.total
  }
  this.comicLibraryCache[cacheKey] = data
  return data
},
clearComicLibraryCache() {
  this.comicLibraryCache = {}
},

    clearCurrentState() {
      this.comicDetail = {}
      this.chapterList = []
      this.previewChapterList = []
    },
    clearComicCache(mangaId?: number) {
  if (mangaId) {
    delete this.comicDetailCache[mangaId]
    delete this.chapterListCache[mangaId]
    delete this.previewChapterCache[mangaId]
  } else {
    this.comicDetailCache = {}
    this.chapterListCache = {}
    this.previewChapterCache = {}
    this.chapterImagesCache = {}
  }
  this.comicDetail = {}
  this.chapterList = []
  this.previewChapterList = []
  
},
clearRecommendGroupCache(groupId: number) {
  if (this.recommendGroupComicsMap[groupId]) {
    // 清理该分组的缓存
    this.recommendGroupComicsMap[groupId] = {
      list: [],
      total: 0,
      page: 0,
      pageSize: 15,
      loading: false,
      finished: false,
    }
  }
},

/**
 * 获取限免漫画列表
 */
async loadLimitedFreeComics(params?: {
  page?: number;
  pageSize?: number;
  category_id?: number;
}) {
  try {
    const response = await fetchAllComics({
      is_vip: 0,      // ✅ 确保传递 is_vip: 0
      coin: 0,        // ✅ 确保传递 coin: 0
      page: params?.page || 1,
      pageSize: params?.pageSize || 20,
      category_id: params?.category_id,
      status: 1 // 只获取上架的
    })
    return response
  } catch (error) {
    console.error('获取限免漫画失败:', error)
    throw error
  }
},

/**
 * 获取完结漫画列表
 */
async loadCompletedComics(params?: {
  page?: number;
  pageSize?: number;
  category_id?: number;
}) {
  try {
    const response = await fetchAllComics({
      is_serializing: 0,
      page: params?.page || 1,
      pageSize: params?.pageSize || 20,
      category_id: params?.category_id,
      status: 1 // 只获取上架的
    })
    return response
  } catch (error) {
    console.error('获取完结漫画失败:', error)
    throw error
  }
},
    /**
     * 获取每日更新的漫画（简化版）
     */
    async loadDailyUpdates({
      page = 1,
      pageSize = 15
    }: {
      page?: number
      pageSize?: number
    }) {
      try {
        const response = await fetchDailyUpdates({
          page,
          page_size: pageSize
        })
        
        if (response && response.list) {
          return {
            list: response.list || [],
            total: response.total || 0
          }
        } else {
          return { list: [], total: 0 }
        }
      } catch (error) {
        console.error('获取最新更新失败:', error)
        return { list: [], total: 0 }
      }
    },

    /**
     * 获取周更新漫画（简化版）
     */
    async loadWeeklyUpdates({
      updateDay,
      page = 1,
      pageSize = 15
    }: {
      updateDay: number
      page?: number
      pageSize?: number
    }) {
      try {
        const response = await fetchWeeklyUpdates({
          update_day: updateDay,
          page,
          page_size: pageSize
        })
        
        if (response && response.list) {
          return {
            list: response.list || [],
            total: response.total || 0
          }
        } else {
          return { list: [], total: 0 }
        }
      } catch (error) {
        console.error('获取周更新失败:', error)
        return { list: [], total: 0 }
      }
    },

    /**
     * 获取本周所有更新的漫画（新增方法）
     */
    async loadWeeklyAllUpdates({
      page = 1,
      pageSize = 15
    }: {
      page?: number
      pageSize?: number
    }) {
      try {
        const response = await fetchWeeklyAllUpdates({
          page,
          page_size: pageSize
        })
        
        if (response && response.list) {
          return {
            list: response.list || [],
            total: response.total || 0
          }
        } else {
          return { list: [], total: 0 }
        }
      } catch (error) {
        console.error('获取本周更新失败:', error)
        return { list: [], total: 0 }
      }
    }
  }
  
})
