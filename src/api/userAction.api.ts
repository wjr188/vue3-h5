import request from '@/utils/request'

// 点赞内容
export function likeContent(contentId: number, contentType: string): Promise<any> {
  return request.post('user_like', {
    content_id: contentId,
    type: contentType
  })
}

// 收藏内容
export function collectContent(contentId: number, contentType: string): Promise<any> {
  return request.post('user_collect', {
    content_id: contentId,
    type: contentType
  })
}

// 取消点赞
export function unlikeContent(contentId: number, contentType: string): Promise<any> {
  return request.post('user_unlike', {
    content_id: contentId,
    type: contentType
  })
}

// 取消收藏
export function uncollectContent(contentId: number, contentType: string): Promise<any> {
  return request.post('user_uncollect', {
    content_id: contentId,
    type: contentType
  })
}

// 获取用户操作状态
export function getActionStatus(contentId: number, contentType: string): Promise<any> {
  return request.get('user_action_status', {
    content_id: contentId,
    type: contentType
  })
}

// 批量获取操作状态
export function batchActionStatus(contentIds: number[], contentType: string): Promise<any> {
  return request.post('user_batch_action_status', {
    content_ids: contentIds,
    type: contentType
  })
}

// 获取用户收藏列表
export function getMyCollections(page = 1, limit = 20, type?: string): Promise<any> {
  const params: any = { page, limit }
  if (type) params.type = type
  
  return request.get('user_collections', params)
}