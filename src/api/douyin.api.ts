import request from '@/utils/request'

// API响应类型定义
export interface PlayResponse {
  id: number
  canPlay: number | boolean
  playUrl: string
  isVip: boolean
  isCoin: boolean
  msg: string
  unlocked?: boolean
  remaining?: number
  playCount?: number
  collectCount?: number
}

// 获取抖音视频列表 - 使用加密API
export function fetchDouyinVideos(params: {
  pageSize?: number
  last_id?: number
  category_id?: number
  userId?: string
  tag?: string
  category_name?: string
} = {}) {
  return request.get('douyin_video_h5_list', params)
}

// 获取抖音视频播放地址 - 使用加密API
export function fetchDouyinPlay(params: {
  id: number
  userId: string
}): Promise<PlayResponse> {
  return request.post('douyin_video_play', params)
}

// 获取抖音标签列表（发现页用） - 使用加密API
export function fetchDouyinTags() {
  return request.get('douyin_tag_all')
}

// 发现页专用：分页拉取视频列表 - 使用加密API
export function fetchDouyinDiscoverVideos(params: {
  page?: number
  pageSize?: number
  tag?: string
} = {}) {
  return request.get('douyin_video_discover', params)
}

// 获取单个抖音视频详情（播放页用） - 使用加密API
export function fetchDouyinVideoDetail(params: { id: number | string, userId?: string }): Promise<any> {
  return request.get('douyin_video_h5_detail', params)
}

// H5搜索视频接口 - 使用加密API
export function searchDouyinVideos(params: {
  keyword: string
  page?: number
  limit?: number
} = { keyword: '' }) {
  return request.get('douyin_video_search', params)
}

