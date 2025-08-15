import request from '@/utils/request'

// H5 前端类型定义
export interface H5OnlyFansCategory {
  id: number
  name: string
  intro?: string
  icon?: string
  sort: number
  creator_count: number
}

export interface H5OnlyFansCreator {
  id: number
  name: string
  avatar?: string
  intro?: string
  // creators 列表接口不返回这两个，因此改为可选
  media_count?: number
  fans_count?: number
}

export interface H5OnlyFansMedia {
  id: number
  title: string
  cover?: string
  type: 'image' | 'video'
  coin: number

  // 计数：后端已转为 int
  view_count: number
  like_count: number
  favorite_count: number

  // 兼容两种 VIP 字段
  vip?: boolean
  is_vip?: 0 | 1

  create_time: string

  // 搜索/联表里可能带的字段
  creator_name?: string
  creator_avatar?: string
  creator_id?: number
}

export interface H5CreatorDetail {
  creator: H5OnlyFansCreator & {
    category_name: string
  }
  stats: {
    total_media: number
    image_count: number
    video_count: number
  }
  media_list: H5OnlyFansMedia[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export interface H5MediaDetail {
  media: H5OnlyFansMedia & {
    creator: H5OnlyFansCreator
    category: {
      id: number
      name: string
    }
    /** 若为图集，这里返回总张数（实际图片走分页接口获取） */
    image_total?: number
    /** 若为视频，可能返回以下字段 */
    video_url?: string
    duration?: number
    file_size?: number
    /** 标签数组 */
    tags?: { id: number; name: string }[]
  }
  recommend: H5OnlyFansMedia[]
}

export interface H5SearchResult {
  keyword: string
  type: string
  page: number
  page_size: number
  result: {
    creators?: {
      list: H5OnlyFansCreator[]
      total: number
      has_more: boolean
    }
    media?: {
      list: H5OnlyFansMedia[]
      total: number
      has_more: boolean
    }
  }
}

/** 新增：拆分接口的响应类型 */
export interface H5CreatorProfile {
  creator: H5OnlyFansCreator & { category_name: string }
  stats: {
    total_media: number
    image_count: number
    video_count: number
  }
}

export interface H5CreatorMediaPage {
  list: H5OnlyFansMedia[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

/** 新增：图集分页类型 */
export interface H5MediaImageItem {
  id: number
  url: string
  width: number
  height: number
}
export interface H5MediaImagesPage {
  list: H5MediaImageItem[]
  /** 方便直接 append 字符串 URL */
  urls: string[]
  total: number
  page: number
  page_size: number
  has_more: boolean
  like_count: number            // ✅ 新增
  favorite_count: number        // ✅ 新增
}

// OnlyFans H5 前台API
export const onlyfansH5Api = {
  /** 获取分类列表 */
  getCategories(): Promise<H5OnlyFansCategory[]> {
    return request.get('onlyfans_categories')
  },

  /** 获取指定分类下的博主列表 */
  getCreatorsByCategory(
    categoryId: number,
    params?: { page?: number; page_size?: number; keyword?: string }
  ): Promise<{ list: H5OnlyFansCreator[]; total: number; page: number; page_size: number; has_more: boolean }> {
    return request.get('onlyfans_creators_by_category', { categoryId, ...params })
  },

  /** 合并版：获取博主详情及其内容 */
  getCreatorDetail(
    id: number,
    params?: { content_type?: 'all' | 'image' | 'video'; page?: number; page_size?: number }
  ): Promise<H5CreatorDetail> {
    return request.get('onlyfans_creator_detail', { id, ...params })
  },

  /** 拆分版：获取博主资料 */
  getCreatorProfile(id: number): Promise<H5CreatorProfile> {
    return request.get('onlyfans_creator_profile', { id })
  },

  /** 拆分版：获取博主媒体 */
  getCreatorMedia(
    id: number,
    params: { type: 'image' | 'video'; page?: number; page_size?: number }
  ): Promise<H5CreatorMediaPage> {
    return request.get('onlyfans_creator_media', { id, ...params })
  },

  /** 获取媒体内容详情（不再返回整组 images） */
  getMediaDetail(id: number): Promise<H5MediaDetail> {
    return request.get('onlyfans_media_detail', { id })
  },

  /** ✅ 新增：图集图片分页 */
  getMediaImages(
    id: number,
    params?: { page?: number; page_size?: number }
  ): Promise<H5MediaImagesPage> {
    return request.get('onlyfans_media_images', { id, ...params })
  },

  /** 搜索 */
  search(params: { keyword: string; type?: 'all' | 'creator' | 'media'; page?: number; page_size?: number }): Promise<H5SearchResult> {
    return request.get('onlyfans_search', params)
  }
}

export default onlyfansH5Api
