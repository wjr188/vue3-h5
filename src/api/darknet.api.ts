import service from "@/utils/request"; // 使用加密请求服务

/**
 * 获取暗网首页推荐分组及分组下视频
 * @param params { page?: number; pageSize?: number }
 */
export function fetchDarknetHome(params: { page?: number; pageSize?: number } = {}) {
  return service.get("darknet_home", params);
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
  return service.get("darknet_group_videos", { groupId, ...params });
}

/**
 * 获取所有主分类
 */
export function fetchH5DarknetCategoryList(params: { only_parents?: number } = {}) {
  return service.get("darknet_categories_list", params);
}

/**
 * 获取暗网主分类下的子分类及每个子分类下的视频列表
 * @param params { parent_id: number; page?: number; pageSize?: number }
 */
export function fetchDarknetCategoryWithVideos(params: { parent_id: number; page?: number; pageSize?: number }) {
  return service.get("darknet_videos_h5_list", params);
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
  return service.get("darknet_category_videos", { category_id, ...params });
}