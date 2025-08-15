import service from "@/utils/request";

/**
 * 获取有声小说分类列表（只读） - 使用加密API
 */
export function fetchAudioNovelCategoryList(params: {
  keyword?: string;
  parentId?: number | string;
  status?: number | string;
} = {}): Promise<{ mainCategories: any[]; subCategories: any[] }> {
  return service.get("audio_novel_category_list", params);
}

/**
 * 获取有声小说列表 - 使用加密API
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

  return service.get("audio_novel_list", finalParams);
}

/**
 * 获取有声小说详情 - 使用加密API
 */
export function fetchAudioNovelDetail(id: number | string): Promise<any> {
  return service.get("audio_novel_detail", { id });
}

/**
 * 获取有声小说推荐分组聚合（含每组部分音频，用于首页推荐页等） - 使用加密API
 * @param params 分页参数 page/pageSize
 */
export function fetchAudioRecommendAllGroups(
  params: { page?: number; pageSize?: number } = {}
): Promise<{ groups: any[]; total: number }> {
  return service.get("audio_recommend_all_groups", params);
}

/**
 * 分页获取指定推荐分组下的所有有声小说 - 使用加密API
 * @param groupId 推荐分组ID
 * @param params 分页参数 page/pageSize
 */
export function fetchAudioRecommendGroupAudiosPaginated(
  groupId: number | string,
  params: { page?: number; pageSize?: number } = {}
): Promise<{ list: any[]; total: number }> {
  return service.get("audio_recommend_group_audios", { groupId, ...params });
}

/**
 * ==============================
 *        新增章节相关接口
 * ==============================
 */

/**
 * 获取有声小说章节列表 - 使用加密API
 * @param novelId 小说ID
 * @param params  可传分页参数 { page, pageSize }
 */
export function fetchAudioNovelChapterList(
  novelId: number | string,
  params: { page?: number; pageSize?: number } = {}
): Promise<{ list: any[]; total: number; novel?: any }> {
  return service.get("audio_novel_chapter_list", { novelId, ...params });
}

/**
 * 获取有声小说章节详情 - 使用加密API
 * @param chapterId 章节ID
 */
export function fetchAudioNovelChapterDetail(chapterId: number | string): Promise<any> {
  return service.get("audio_novel_chapter_detail", { id: chapterId });
}

/**
 * 章节播放接口（返回音频地址） - 使用加密API
 */
export function fetchAudioNovelChapterPlay(chapterId: number | string): Promise<{ audio_url: string }> {
  return service.post("audio_novel_chapter_play", { chapter_id: chapterId });
}
/**
 * 获取有声小说标签列表 - 使用加密API
 * @param params 可选参数（如 keyword, status）
 * @returns 标签列表与总数
 */
export function fetchAudioNovelTagList(
  params: { keyword?: string; status?: number | string } = {}
): Promise<{ list: any[]; total: number }> {
  return service.get("audio_novel_tag_list", params);
}
