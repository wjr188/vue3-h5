import service from '@/utils/request' // 使用加密请求服务

// 抖音关键词类型定义
export interface DouyinKeyword {
  id: number
  keyword: string
  display_label?: string
  heat: number
  sort: number
  status: number
  category?: string
  description?: string
  display_count?: number
  click_count?: number
  create_time?: string
  update_time?: string
}

/**
 * 获取启用的抖音关键词列表（用于前端标签显示）
 */
export function fetchEnabledDouyinKeywords(params: {
  limit?: number
} = {}) {
  return service.get('douyin_keywords_enabled', {
    limit: params.limit || 10
  })
}

/**
 * 随机获取一个抖音关键词
 */
export function fetchRandomDouyinKeyword(params: {
  excludeIds?: number[]
} = {}) {
  return service.get('douyin_keywords_random', {
    excludeIds: params.excludeIds?.join(',') || ''
  })
}

/**
 * 记录关键词点击统计
 */
export function recordDouyinKeywordClick(keywordId: number) {
  return service.post('douyin_keyword_click', { id: keywordId })
}

/**
 * 记录关键词显示统计
 */
export function recordDouyinKeywordDisplay(keywordId: number) {
  return service.post('douyin_keyword_display', { id: keywordId })
}
