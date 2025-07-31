import request from "@/utils/request";

export interface H5LongVideoGroup {
  id: number;
  name: string;
  sort: number;
  videos: {
    id: number;
    cover: string;
    title: string;
    collect_count: number;
    coin: number;
    is_vip: number;
  }[];
}

export interface H5LongVideoDetail {
  id: number;
  cover: string;
  title: string;
  collect_count: number;
  play_count: number;   // 新增
  coin: number;
  is_vip: number;
  desc: string;
  create_time: string;
  tags: string[];       // 新增
  duration: number;     // 新增
  vip: number;          // 兼容
}

// 首页推荐分组及分组下视频（只基础信息）
export async function fetchH5LongHome(params: { page?: number; pageSize?: number } = {}): Promise<any> {
  try {
    // 拼接 GET 参数
    const res = await request.get("/api/h5/long/home", { params });
    return res;
  } catch (err: any) {
    return [];
  }
}

// 视频详情
export function fetchH5LongVideoDetail(id: number | string): Promise<{ code: number; msg: string; data: H5LongVideoDetail }> {
  return request.get(`/api/h5/long/videos/${id}`);
}

// 推荐分组下所有视频（分页，前台专用接口）
export async function fetchRecommendGroupVideos(
  groupId: number,
  options: { page?: number; pageSize?: number; sort?: string; random?: number } = {}
): Promise<{ code: number; msg: string; data: { list: H5LongVideoDetail[]; total: number } }> {
  return request.get(`/api/h5/long/group/${groupId}/videos`, {
    params: options
  });
}