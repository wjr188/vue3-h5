import request from '@/utils/request'

/**
 * 分页获取VIP卡片列表
 * GET /api/admin/member-card/
 */
export function fetchVipCardList(params: { page?: number; pageSize?: number }) {
  return request.get<{
    list: {
      id: number;
      tag: string;
      name: string;
      oldPrice: number;
      price: number;
      duration: number;
      desc: string;
      status: string;
      createTime: string;
      updateTime: string;
      can_watch_coin: number;
    }[];
    total: number;
    page: number;
    pageSize: number;
  }>('/api/admin/member-card', { params })
}

/**
 * 新增VIP卡片
 * POST /api/admin/member-card/
 */
export function saveVipCard(data: {
  tag: string;
  name: string;
  oldPrice: number;
  price: number;
  duration: number;
  desc?: string;
  can_watch_coin?: number;
  can_view_vip_video?: number;
}) {
  return request.post('/api/admin/member-card', data)
}

/**
 * 更新VIP卡片
 * PUT /api/admin/member-card/:id
 */
export function updateVipCard(
  id: number,
  data: {
    tag: string;
    name: string;
    oldPrice: number;
    price: number;
    duration: number;
    desc?: string;
    can_watch_coin?: number;
    can_view_vip_video?: number;
  }
) {
  return request.put(`/api/admin/member-card/${id}`, data)
}

/**
 * 切换VIP卡片状态
 * PATCH /api/admin/member-card/:id/status
 */
export function toggleVipCardStatus(id: number, status: 'ENABLED' | 'DISABLED') {
  return request.patch(`/api/admin/member-card/${id}/status`, { status })
}

/**
 * 删除VIP卡片
 * DELETE /api/admin/member-card/:id
 */
export function deleteVipCard(id: number) {
  return request.delete(`/api/admin/member-card/${id}`)
}

/**
 * 一次性获取全部VIP卡片详细信息
 * （用于前台展示）
 * GET /api/admin/member-card?page=1&pageSize=100
 */
export function fetchAllVipCardsWithDetail() {
  return request.get<{
    list: {
      id: number;
      tag: string;
      name: string;
      oldPrice: number;
      price: number;
      duration: number;
      desc: string;
      status: string;
      createTime: string;
      updateTime: string;
      can_watch_coin: number;
    }[];
    total: number;
    page: number;
    pageSize: number;
  }>('/api/admin/member-card', {
    params: { page: 1, pageSize: 100 }
  })
}

/**
 * 获取全部VIP卡片（下拉用，简化数据）
 * GET /api/admin/member-card/all
 */
export function fetchAllVipCardsSimple() {
  return request.get<
    {
      id: number;
      name: string;
      desc: string;
      duration: number;
      durationUnit: string;
      can_watch_coin: number;
    }[]
  >('/api/admin/member-card/all')
}
