import request from '@/utils/request'

/**
 * 关键词数据接口
 */
export interface KeywordItem {
  id: number
  keyword: string
  display_label: string
  heat: number
  sort: number
  status: number
  category: string
  description: string
  display_count: number
  click_count: number
  create_time: string
  update_time: string
  delete_time: string | null
}

/**
 * API响应数据结构
 */
export interface KeywordResponse {
  code: number
  msg: string
  data: {
    list: KeywordItem[]
    total: number
    page: number
    pageSize: number
    pages: number
  }
}

/**
 * 随机关键词响应结构
 */
export interface RandomKeywordResponse {
  code: number
  msg: string
  data: KeywordItem | null
}

/**
 * 获取启用的关键词列表
 * @param limit 限制数量，默认50
 */
export const getEnabledKeywords = (limit: number = 50): Promise<KeywordItem[]> => {
  return request.get('douyin_keywords_enabled', { limit })
}

/**
 * 随机获取一个关键词（完全随机，不排除任何关键词）
 */
export const getRandomKeyword = (): Promise<KeywordItem | null> => {
  return request.get('douyin_keywords_random')
}

/**
 * 记录关键词显示次数（可选，用于统计分析）
 * @param id 关键词ID
 */
export const recordKeywordDisplay = (id: number): Promise<null> => {
  return request.post('douyin_keyword_display', { id })
}

/**
 * 记录关键词点击次数（用于统计分析）
 * @param id 关键词ID
 */
export const recordKeywordClick = async (id: number): Promise<any> => {
  console.log('📡 API: recordKeywordClick被调用，ID:', id)
  console.log('📡 API: 使用加密接口:', 'douyin_keyword_click')
  
  try {
    const result = await request.post('douyin_keyword_click', { id })
    console.log('📡 API: recordKeywordClick响应:', result)
    return result
  } catch (error) {
    console.error('📡 API: recordKeywordClick错误:', error)
    throw error
  }
}

/**
 * 获取关键词列表（带分页和筛选）
 * @param params 查询参数
 */
export const getKeywords = (params: {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
  category?: string
}): Promise<{
  list: KeywordItem[]
  total: number
  page: number
  pageSize: number
  pages: number
}> => {
  return request.get('douyin_keywords_list', params)
}
