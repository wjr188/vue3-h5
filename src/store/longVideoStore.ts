// src/store/longVideoStore.ts
import { defineStore } from "pinia";
import {
  fetchLongVideoList,
  fetchLongVideoDetail,
  playLongVideo,
  fetchH5AllLongVideos,
} from "@/api/longVideo.api";
import { unlockLongVideo } from '@/api/unlock.api'

export const useLongVideoStore = defineStore("longVideo", {
  state: () => ({
    list: [] as any[],
    total: 0,
    loading: false,
    detail: null as any,
    playUrl: "",
    cache: {} as Record<number, Record<string, {
      list: any[];
      total: number;
      lastPage: number;
      hasMore: boolean;
    }>>,
    videoCache: {} as Record<number, any[]>, // 小分类视频缓存
    // 新增：主分类分页及子分类缓存
    categoryStates: {} as Record<string, {
      data: any[];
      page: number;
      hasMore: boolean;
      isLoading: boolean;
    }>,
    // 新增：主分类下所有子分类的视频缓存
    videoBasicData: {} as Record<number, any[]>
  }),
  actions: {
    // 获取/初始化主分类状态
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
    // 设置主分类下子分类的视频
    setVideoBasicData(categoryId: number, videos: any[]) {
      this.videoBasicData[categoryId] = videos
    },
    /**
     * 加载视频列表
     */
    async loadList(params: any = {}) {
      const { parent_id, page = 1, pageSize = 20 } = params;

      // 检查缓存
      if (
        parent_id &&
        this.cache[parent_id] &&
        page <= this.cache[parent_id].lastPage
      ) {
        this.list = [...this.cache[parent_id].list].slice(0, page * pageSize);
        this.total = this.cache[parent_id].total;
        return;
      }

      this.loading = true;
      try {
        const res = await fetchLongVideoList({ ...params, page, pageSize });
        const newItems = (res?.list || []).map((item) => ({
          id: item.id,
          title: item.title,
          cover: item.cover_url,
          duration: item.duration,
          preview_duration: item.preview_duration,
          category_id: item.category_id,
          categoryName: item.categoryName,
          parent_id: item.parent_id,
          parentName: item.parentName,
          tags: item.tags,
          vip: item.vip,
          coin: item.coin,
          goldCoins: item.goldCoins,
          play: item.play,
          sort: item.sort,
          categorySort: item.categorySort ?? item.category_sort,
          icon: item.category_icon || '',
        }));

        if (page === 1) {
          this.cache[parent_id] = {
            list: newItems,
            total: res?.total || 0,
            lastPage: page,
            hasMore: newItems.length >= pageSize,
          };
          this.list = newItems;
        } else {
          this.cache[parent_id].list = [
            ...this.cache[parent_id].list,
            ...newItems,
          ];
          this.cache[parent_id].lastPage = page;
          this.cache[parent_id].hasMore = newItems.length >= pageSize;
          this.list = this.cache[parent_id].list;
        }
        this.total = this.cache[parent_id].total;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 加载视频详情 - 只接受数字ID
     */
    async loadDetail(id: number) {
      this.loading = true;
      try {
        if (typeof id !== "number" || isNaN(id) || id <= 0) {
          throw new Error(`无效的视频ID: ${id}`);
        }
        const res = await fetchLongVideoDetail(id);
        this.detail = res || null;
      } catch (error) {
        console.error("加载视频详情失败", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 播放视频（获取播放地址）
     */
    async fetchPlayUrl(data: { video_id: number; userId?: string }) {
      this.loading = true;
      try {
        if (typeof data.video_id !== "number" || isNaN(data.video_id) || data.video_id <= 0) {
          console.error(`无效的视频ID: ${data.video_id}`);
          return null; // 返回默认值，避免抛出异常
        }
        const payload = {
          video_id: data.video_id,
          userId: data.userId,
        };
        const res = await playLongVideo(payload);
        this.playUrl = res.url;
        return res;
      } catch (error: any) {
        console.error("获取播放地址失败", error);

        // 处理 403 错误
        if (error.code === 403) {
          console.warn("权限不足，用户需要开通VIP");
          return { code: 403, msg: error.msg || '权限不足' }; // 返回一个标识错误的对象
        }

        // 记录其他错误
        console.warn("其他错误:", error);
        return null; // 返回默认值，避免未捕获的 Promise rejection
      } finally {
        this.loading = false;
      }
    },

    /**
     * 简化的直接播放封装
     */
    async playVideo(data: any) {
      return await this.fetchPlayUrl(data);
    },

    /**
     * 单部视频金币解锁
     */
    async buySingleVideo({ videoId, coin }: { videoId: number; coin: number }) {
      try {
        await unlockLongVideo({ video_id: videoId, coin })
        await this.loadDetail(videoId)
        return true
      } catch (e) {
        throw e
      }
    },

    /**
     * 换一批：加载某个子分类下的视频（支持分页）
     */
    async loadH5CategoryVideos(categoryId: number, page = 1, pageSize = 6) {
      this.loading = true;
      try {
        const res = await fetchH5AllLongVideos({ category_id: categoryId, page, pageSize, random: 1 });
        const list = res?.list || [];
        this.list = list;
        this.total = res?.total || 0;
        return list;
      } finally {
        this.loading = false;
      }
    },

    // 新增分批加载主分类+子分类+视频列表
    async loadH5CategoryBatch(params: { parent_id: number; page: number }) {
      this.loading = true;
      try {
        const res = await fetchLongVideoList(params);
        // 直接返回 categories，分页信息
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
  },
});
