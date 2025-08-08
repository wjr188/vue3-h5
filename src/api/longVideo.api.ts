// src/api/longVideo.ts
import request from "@/utils/request";

// 获取H5专用长视频列表
export function fetchLongVideoList(params: any) {
  return request.get("/api/long/videos/h5-list", { params });
}

// 获取长视频详情（H5专用，不返回视频地址）
export function fetchLongVideoDetail(id: number | string, type: string = 'long', userId?: string) {
  
  const params: any = { id, type };
  if (userId) params.userId = userId;
  return request.get(`/api/h5/video/detail`, { params });
}

// 播放视频
export function playLongVideo(data: any & { type?: string; id?: number|string }) {
  // data 里必须有 type 和 id
  return request.post("/api/long/videos/play", data);
}

// 获取某个子分类下的全部视频（分页）
export function fetchLongVideoByCategory(categoryId: number | string, params: any = {}) {
  return request.get(`/api/h5/long_video/category/${categoryId}`, { params });
}

// 获取全部视频（H5专用分页，不带视频地址）
export function fetchH5AllLongVideos(params: any = {}) {
  return request.get('/api/h5/long_videos/all', { params });
}

// H5专用：猜你喜欢推荐
export function fetchH5GuessYouLike(params: { id: number | string; type?: string; limit?: number }) {
  // params 里必须有 type 和 id
  return request.get('/api/h5/long_videos/guess_you_like', { params });
}

// 行为埋点接口
export function trackLongVideoAction(data: { id: number; type: string; action: string }) {
  // data 里必须有 type 和 id
  return request.post('/api/h5/video/track', data);
}

// 榜单接口
export function fetchLongVideoRank(params: { action: string; range: string }) {
  return request.get('/api/h5/video/rank', { params });
}

// H5专用：限免专区视频列表（只返回非VIP且金币为0的视频）
export function fetchH5LimitedFreeVideos(params: any = {}) {
  return request.get('/api/h5/long_videos/limited_free', { params });
}
