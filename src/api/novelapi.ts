import request from '@/utils/request'

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
  return request.get('api/text_novel_category/list', { params })
}

export function getNovelList(params?: any): Promise<NovelListResponse> {
  return request.get('api/text_novel/list', { params })
}

export function getNovelDetail(id: number | string): Promise<NovelDetailResponse> {
  return request.get('api/text_novel/read', { params: { id } })
}

export function getNovelChapters(params?: any): Promise<NovelChapterListResponse> {
  return request.get('api/text_novel_chapter/list', { params })
}

export function getNovelChapterDetail(id: number | string): Promise<NovelChapterDetailResponse> {
  return request.get(`api/text_novel_chapter/${id}`)
}

export function getNovelRecommendAllWithNovels(params?: any): Promise<RecommendGroupResponse> {
  return request.get('api/novel-recommend/group/allWithNovels', { params })
}

export function getNovelRecommendGroupNovels(params: { groupId: number | string; page?: number; pageSize?: number }): Promise<RecommendGroupNovelsResponse> {
  const { groupId, ...rest } = params
  return request.get(`api/novel-recommend/group/${groupId}/novels`, { params: rest })
}

export function getNovelTagList(params?: any): Promise<NovelTagListResponse> {
  return request.get('api/text_novel_tag/list', { params })
}
