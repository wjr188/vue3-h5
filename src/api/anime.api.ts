import request from '@/utils/request'

export interface AnimeCategory { id: number; name: string; parent_id: number; sort: number; status: number; }
export interface AnimeVideo { id: number; title: string; cover: string; coin: number; is_vip: number; parent_id: number; category_id: number; m3u8?: string; }
export interface GroupSubCategory extends AnimeCategory { animes: AnimeVideo[] }
export interface AnimeMainCategoryRes { mainCategories: AnimeCategory[] }
export interface AnimeGroupRes { subCategories: GroupSubCategory[]; total: number; page: number; pageSize: number }
export interface AnimeBySubCategoryRes { list: AnimeVideo[]; total: number; page: number; pageSize: number }
export interface AnimeTag {
  id: number
  name: string
  group?: string
  status: number
  sort: number
  [key: string]: any // 其他字段
}
// 新增推荐分组相关类型
export interface AnimeRecommendGroup {
  id: number
  name: string
  sort: number
  status: number
  remark?: string
  created_at?: string
  updated_at?: string
  animes: AnimeVideo[]
}
export interface RecommendGroupsRes {
  groups: AnimeRecommendGroup[]
  total: number
}
export interface GroupAnimesRes {
  list: AnimeVideo[]
  total: number
  page: number
  pageSize: number
}
// AnimeTag 查询接口返回类型
export interface AnimeTagsRes {
  data: AnimeTag[]
}
// 分类相关 - 使用加密API
export function fetchAnimeMainCategories(onlyMain = 1): Promise<AnimeMainCategoryRes> {
  return request.get('anime_category_list', { onlyMain })
}
export function fetchAnimeGroup(parentId: number, page = 1, pageSize = 2, limit = 6): Promise<AnimeGroupRes> {
  return request.get('anime_category_group', { parentId, page, pageSize, limit })
}
export function fetchAnimeBySubCategory(subCategoryId: number, page = 1, pageSize = 15): Promise<AnimeBySubCategoryRes> {
  return request.get('anime_sub_animes', { subCategoryId, page, pageSize })
}
// H5动漫视频列表（多条件筛选 + 分页 + 排序） - 使用加密API
export function fetchAnimeVideoList(params: {
  keyword?: string
  parentId?: number
  categoryId?: number
  is_vip?: number
  coin?: number
  status?: number
  sort?: string
  page?: number
  pageSize?: number
  limit?: number
}): Promise<AnimeBySubCategoryRes> {
  return request.get('anime_video_list', params)
}

// 推荐分组相关 - 使用加密API
export function fetchAnimeRecommendGroups(page = 1, pageSize = 2, limit = 9): Promise<RecommendGroupsRes> {
  return request.get('anime_recommend_all', { page, pageSize, limit })
}
export function fetchAnimeGroupAnimes(groupId: number, page = 1, pageSize = 15): Promise<GroupAnimesRes> {
  return request.get('anime_recommend_groups', { groupId, page, pageSize })
}
// 获取动漫标签（支持传参：keyword, group, status） - 使用加密API
export function fetchAnimeTags(params?: {
  keyword?: string
  group?: string
  status?: number
}): Promise<AnimeTagsRes> {
  return request.get('anime_tags', params)
}