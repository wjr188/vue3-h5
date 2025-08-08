import request from "@/utils/request";

/**
 * 获取暗网首页推荐分组及分组下视频
 * @param params { page?: number; pageSize?: number }
 */
export function fetchDarknetHome(params: { page?: number; pageSize?: number } = {}) {
  return request.get("/api/h5/darknet/home", { params });
}

/**
 * 获取某个暗网推荐分组下的视频列表（支持分页、排序）
 * @param groupId 推荐分组ID
 * @param params { page?: number; pageSize?: number; sort?: string }
 */
export function fetchDarknetGroupVideos(
  groupId: number | string,
  params: { page?: number; pageSize?: number; sort?: string } = {}
) {
  return request.get(`/api/h5/darknet/group/${groupId}/videos`, { params });
}

/**
 * 获取所有主分类
 */
export function fetchH5DarknetCategoryList(params: { only_parents?: number } = {}) {
  return request.get("/api/h5/darknet/categories/list", { params });
}

/**
 * 获取暗网主分类下的子分类及每个子分类下的视频列表
 * @param params { parent_id: number; page?: number; pageSize?: number }
 */
export function fetchDarknetCategoryWithVideos(params: { parent_id: number; page?: number; pageSize?: number }) {
  return request.get("/api/darknet/videos/h5-list", { params });
}

/**
 * 获取某个暗网子分类下的全部视频（分页+排序）
 * @param category_id 子分类ID
 * @param params { page?: number; pageSize?: number; sort?: string }
 */
export function fetchDarknetCategoryVideos(
  category_id: number | string,
  params: { page?: number; pageSize?: number; sort?: string; random?: number } = {}
) {
  return request.get(`/api/h5/darknet/category/${category_id}/videos`, { params });
}