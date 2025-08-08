import { defineStore } from "pinia";
import {
  fetchDarknetHome,
  fetchDarknetGroupVideos,
  fetchH5DarknetCategoryList,
  fetchDarknetCategoryWithVideos, // 新增
  fetchDarknetCategoryVideos
} from "@/api/darknet.api";
import { unlockDarknetVideo } from "@/api/unlock.api";

export const useDarknetStore = defineStore("darknet", {
  state: () => ({
    recommendGroups: [] as any[], // 推荐页分组
    categories: [] as any[],      // 主分类
    total: 0,
    currentPage: 1,
    totalPages: 1,
    perPage: 3,
    loading: false,
    error: "",
    tabStates: [] as any[],
    pageSize: 3,
    // 新增缓存字段
    cache: {} as Record<number, Record<string, {
      list: any[];
      total: number;
      lastPage: number;
      hasMore: boolean;
    }>>,
    // 新增：滚动位置和分组缓存
    scrollPositions: {} as Record<string, number>, // 存储每个分类的滚动位置
    cachedGroups: [] as any[], // 缓存的分组数据
    // 添加完整缓存状态
    cachedState: {
      groups: [] as any[],
      currentPage: 1,
      totalPages: 1,
      scrollPositions: {} as Record<string, number>
    },
    // 新增：主分类分页及子分类缓存
    categoryStates: {} as Record<string, {
      data: any[];
      page: number;
      hasMore: boolean;
      isLoading: boolean;
    }>,
    // 新增：主分类下所有子分类的视频缓存
    videoBasicData: {} as Record<number, any[]>,
    moreDarknetCategoryVideos: {} as Record<number, { list: any[]; total: number; page: number; hasMore: boolean; isLoading: boolean; sort: string }>,
  }),
  actions: {
    resetHomeState() {
      this.recommendGroups = [];
      this.cachedState = {
        groups: [],
        currentPage: 1,
        totalPages: 1,
        scrollPositions: {}
      };
      // ...其他重置
    },
    async loadHome(params: { [key: string]: any } = {}) {
      this.loading = true;
      this.error = "";
      // 如果是第一页，重置数据
      if ((params.page || 1) === 1) {
        this.recommendGroups = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.total = 0;
      }
      try {
        const res = await fetchDarknetHome(params) as any;
        if ((params.page || 1) === 1) {
          this.recommendGroups = res.groups || [];
        } else {
          this.recommendGroups = [...this.recommendGroups, ...(res.groups || [])];
        }
        this.currentPage = params.page || 1;
        this.total = res.total || 0;
        this.totalPages = res.total_pages || 1;
        this.perPage = res.per_page || 3;
      } catch (e: any) {
        this.error = e?.message || "请求异常";
      } finally {
        this.loading = false;
      }
    },
    // actions 里只要这个方法，别的都不用加
    async loadTabData(tabIndex: number, groupId: number, isLoadMore = false) {
      const tab = this.tabStates[tabIndex];
      if (tab.loading || (!tab.hasMore && isLoadMore)) return;
      tab.loading = true;
      this.error = "";
      try {
        const sortArr = ["collect", "play", "new"];
        const sort = sortArr[tabIndex] || "collect";
        const page = isLoadMore ? tab.page + 1 : 1;
        const res = await fetchDarknetGroupVideos(groupId, {
          page,
          pageSize: this.pageSize,
          sort,
        }) as any;
        const list = res.list || [];
        if (isLoadMore) {
          tab.list = tab.list.concat(list);
          tab.page = page;
        } else {
          tab.list = list;
          tab.page = 1;
        }
        tab.hasMore = list.length >= this.pageSize;
        tab.inited = true;

        // 新增：同步缓存
        const tabKey = sort;
        if (!this.cache[groupId]) this.cache[groupId] = {};
        this.cache[groupId][tabKey] = {
          list: [...tab.list],
          total: res.total || 0,
          lastPage: tab.page,
          hasMore: tab.hasMore,
        };
      } catch (e: any) {
        this.error = e?.message || "请求异常";
      } finally {
        tab.loading = false;
      }
    },
    async loadParentCategories() {
      this.loading = true;
      this.error = "";
      try {
        // 主分类
        const res = await fetchH5DarknetCategoryList({ only_parents: 1 }) as any;
        // 这里直接用 res.list，不用 res.data.list
        this.categories = res.list || [];

        this.total = res.total || 0;
      } catch (e: any) {
        this.error = e?.message || "请求异常";
      } finally {
        this.loading = false;
      }
    },
    setScrollPosition(category: string, position: number) {
      this.scrollPositions[category] = position;
    },
    getScrollPosition(category: string): number {
      return this.scrollPositions[category] || 0;
    },
    // 修改 cacheRecommendState 方法
    cacheRecommendState() {
      this.cachedState = {
        groups: [...this.recommendGroups],
        currentPage: this.currentPage,
        totalPages: this.totalPages,
        scrollPositions: { ...this.scrollPositions }
      };
    },
    restoreRecommendState() {
      if (this.cachedState.groups.length > 0) {
        this.recommendGroups = [...this.cachedState.groups];
        this.currentPage = this.cachedState.currentPage;
        this.totalPages = this.cachedState.totalPages;
        this.scrollPositions = { ...this.cachedState.scrollPositions };
      }
    },
    // 新增：主分类-子分类-视频批量拉取（和长视频一致）
    getCategoryState(name: string) {
      if (!this.categoryStates[name]) {
        this.categoryStates[name] = {
          data: [],
          page: 1,
          hasMore: true,
          isLoading: false
        }
      }
      return this.categoryStates[name]
    },
    setVideoBasicData(categoryId: number, videos: any[]) {
      this.videoBasicData[categoryId] = videos
    },
    async loadH5CategoryBatch(params: { parent_id: number; page: number }) {
      console.log('[API-call] loadH5CategoryBatch params:', params, new Error().stack);
      this.loading = true;
      try {
        const res = await fetchDarknetCategoryWithVideos(params) as any;
        console.log('[API-call] loadH5CategoryBatch result:', res);
        return {
          categories: res?.categories || [],
          total: res?.total || 0,
          current_page: res?.current_page || 1,
          total_pages: res?.total_pages || 1,
          per_page: res?.per_page || 3,
          parent: res?.parent || null
        };
      } finally {
        this.loading = false;
      }
    },
    /**
     * 加载“更多”页面某个暗网子分类下的视频（分页+排序）
     */
    async loadMoreDarknetCategoryVideos(categoryId: number, params: { page?: number; pageSize?: number; sort?: string; random?: number } = {}) {
      const { page = 1, pageSize = 20, sort = "collect", random } = params;
      if (!this.moreDarknetCategoryVideos[categoryId]) {
        this.moreDarknetCategoryVideos[categoryId] = { list: [], total: 0, page: 1, hasMore: true, isLoading: false, sort };
      }
      const state = this.moreDarknetCategoryVideos[categoryId];
      if (state.isLoading) return; // 只判断 isLoading
      state.isLoading = true;
      try {
        const res = await fetchDarknetCategoryVideos(categoryId, { page, pageSize, sort, random }) as any;
        const data = res.data || {};
        state.list = data.list || [];
        state.total = data.total || 0;
        state.page = page;
        state.hasMore = true; // 换一批场景始终允许继续换
        state.sort = sort;
      } finally {
        state.isLoading = false;
      }
    },

    /**
     * 切换排序时重置“更多”页面数据
     */
    resetMoreDarknetCategoryVideos(categoryId: number) {
      if (this.moreDarknetCategoryVideos[categoryId]) {
        this.moreDarknetCategoryVideos[categoryId] = { list: [], total: 0, page: 1, hasMore: true, isLoading: false, sort: "collect" };
      }
    },

    /**
     * 解锁暗网视频
     */
    async unlockVideo(videoId: number) {
     
      try {
        const res = await unlockDarknetVideo({ video_id: videoId });
        return res;
      } catch (e: any) {
        this.error = e?.message || "解锁失败";
        throw e;
      }
    },
  }
});