import { defineStore } from "pinia";
import {
  fetchLongVideoTags,
  addLongVideoTag,
  updateLongVideoTag,
  deleteLongVideoTag,
} from "@/api/longtag.api";

export const useLongTagStore = defineStore("longTag", {
  state: () => ({
    tags: [] as any[],
    loading: false,
    type: 'long', // 新增类型字段，默认长视频
  }),
  actions: {
    // 支持传type参数，默认用state.type
    async loadTags(type?: string) {
      this.loading = true;
      try {
        const res = await fetchLongVideoTags({ type: type || this.type });
        console.log('标签接口返回', res);
        this.tags = res.list || [];
      } finally {
        this.loading = false;
      }
    },
    setType(type: string) {
      this.type = type;
    },
    async addTag(name: string) {
      await addLongVideoTag({ name });
      await this.loadTags();
    },
    async updateTag(id: number, name: string) {
      await updateLongVideoTag({ id, name });
      await this.loadTags();
    },
    async deleteTag(id: number) {
      await deleteLongVideoTag({ id });
      await this.loadTags();
    },
  },
});