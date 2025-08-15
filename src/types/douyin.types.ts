// 抖音相关类型定义

export interface DouyinTagItem {
  id?: number
  name: string
  sort?: number
  hot?: boolean
  count?: number // 该标签下的视频数量
  createTime?: string
  updateTime?: string
}

export interface DouyinTagsResponse {
  code: number
  msg: string
  data: {
    list: DouyinTagItem[]
    total?: number
  }
}

export interface DouyinVideoItem {
  id: string | number
  cover: string
  views: number
  duration: string | number
  title: string
  tag?: string
  tags?: string[]
  tagColor?: string
  vip?: boolean
  coin?: number
  createTime?: string
}
