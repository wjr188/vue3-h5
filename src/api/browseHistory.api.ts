import request from '@/utils/request'

// 浏览记录相关的接口类型定义 - 仿照收藏接口格式
export interface BrowseHistoryItem {
  id: number
  content_id: number
  content_type: string
  action_type: 'browse'
  created_at: string // 浏览时间
  video?: {
    id: number
    title: string
    cover: string
    duration: string
    likes: number
  }
  comic?: {
    id: number
    title: string
    cover: string
    chapter_count: number
    likes: number
  }
  novel?: {
    id: number
    title: string
    cover: string
    chapter_count: number
    likes: number
  }
  audio?: {
    id: number
    title: string
    cover: string
    chapter_count: number
  }
  image?: {
    id: number
    title: string
    cover: string
    url: string
  }
}

export interface BrowseHistoryResponse {
  code: number
  msg: string
  data: {
    list: BrowseHistoryItem[]
    total: number
    page: number
    limit: number
    has_more: boolean
  }
}

// 新增：拦截器解包后的类型定义
export interface BrowseHistoryUnpackedResponse {
  list: BrowseHistoryItem[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

export interface BrowseLogAllTypesResponse {
  code: number
  msg?: string
  data: {
    [key: string]: BrowseHistoryItem[] // 按类型分组的数据
  }
}

export interface AddBrowseLogParams {
  user_uuid: string
  content_id: string | number
  content_type: string
  type: string
  extra?: any
}

/**
 * H5获取用户浏览记录列表（分页）- 使用加密API
 * @param params 查询参数
 */
export const getBrowseHistory = (params: {
  user_uuid: string
  type?: string // 内容类型：long_video、darknet、anime、comic、text_novel、audio_novel
  page?: number
  limit?: number // 改为limit参数
}): Promise<BrowseHistoryUnpackedResponse> => {  // 修复：使用解包后的类型
  console.log('🚀 API getBrowseHistory 被调用:', {
    apiName: 'browse_history_list',
    params
  })
  
  return request.get('browse_history_list', params).then((response: any) => {
    console.log('🚀 API 响应:', response)
    return response as BrowseHistoryUnpackedResponse  // 修复：返回解包后的类型
  }).catch(error => {
    console.error('❌ API 请求失败:', error)
    throw error
  })
}

/**
 * H5获取所有类型的浏览记录（不分页，每种类型最多10条）- 使用加密API
 * @param user_uuid 用户UUID
 */
export const getAllBrowseHistory = (user_uuid: string): Promise<BrowseLogAllTypesResponse> => {
  return request.get('browse_history_all_types', { user_uuid })
}

/**
 * 添加浏览记录 - 使用加密API
 * @param params 浏览记录参数
 */
export const addBrowseLog = (params: AddBrowseLogParams): Promise<{ code: number; msg: string }> => {
  return request.post('browse_history_add', params)
}

/**
 * 删除浏览记录 - 使用加密API
 * @param id 浏览记录ID
 */
export const deleteBrowseLog = (id: number): Promise<{ code: number; msg: string }> => {
  return request.post('browse_history_delete', { id })
}
