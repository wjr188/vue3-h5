import request from '@/utils/request'

/**
 * 获取分类列表
 * - parentId: 主分类ID，返回该主分类下的子分类（分页），每组子分类下挂 limit 本漫画
 * - page, pageSize: 子分类分页参数
 * - limit: 每组子分类下的漫画数
 * 返回 { subCategories: [], total: number, page: number, pageSize: number }
 */
export function fetchComicCategories(params?: {
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
  return request.get('/api/comic/category/list', { params });
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
  return request.post('/api/comic/category/add', data);
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
  return request.post('/api/comic/category/update', data);
}

/**
 * 删除分类
 */
export function deleteComicCategory(data: { id: number }): Promise<any> {
  return request.post('/api/comic/category/delete', data);
}

/**
 * 批量删除
 */
export function batchDeleteComicCategory(data: { ids: number[] }): Promise<any> {
  return request.post('/api/comic/category/batchDelete', data);
}

/**
 * 切换单个分类状态
 */
export function toggleComicCategoryStatus(data: { id: number }): Promise<any> {
  return request.post('/api/comic/category/toggleStatus', data);
}

/**
 * 批量设置分类状态
 */
export function batchSetComicCategoryStatus(data: { ids: number[]; status: number }): Promise<any> {
  return request.post('/api/comic/category/batchSetStatus', data);
}

/**
 * 拉取漫画详情
 */
export function fetchComicDetail(id: number): Promise<any> {
  return request.get(`/api/comic/manga/${id}`);
}

/**
 * 拉取漫画章节列表
 */
export function fetchComicChapters(params: { manga_id: number; page?: number; pageSize?: number }): Promise<{ list: any[] }> {
  return request.get('/api/comic/chapter/list', { params });
}

/**
 * 拉取单章详情
 */
export function fetchChapterDetail(id: number): Promise<any> {
  return request.get(`/api/comic/chapter/${id}`);
}

/**
 * 拉取章节图片
 */
export function fetchChapterImages(chapter_id: number): Promise<{ images: string[] }> {
  return request.get('/api/comic/manga/chapter/images', { params: { chapter_id } });
}

/**
 * 拉取当前主分类下的推荐/看了又看漫画列表
 */
export function fetchComicList(params: {
  category_id: number;
  page?: number;
  page_size?: number;
  status?: number;
}): Promise<{ list: any[] }> {
  return request.get('/api/comic/manga/list', { params });
}

/* ================== 推荐分组管理 ================== */

/**
 * 获取推荐分组列表
 */
export function fetchRecommendGroups(params?: any): Promise<{ list: any[]; total: number }> {
  return request.get('/api/comic-recommend/group/list', { params });
}

/**
 * 新增推荐分组
 */
export function addRecommendGroup(data: any): Promise<any> {
  return request.post('/api/comic-recommend/group/add', data);
}

/**
 * 更新推荐分组
 */
export function updateRecommendGroup(id: number | string, data: any): Promise<any> {
  return request.put(`/api/comic-recommend/group/update/${id}`, data);
}

/**
 * 删除推荐分组
 */
export function deleteRecommendGroup(id: number | string): Promise<any> {
  return request.delete(`/api/comic-recommend/group/delete/${id}`);
}

/**
 * 批量/拖动排序保存推荐分组
 */
export function sortRecommendGroups(data: any): Promise<any> {
  return request.post('/api/comic-recommend/group/sort', { data });
}

/**
 * 获取推荐分组下的漫画
 */
// 支持 page 和 pageSize 参数，建议 pageSize 默认为 15
export function fetchRecommendGroupComics(
  groupId: number | string,
  params?: { page?: number; pageSize?: number }
): Promise<{ list: any[], total: number, page: number, pageSize: number }> {
  return request.get(`/api/comic-recommend/group/comics/${groupId}`, { params });
}


/**
 * 保存推荐分组下的漫画（拖拽/排序/替换等）
 */
export function saveRecommendGroupComics(groupId: number | string, comics: any[]): Promise<any> {
  return request.post(`/api/comic-recommend/group/comics/save/${groupId}`, { comics });
}

/**
 * 获取所有未分组的漫画（推荐池左侧可选漫画）
 */
export function fetchUnGroupedComics(): Promise<{ list: any[] }> {
  return request.get('/api/comic-recommend/comic/unGrouped');
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
  return request.get('/api/comic/manga/list', { params });
}


/**
 * 获取主分类（推荐池可选条件）
 */
export function fetchMainRecommendCategories(): Promise<{ list: any[] }> {
  return request.get('/api/comic-recommend/category/main');
}

/**
 * 获取子分类（推荐池可选条件）
 */
export function fetchChildRecommendCategories(): Promise<{ list: any[] }> {
  return request.get('/api/comic-recommend/category/child');
}
/**
 * 获取所有推荐分组及分组下全部漫画（推荐页高效一次拉取专用）
 */
export function fetchAllRecommendGroupsWithComics(params?: { page?: number; pageSize?: number }): Promise<{ groups: any[]; total: number }> {
  return request.get('/api/comic-recommend/group/allWithComics', { params });
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
  return request.get('/api/comic/category/sub-comics', { params });
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
  return request.get('/api/comic/tag/list', { params });
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
  return request.get('/api/comic/manga/rankList', { params });
}

/**
 * 获取每日更新的漫画（简化版）
 */
export function fetchDailyUpdates(params: {
  page?: number;
  page_size?: number;
}) {
  return request.get('/api/comic/manga/daily-updates', { params });
}

/**
 * 获取周更新漫画（简化版）
 */
export function fetchWeeklyUpdates(params: {
  update_day: number; // 1-5 对应周一到周五
  page?: number;
  page_size?: number;
}) {
  return request.get('/api/comic/manga/weekly-updates', { params });
}

/**
 * 获取本周所有更新的漫画（新增）
 */
export function fetchWeeklyAllUpdates(params: {
  page?: number;
  page_size?: number;
}) {
  return request.get('/api/comic/manga/weekly-all-updates', { params });
}
