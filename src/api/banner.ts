import request from "@/utils/request";

/**
 * 获取广告列表 - 使用加密API
 * @param {Object} params - 查询参数
 */
export function fetchBannerList(params: { page?: number; pageSize?: number } = {}) {
  return request.get("banner_list", params);
}

