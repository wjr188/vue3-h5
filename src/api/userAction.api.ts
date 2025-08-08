import simpleService from '@/utils/request'

// 点赞内容
export function likeContent(contentId: number, contentType: string): Promise<any> {
  return simpleService.post('/api/h5/user/like', {
    content_id: contentId,
    type: contentType
  })
}

// 收藏内容
export function collectContent(contentId: number, contentType: string): Promise<any> {
  return simpleService.post('/api/h5/user/collect', {
    content_id: contentId,
    type: contentType
  })
}

// 取消点赞
export function unlikeContent(contentId: number, contentType: string): Promise<any> {
  return simpleService.post('/api/h5/user/unlike', {
    content_id: contentId,
    type: contentType
  })
}

// 取消收藏
export function uncollectContent(contentId: number, contentType: string): Promise<any> {
  return simpleService.post('/api/h5/user/uncollect', {
    content_id: contentId,
    type: contentType
  })
}

// 获取用户操作状态
export function getActionStatus(contentId: number, contentType: string): Promise<any> {
  return simpleService.get('/api/h5/user/action_status', {
    params: {
      content_id: contentId,
      type: contentType
    }
  })
}

// 批量获取操作状态
export function batchActionStatus(contentIds: number[], contentType: string): Promise<any> {
  return simpleService.post('/api/h5/user/batch_action_status', {
    content_ids: contentIds,
    type: contentType
  })
}