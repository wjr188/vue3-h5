import { defineStore } from "pinia";
import {
  fetchLongVideoParentCategories,
  addLongVideoParentCategory,
  addLongVideoChildCategory,
  fetchLongVideoChildCategories,
} from "@/api/longCategory.api";

export const useLongCategoryStore = defineStore("longCategory", {
  state: () => ({
    categories: [] as any[],
    children: [] as any[], // 当前主分类下的子分类
    childrenMap: {} as Record<number, any[]>, // 缓存每个主分类下的子分类
    childrenTotal: 0, // 子分类总数
    loading: false,
  }),
  actions: {
    async loadCategories() {
      this.loading = true;
      try {
        const res = await fetchLongVideoParentCategories() as any;
        this.categories = Array.isArray(res.parents) ? res.parents : [];
        this.children = [];
      } finally {
        this.loading = false;
      }
    },
    async loadChildren(parent_id: number, page = 1, page_size = 20) {
      this.loading = true;
      try {
        const res = await fetchLongVideoChildCategories(parent_id, page, page_size) as any;
        const list = Array.isArray(res.children) ? res.children : [];
        this.childrenMap[parent_id] = list;
        this.children = list;
        this.childrenTotal = res.total || 0; // 如果后端返回 total
      } finally {
        this.loading = false;
      }
    },
    async addParentCategory(name: string) {
      await addLongVideoParentCategory({ name });
      await this.loadCategories();
    },
    async addChildCategory(name: string, parent_id: number) {
      await addLongVideoChildCategory({ name, parent_id });
      await this.loadCategories();
    },
  },
});