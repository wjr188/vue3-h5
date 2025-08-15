import { defineStore } from "pinia";
import {
  fetchLongVideoParentCategories,
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
        // TODO: 需要实现 fetchLongVideoChildCategories API
        // const res = await fetchLongVideoChildCategories(parent_id, page, page_size) as any;
        // const list = Array.isArray(res.children) ? res.children : [];
        // this.childrenMap[parent_id] = list;
        // this.children = list;
        // this.childrenTotal = res.total || 0; // 如果后端返回 total
        
        // 临时返回空数据
        this.childrenMap[parent_id] = [];
        this.children = [];
        this.childrenTotal = 0;
      } finally {
        this.loading = false;
      }
    },
    async addParentCategory(name: string) {
      // TODO: 需要实现 addLongVideoParentCategory API
      // await addLongVideoParentCategory({ name });
      console.warn('addLongVideoParentCategory API 尚未实现');
      await this.loadCategories();
    },
    async addChildCategory(name: string, parent_id: number) {
      // TODO: 需要实现 addLongVideoChildCategory API
      // await addLongVideoChildCategory({ name, parent_id });
      console.warn('addLongVideoChildCategory API 尚未实现');
      await this.loadCategories();
    },
  },
});