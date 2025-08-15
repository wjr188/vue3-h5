import request from "@/utils/request";

// 获取所有长视频主分类（只要主分类，不要子分类）
export function fetchLongVideoParentCategories() {
  return request.get("long_video_category", { only_parents: 1 });
}

// ... 其它分类相关接口 ...