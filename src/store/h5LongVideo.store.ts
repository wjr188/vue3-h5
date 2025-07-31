import { defineStore } from "pinia";
import { fetchH5LongHome, fetchH5LongVideoDetail, fetchRecommendGroupVideos, H5LongVideoGroup, H5LongVideoDetail } from "../api/h5LongVideo.api";

export const useH5LongVideoStore = defineStore("h5LongVideo", {
  state: () => ({
    groups: [] as H5LongVideoGroup[],
    videoDetail: null as H5LongVideoDetail | null,
    loading: false,
    detailLoading: false,
    lastFetchTime: 0, // 推荐页缓存时间戳
    cacheDuration: 5 * 60 * 1000, // 5分钟缓存
    // 新增：分组视频缓存
    groupCache: {} as Record<string, {
      list: any[];
      total: number;
      lastPage: number;
      hasMore: boolean;
      lastFetchTime: number;
    }>,
  }),
  actions: {
    async loadHome(params: { page?: number; pageSize?: number } = {}, force = false) {
      if (this.loading) return;
      // 只有第一页且不强制时才用缓存
      if (!force && (params.page === 1 || !params.page) && this.groups.length > 0 && Date.now() - this.lastFetchTime < this.cacheDuration) {
        return;
      }
      // 没有更多页时直接返回
      if (this.totalPages && params.page && params.page > this.totalPages) {
        return;
      }
      this.loading = true;
      try {
        const res = await fetchH5LongHome(params);
        // 分页追加
        if (params.page && params.page > 1) {
          const newGroups = Array.isArray(res.groups) ? res.groups : [];
          if (newGroups.length === 0) {
            // 没有更多数据，不再递增 currentPage
            this.totalPages = params.page - 1;
            return;
          }
          this.groups = [...this.groups, ...newGroups];
        } else {
          this.groups = Array.isArray(res.groups) ? res.groups : [];
        }
        this.total = res.total || 0;
        this.currentPage = res.current_page || params.page || 1;
        this.totalPages = res.total_pages || 1;
        this.perPage = res.per_page || 3;
        this.lastFetchTime = Date.now();
      } finally {
        this.loading = false;
      }
    },
    async loadDetail(id: number | string) {
      this.detailLoading = true;
      try {
        const res = await fetchH5LongVideoDetail(id);
        this.videoDetail = res || null;
      } finally {
        this.detailLoading = false;
      }
    },
    clearDetail() {
      this.videoDetail = null;
    },
    /**
     * 拉取/换一批 推荐分组下的视频
     * @param groupId 分组ID
     * @param random 是否随机（换一批时传true）
     * @param pageSize 每批数量，默认5
     */
    async loadGroupVideos(groupId: number | string, random = false, pageSize = 5) {
      this.groupCache[groupId] = this.groupCache[groupId] || {};
      this.groupCache[groupId].loading = true;
      try {
        const res = await fetchRecommendGroupVideos(Number(groupId), {
          random: random ? 1 : 0,
          pageSize
        });
        console.log('换一批接口返回：', res.list)
        const idx = this.groups.findIndex(g => Number(g.id) === Number(groupId));
        console.log('groups 替换前：', this.groups)
        console.log('groups 替换 idx：', idx)
        this.groupCache[groupId].list = res.list || [];
        this.groupCache[groupId].total = res.total || 0;
        this.groupCache[groupId].lastFetchTime = Date.now();
        // 用新对象替换分组，保证响应式
        if (idx !== -1) {
          this.groups[idx] = {
            ...this.groups[idx],
            videos: this.groupCache[groupId].list
          };
          // 关键：触发响应式
          this.groups = [...this.groups];
        }
      } finally {
        this.groupCache[groupId].loading = false;
      }
    }
  }
});