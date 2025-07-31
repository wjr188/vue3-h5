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
  }),
  actions: {
    async loadTags() {
      this.loading = true;
      try {
        const res = await fetchLongVideoTags();
        console.log('标签接口返回', res);
        this.tags = res.list || [];
      } finally {
        this.loading = false;
      }
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