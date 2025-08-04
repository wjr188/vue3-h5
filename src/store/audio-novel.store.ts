import { defineStore } from "pinia";
import {unlockAudioNovelChapter, getUnlockedAudioNovelChapters,} from '@/api/unlock.api'

import { 
  fetchAudioNovelCategoryList,
  fetchAudioNovelList,
  fetchAudioNovelDetail,
  fetchAudioRecommendAllGroups,
  fetchAudioRecommendGroupAudiosPaginated,
  // 新增2个章节接口的引用
  fetchAudioNovelChapterList,
  fetchAudioNovelChapterDetail,
  fetchAudioNovelChapterPlay,
  fetchAudioNovelTagList
} from "@/api/audio-novel.api";

export const useAudioNovelCategoryStore = defineStore("audioNovelCategory", {
  state: () => ({
    // 分类相关
    mainCategories: [],
    subCategories: [],
    // 标签相关
    tagList: [],
    // 按 categoryId 分页缓存
    categoryAudioMap: {} as Record<
      string | number,
      Record<number, { list: any[]; total: number }>
    >, // { [categoryId]: { [page]: { list:[], total } } }
    detail: null,
    loading: false,
    // 推荐分组相关缓存
    recommendGroups: [],
    recommendGroupsTotal: 0,
    // 按分组ID分页缓存分组音频列表
    recommendGroupAudioMap: {} as Record<
      string | number,
      Record<number, { list: any[]; total: number }>
    >, // { [groupId]: { [page]: { list:[], total } } }
    // ========= 新增章节缓存 =========
    chapterMap: {} as Record<
      string | number,
      Record<number, { list: any[]; total: number; novel?: any }>
    >, // { [novelId]: { [page]: { list:[], total } } }
    chapterDetail: null as any, // 当前章节详情
    audioLibraryCache: {} as Record<string, { list: any[], total: number, noMore?: boolean }>
  }),
  
  actions: {
    // 拉取有声小说分类列表
    async loadCategoryList(params = {}) {
      this.loading = true;
      try {
        const res = await fetchAudioNovelCategoryList(params);
        this.mainCategories = res.mainCategories || [];
        this.subCategories = res.subCategories || [];
      } finally {
        this.loading = false;
      }
    },
    // 分页缓存拉取有声小说列表
    async loadAudioNovelList(
      params: { categoryId?: string | number; page?: number; pageSize?: number } = {},
      append = false,
      categoryId?: string | number
    ) {
      this.loading = true;
      try {
        // 取出真正的 categoryId
        const realCategoryId = String(categoryId ?? params.categoryId ?? "");
        // 请求数据
        const res = await fetchAudioNovelList(params);

        // 👇👇👇 字段兼容：让每条数据都带 cover 字段
        if (Array.isArray(res.list)) {
          res.list.forEach(item => {
            if (!item.cover && item.cover_url) {
              item.cover = item.cover_url;
            }
            if (item.serialization_status !== undefined && item.is_serializing === undefined) {
              item.is_serializing = item.serialization_status;
            }
          });
        }

        // 分页缓存到 categoryAudioMap
        if (realCategoryId !== undefined && realCategoryId !== null && realCategoryId !== '') {
          const key = String(realCategoryId);   // 保证 key 始终为字符串
          const page = Number(params.page || 1);

          // 如果之前没有这个分类，先创建空对象，保证响应式
          if (!this.categoryAudioMap[key]) {
            this.categoryAudioMap[key] = {};
          }
          // 再用 set 语义合并分页数据
          this.categoryAudioMap[key][page] = {
            list: res.list || [],
            total: res.total || 0,
          };
        }
      } finally {
        this.loading = false;
      }
    },
    // 获取有声小说详情
    async loadAudioNovelDetail(id: string | number) {
      this.loading = true;
      try {
        const res = await fetchAudioNovelDetail(id);
        this.detail = res || null;
      } finally {
        this.loading = false;
      }
    },

    // -------------------------------
    // 推荐页：拉取所有聚合分组及每组部分有声小说（缓存）
    async loadAudioRecommendAllGroups(params: { page?: number; pageSize?: number } = {}) {
      this.loading = true;
      try {
        const res = await fetchAudioRecommendAllGroups(params);
        // 只在第一页清空，后续 append
        if (params.page === 1 || !this.recommendGroups.length) {
          this.recommendGroups = res.groups || [];
        } else {
          this.recommendGroups = [
            ...this.recommendGroups,
            ...(res.groups || [])
          ];
        }
        this.recommendGroupsTotal = res.total || 0;
        return res; // { groups, total }
      } finally {
        this.loading = false;
      }
    },
    // 推荐页：拉取某推荐分组下的有声小说（分页+缓存）
    async loadAudioRecommendGroupAudiosPaginated(
      groupId: string | number,
      params: { page?: number; pageSize?: number } = {}
    ) {
      this.loading = true;
      try {
        const res = await fetchAudioRecommendGroupAudiosPaginated(groupId, params);
        // 分页缓存到 recommendGroupAudioMap
        const key = String(groupId);
        const page = Number(params.page || 1);
        if (!this.recommendGroupAudioMap[key]) {
          this.recommendGroupAudioMap[key] = {};
        }
        this.recommendGroupAudioMap[key][page] = {
          list: res.list || [],
          total: res.total || 0,
        };
        return res; // { list, total }
      } finally {
        this.loading = false;
      }
    },
async loadLibraryAudioNovelsWithCache(params: {
  categoryId?: number,
  tagId?: number,
  sort?: string,
  page?: number,
  pageSize?: number,
  force?: boolean,
}) {
  const {
    categoryId = 0,
    tagId = 0,
    sort = 'default',
    page = 1,
    pageSize = 15,
    force = false
  } = params
  const cacheKey = `${categoryId}_${tagId}_${sort}_${page}`
  if (!force && this.audioLibraryCache[cacheKey]) {
    return this.audioLibraryCache[cacheKey]
  }
  const res = await fetchAudioNovelList({
    categoryId,
    tagId,
    sort,
    page,
    pageSize
  })
  this.audioLibraryCache[cacheKey] = {
    list: res.list || [],
    total: res.total || 0,
    noMore: !res.list || res.list.length < pageSize
  }
  return this.audioLibraryCache[cacheKey]
},
// 放这里就行 ↓↓↓
    /**
     * 搜索有声小说（搜一搜tab用）
     */
    async searchAudioNovels(params: {
      keyword: string,
      page?: number,
      pageSize?: number,
      categoryId?: string | number
    }) {
      const res = await fetchAudioNovelList(params);
      const list = (res.list || []).map(item => ({
        ...item,
        cover: item.cover || item.cover_url || ''
      }));
      return { ...res, list };
    },
    // ==========================
    // 新增：有声小说章节相关
    // ==========================
    /**
     * 获取有声小说章节列表（分页缓存）
     * @param novelId 小说ID
     * @param params 分页参数
     */
    async loadAudioNovelChapterList(
  novelId: string | number,
  params: { page?: number; pageSize?: number } = {}
) {
  this.loading = true;
  try {
    const res = await fetchAudioNovelChapterList(novelId, params);
    // 分页缓存到 chapterMap，并带 novel 字段
    const key = String(novelId);
    const page = Number(params.page || 1);
    if (!this.chapterMap[key]) {
      this.chapterMap[key] = {};
    }
    this.chapterMap[key][page] = {
      list: res.list || [],
      total: res.total || 0,
      novel: res.novel || {},
    };
    return res; // { list, total, novel }
  } finally {
    this.loading = false;
  }
},
async loadTagList() {
  const res = await fetchAudioNovelTagList()
  this.tagList = res?.list || []
  return this.tagList
},
// play 方法命名和前端用法保持一致
async playChapter(chapterId: string | number) {
  // 你的 api 参数是对象还是直接 id，自己对一下（此处假定直接 id 就行）
  const res = await fetchAudioNovelChapterPlay(chapterId);
  return res; // 保持和你前端的 await 一致
},
    /**
     * 获取有声小说章节详情
     * @param chapterId 章节ID
     */
    async loadAudioNovelChapterDetail(chapterId: string | number) {
      this.loading = true;
      try {
        const res = await fetchAudioNovelChapterDetail(chapterId);
        this.chapterDetail = res || null;
        return res;
      } finally {
        this.loading = false;
      }
    },
        /**
     * 解锁有声小说单章节
     * @param chapterId 章节ID
     * @returns Promise<{ code, msg }>
     */
    async unlockAudioNovelChapter(chapterId: number | string) {
      // 参数包装成对象
      return await unlockAudioNovelChapter({ chapter_id: chapterId });
    },

    /**
     * 查询已解锁的有声小说章节ID
     * @param audioNovelId 有声小说ID
     * @returns Promise<{ code, msg, data: number[] }>
     */
    async getUnlockedAudioNovelChapters(audioNovelId: number | string) {
      return await getUnlockedAudioNovelChapters({ audio_novel_id: Number(audioNovelId) });
    }
    // -------------------------------
  }
});
