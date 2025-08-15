// 与后端 /api/site-config/group-links 对接
import service from '@/utils/request'

export interface GroupAction { type?: string; value?: string }
export interface GroupItem   { icon: string; title: string; subtitle?: string; btnText?: string; action?: GroupAction }
export interface GroupSection{ title: string; subtitle?: string; items: GroupItem[] }
export interface GroupLinksData { enabled: 0|1; version: string; sections: GroupSection[] }

/** 获取加群/合作配置；force=true 携带时间戳避免缓存 */
export function apiGetGroupLinks(force = false) {
  return service.get<GroupLinksData>(
    '/api/site-config/group-links',
    { params: force ? { v: Date.now() } : {} }
  )
}
