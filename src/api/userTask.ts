import request from "@/utils/request";

export interface TaskStatusResponse {
  status: {
    login: "done" | "pending";
    bind_mobile: "done" | "pending";
    bind_email: "done" | "pending";
    invite: "done" | "pending";
    vip: "done" | "pending";
    buy_coin: "done" | "pending";
  };
  points: {
    login: number;
    invite: number;
    vip: number;
    buy_coin: number;
    bind_mobile: number;
    bind_email: number;
  };
  my_points: number;
}

// --- 积分任务相关 ---

/** 查询积分任务状态 */
export function getTaskStatus() {
  return request.get<TaskStatusResponse>("user_task_status");
}

/** 领取积分任务奖励 */
export function claimTask(type: string) {
  return request.post<null>("user_claim_task", { type });
}

// --- 积分兑换相关 ---

export interface PointsExchangeItem {
  id: number;
  name: string;
  cost: number;
  type: string; // 'vip' | 'coin'
  value: string | number;
  description?: string;
  sort?: number;
}

export function fetchPointsExchangeList() {
  return request.get<PointsExchangeItem[]>('points_exchange_list');
}

export function exchangeItem(id: number) {
  return request.post('points_exchange', { id });
}


// === 积分兑换记录 ===

export interface PointsExchangeRecord {
  id: number;
  uuid: string;
  exchange_id: number;
  exchange_name: string;
  cost: number;
  status: number;
  remark: string;
  create_time: string;
  // 你表里有的字段都可以补充
}

/**
 * 获取我的兑换记录
 * @param params 可选，分页和筛选
 * @returns { list: PointsExchangeRecord[], total: number }
 */
export function fetchPointsExchangeRecords(params = {}): Promise<{ list: PointsExchangeRecord[]; total: number }> {
  return request.get('points_exchange_records', params);
}

