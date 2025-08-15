import request from '@/utils/request'

// 参数规范化，避免丢参：
// - 同时传递 camelCase 与 snake_case 常见键
// - 保留原有所有字段
function normalizeParams(p: any = {}) {
  const out: any = { ...p }
  if (p?.pageSize != null) {
    out.page_size = p.page_size ?? p.pageSize
  }
  if (p?.subCategoryId != null) {
    out.sub_category_id = p.sub_category_id ?? p.subCategoryId
  }
  if (p?.categoryId != null) {
    out.category_id = p.category_id ?? p.categoryId
  }
  if (p?.parentId != null) {
    out.parent_id = p.parent_id ?? p.parentId
  }
  if (p?.groupId != null) {
    out.group_id = p.group_id ?? p.groupId
  }
  if (p?.mangaId != null) {
    out.manga_id = p.manga_id ?? p.mangaId
  }
  return out
}

// 统一列表响应适配
function adaptList(res: any, defaultPageSize = 15) {
  if (Array.isArray(res)) {
    return { list: res, total: res.length, page: 1, pageSize: res.length }
  }
  const list = res?.list ?? res?.data ?? res?.items ?? []
  const total = res?.total ?? res?.count ?? list.length
  const page = res?.page ?? res?.current ?? 1
  const pageSize = res?.pageSize ?? res?.page_size ?? res?.per_page ?? defaultPageSize
  return { list, total, page, pageSize }
}

// 统一分类响应适配（主分类 / 子分类）
function adaptCategory(res: any, params?: any) {
  // onlyMain: 主分类
  if (params?.onlyMain) {
    if (Array.isArray(res)) {
      return { mainCategories: res, subCategories: [], total: res.length, page: 1, pageSize: res.length }
    }
    const main = res?.mainCategories ?? res?.main ?? res?.list ?? res?.data ?? []
    const total = res?.total ?? main.length
    const page = res?.page ?? 1
    const pageSize = res?.pageSize ?? res?.page_size ?? main.length
    return { mainCategories: main, subCategories: [], total, page, pageSize }
  }
  // 子分类
  if (params?.parentId != null) {
    if (Array.isArray(res)) {
      return { subCategories: res, total: res.length, page: 1, pageSize: res.length }
    }
    const list = res?.subCategories ?? res?.sub ?? res?.list ?? res?.data ?? []
    const total = res?.total ?? res?.count ?? list.length
    const page = res?.page ?? res?.current ?? 1
    const pageSize = res?.pageSize ?? res?.page_size ?? res?.per_page ?? (params?.pageSize ?? 2)
    return { subCategories: list, total, page, pageSize }
  }
  // 兜底：同时尝试主/子结构
  if (Array.isArray(res)) {
    return { mainCategories: res, subCategories: [], total: res.length, page: 1, pageSize: res.length }
  }
  return {
    mainCategories: res?.mainCategories ?? [],
    subCategories: res?.subCategories ?? res?.list ?? [],
    total: res?.total ?? 0,
    page: res?.page ?? 1,
    pageSize: res?.pageSize ?? res?.page_size ?? 0
  }
}

/**
 * 获取分类列表
 * - parentId: 主分类ID，返回该主分类下的子分类（分页），每组子分类下挂 limit 本漫画
 * - page, pageSize: 子分类分页参数
 * - limit: 每组子分类下的漫画数
 * 返回 { subCategories: [], total: number, page: number, pageSize: number }
 */
export async function fetchComicCategories(params?: {
  keyword?: string;
  parentId?: number;
  status?: number;
  onlyMain?: number;
  limit?: number;      // 每组子分类下多少本漫画
  page?: number;       // 子分类分页参数
  pageSize?: number;   // 子分类分页参数
}): Promise<{
  mainCategories?: any[];
  subCategories?: any[];
  total?: number;
  page?: number;
  pageSize?: number;
}> {
  const raw = await request.get('comic_category_list', normalizeParams(params))
  return adaptCategory(raw, params)
}

/**
 * 添加分类
 */
export function addComicCategory(data: {
  name: string;
  parent_id: number;
  sort?: number;
  status?: number;
  remark?: string;
}): Promise<any> {
  return request.post('comic_category_add', data)
}

/**
 * 更新分类
 */
export function updateComicCategory(data: {
  id: number;
  name: string;
  parent_id: number;
  sort?: number;
  status?: number;
  remark?: string;
}): Promise<any> {
  return request.post('comic_category_update', data)
}

/**
 * 删除分类
 */
export function deleteComicCategory(data: { id: number }): Promise<any> {
  return request.post('comic_category_delete', data)
}

/**
 * 批量删除
 */
export function batchDeleteComicCategory(data: { ids: number[] }): Promise<any> {
  return request.post('comic_category_batch_delete', data)
}

/**
 * 切换单个分类状态
 */
export function toggleComicCategoryStatus(data: { id: number }): Promise<any> {
  return request.post('comic_category_toggle_status', data)
}

/**
 * 批量设置分类状态
 */
export function batchSetComicCategoryStatus(data: { ids: number[]; status: number }): Promise<any> {
  return request.post('comic_category_batch_set_status', data)
}

/**
 * 拉取漫画详情
 */
export function fetchComicDetail(id: number): Promise<any> {
  return request.get('comic_detail', { id, manga_id: id })
}

/**
 * 拉取漫画章节列表
 */
export function fetchComicChapters(params: { manga_id: number; page?: number; pageSize?: number }): Promise<{ list: any[] }> {
  return request.get('comic_chapters', normalizeParams(params))
}

/**
 * 拉取单章详情
 */
export function fetchChapterDetail(id: number): Promise<any> {
  return request.get('comic_chapter_detail', { id, chapter_id: id })
}

/**
 * 拉取章节图片
 */
export function fetchChapterImages(chapter_id: number): Promise<{ images: string[] }> {
  return request.get('comic_chapter_images', { chapter_id })
}

/**
 * 拉取当前主分类下的推荐/看了又看漫画列表
 */
export async function fetchComicList(params: {
  category_id: number;
  page?: number;
  page_size?: number;
  pageSize?: number; // 允许别名，便于 adaptList 默认值读取
  status?: number;
}): Promise<{ list: any[] }> {
  const raw = await request.get('comic_manga_list', normalizeParams(params))
  const a = adaptList(raw, params?.page_size ?? params?.pageSize ?? 15)
  return { list: a.list }
}

/* ================== 推荐分组管理 ================== */

/**
 * 获取推荐分组列表
 */
export function fetchRecommendGroups(params?: any): Promise<{ list: any[]; total: number }> {
  return request.get('comic_recommend_groups', normalizeParams(params))
}

/**
 * 新增推荐分组
 */
export function addRecommendGroup(data: any): Promise<any> {
  return request.post('comic_recommend_group_add', data)
}

/**
 * 更新推荐分组
 */
export function updateRecommendGroup(id: number | string, data: any): Promise<any> {
  return request.post('comic_recommend_group_update', { id, group_id: id, ...data })
}

/**
 * 删除推荐分组
 */
export function deleteRecommendGroup(id: number | string): Promise<any> {
  return request.post('comic_recommend_group_delete', { id, group_id: id })
}

/**
 * 批量/拖动排序保存推荐分组
 */
export function sortRecommendGroups(data: any): Promise<any> {
  return request.post('comic_recommend_groups_sort', { data })
}

/**
 * 获取推荐分组下的漫画
 */
export function fetchRecommendGroupComics(
  groupId: number | string,
  params?: { page?: number; pageSize?: number }
): Promise<{ list: any[], total: number, page: number, pageSize: number }> {
  return request.get('comic_recommend_group_comics', normalizeParams({ groupId, ...(params || {}) }))
}

/**
 * 保存推荐分组下的漫画（拖拽/排序/替换等）
 */
export function saveRecommendGroupComics(groupId: number | string, comics: any[]): Promise<any> {
  return request.post('comic_recommend_group_comics_save', { groupId, group_id: groupId, comics })
}

/**
 * 获取所有未分组的漫画（推荐池左侧可选漫画）
 */
export function fetchUnGroupedComics(): Promise<{ list: any[] }> {
  return request.get('comic_ungrouped_comics')
}

/**
 * 获取全部漫画（用于推荐池右侧搜索、筛选）
 */
export function fetchAllComics(params?: {
  keyword?: string;
  category_id?: number;
  page?: number;
  pageSize?: number;
  status?: number;
  is_vip?: number; // ✅ 新增：VIP筛选 (0: 非VIP, 1: VIP)
  coin?: number; // ✅ 新增：金币筛选 (0: 免费, >0: 付费)
  is_serializing?: number; // ✅ 新增：连载状态 (0: 已完结, 1: 连载中)
}): Promise<{ list: any[]; total: number }> {
  return request.get('comic_all_comics', normalizeParams(params))
}

/**
 * 获取主分类（推荐池可选条件）
 */
export function fetchMainRecommendCategories(): Promise<{ list: any[] }> {
  return request.get('comic_main_recommend_categories')
}

/**
 * 获取子分类（推荐池可选条件）
 */
export function fetchChildRecommendCategories(): Promise<{ list: any[] }> {
  return request.get('comic_child_recommend_categories')
}

/**
 * 获取所有推荐分组及分组下全部漫画（推荐页高效一次拉取专用）
 */
export function fetchAllRecommendGroupsWithComics(params?: { page?: number; pageSize?: number }): Promise<{ groups: any[]; total: number }> {
  return request.get('comic_all_recommend_groups_with_comics', normalizeParams(params))
}

/**
 * 分页拉取某个子分类下的漫画（用于“更多”页、子分类下的全部列表分页展示）
 * @param params 传 subCategoryId、page、pageSize，建议 pageSize 默认 15
 */
export function fetchSubCategoryComics(params: {
  subCategoryId: number;
  page?: number;
  pageSize?: number;
  status?: number; // 可选，默认1，只拉上架的
}): Promise<{ list: any[], total: number, page: number, pageSize: number }> {
  return request.get('comic_sub_category_comics', normalizeParams(params))
}

/**
 * 获取漫画标签列表
 * @param params 支持 keyword, status, page, page_size
 * @returns { list: any[], total: number }
 */
export function fetchComicTagList(params?: {
  keyword?: string;
  status?: number;
  page?: number;
  page_size?: number;
}): Promise<{ list: any[]; total: number }> {
  return request.get('comic_tag_list', normalizeParams(params))
}

/**
 * 获取漫画榜单（支持人气/点赞/收藏+日周月年，分页）
 * @param params { action: 'view'|'like'|'collect', range: 'day'|'week'|'month'|'year', page, pageSize }
 * @returns { list: any[], total: number }
 */
export function fetchComicRankList(params: {
  action: 'view' | 'like' | 'collect', // 榜单类型
  range: 'day' | 'week' | 'month' | 'year', // 时间范围
  page?: number
  pageSize?: number
}): Promise<{ list: any[], total: number }> {
  return request.get('comic_rank_list', normalizeParams(params))
}

/**
 * 获取每日更新的漫画（简化版）
 */
export function fetchDailyUpdates(params: {
  page?: number;
  page_size?: number;
}) {
  return request.get('comic_daily_updates', normalizeParams(params))
}

/**
 * 获取周更新漫画（简化版）
 */
export function fetchWeeklyUpdates(params: {
  update_day: number; // 1-5 对应周一到周五
  page?: number;
  page_size?: number;
}) {
  return request.get('comic_weekly_updates', normalizeParams(params))
}

/**
 * 获取本周所有更新的漫画（新增）
 */
export function fetchWeeklyAllUpdates(params: {
  page?: number;
  page_size?: number;
}) {
  return request.get('comic_weekly_all_updates', normalizeParams(params))
}
