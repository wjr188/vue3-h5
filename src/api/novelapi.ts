import service from '@/utils/request'

interface NovelCategoryListResponse {
  mainCategories: any[]
  subCategories: any[]
}

interface NovelListResponse {
  list: any[]
  total: number
}

interface NovelDetailResponse {
  id: number
  name: string
  // 你可以补充更多字段
}

interface NovelChapterListResponse {
  list: any[]
  total: number
}

interface NovelChapterDetailResponse {
  id: number
  novel_id: number
  title: string
  content: string
  // 你可以补充更多字段
}

interface RecommendGroupResponse {
  groups: Array<{
    id: number
    name: string
    novels: any[]
  }>
  total: number
}

interface RecommendGroupNovelsResponse {
  list: any[]
  total: number
}

interface NovelTagListResponse {
  list: any[]
}

export function getNovelCategoryList(params?: any): Promise<NovelCategoryListResponse> {
  return service.get('text_novel_category_list', params)
}

export function getNovelList(params?: any): Promise<NovelListResponse> {
  return service.get('text_novel_list', params)
}

export function getNovelDetail(id: number | string): Promise<NovelDetailResponse> {
  return service.get('text_novel_detail', { id })
}

export function getNovelChapters(params?: any): Promise<NovelChapterListResponse> {
  return service.get('text_novel_chapter_list', params)
}

export function getNovelChapterDetail(id: number | string): Promise<NovelChapterDetailResponse> {
  return service.get('text_novel_chapter_detail', { id })
}

export function getNovelRecommendAllWithNovels(params?: any): Promise<RecommendGroupResponse> {
  return service.get('text_novel_recommend_all_groups', params)
}

export function getNovelRecommendGroupNovels(params: { groupId: number | string; page?: number; pageSize?: number }): Promise<RecommendGroupNovelsResponse> {
  const { groupId, ...rest } = params
  return service.get('text_novel_recommend_group_novels', { ...rest, groupId })
}

export function getNovelTagList(params?: any): Promise<NovelTagListResponse> {
  return service.get('text_novel_tag_list', params)
}
