import service from "@/utils/request";

/**
 * 获取有声小说分类列表（只读）
 */
export function fetchAudioNovelCategoryList(params: {
  keyword?: string;
  parentId?: number | string;
  status?: number | string;
} = {}): Promise<{ mainCategories: any[]; subCategories: any[] }> {
  return service.get("/api/audio_novel_category/list", { params });
}

/**
 * 获取有声小说列表
 */
export function fetchAudioNovelList(
  params: { categoryId?: string | number; [key: string]: any } = {}
): Promise<{ list: any[]; total: number }> {
  let finalParams = { ...params };
  if (
    finalParams.hasOwnProperty("categoryId") &&
    finalParams.categoryId !== undefined &&
    finalParams.categoryId !== null &&
    finalParams.categoryId !== ""
  ) {
    finalParams.category_id = finalParams.categoryId;
  }
  delete finalParams.categoryId;

  // 重点：打个日志看参数到底是什么
  console.log('[fetchAudioNovelList] params:', params, 'finalParams:', finalParams);

  return service.get("/api/audio_novel/list", { params: finalParams });
}

/**
 * 获取有声小说详情
 */
export function fetchAudioNovelDetail(id: number | string): Promise<any> {
  return service.get("/api/audio_novel/detail", { params: { id } });
}

/**
 * 获取有声小说推荐分组聚合（含每组部分音频，用于首页推荐页等）
 * @param params 分页参数 page/pageSize
 */
export function fetchAudioRecommendAllGroups(
  params: { page?: number; pageSize?: number } = {}
): Promise<{ groups: any[]; total: number }> {
  return service.get("/api/audio/recommend/allWithAudios", { params });
}

/**
 * 分页获取指定推荐分组下的所有有声小说
 * @param groupId 推荐分组ID
 * @param params 分页参数 page/pageSize
 */
export function fetchAudioRecommendGroupAudiosPaginated(
  groupId: number | string,
  params: { page?: number; pageSize?: number } = {}
): Promise<{ list: any[]; total: number }> {
  return service.get(`/api/audio/recommend/groups/${groupId}/audiosPaginated`, { params });
}

/**
 * ==============================
 *        新增章节相关接口
 * ==============================
 */

/**
 * 获取有声小说章节列表
 * @param novelId 小说ID
 * @param params  可传分页参数 { page, pageSize }
 */
export function fetchAudioNovelChapterList(
  novelId: number | string,
  params: { page?: number; pageSize?: number } = {}
): Promise<{ list: any[]; total: number; novel?: any }> {
  return service.get("/api/audio_novel_chapter/list", {
    params: {  novelId, ...params }
  });
}

/**
 * 获取有声小说章节详情
 * @param chapterId 章节ID
 */
export function fetchAudioNovelChapterDetail(chapterId: number | string): Promise<any> {
  return service.get("/api/audio_novel_chapter/detail", {
    params: { id: chapterId }
  });
}

/**
 * 章节播放接口（返回音频地址）
 */
export function fetchAudioNovelChapterPlay(chapterId: number | string): Promise<{ audio_url: string }> {
  return service.post("/api/audio_novel_chapter/play", { chapter_id: chapterId });
}
/**
 * 获取有声小说标签列表
 * @param params 可选参数（如 keyword, status）
 * @returns 标签列表与总数
 */
export function fetchAudioNovelTagList(
  params: { keyword?: string; status?: number | string } = {}
): Promise<{ list: any[]; total: number }> {
  return service.get("/api/audio_novel_tag/list", { params });
}
