// src/api/longVideo.ts
import request from "@/utils/request";

// 获取H5专用长视频列表
export function fetchLongVideoList(params: any) {
  return request.get("/api/long/videos/h5-list", { params });
}

// 获取长视频详情（H5专用，不返回视频地址）
export function fetchLongVideoDetail(id: number | string) {
  return request.get(`/api/h5/long_videos/${id}`);
}

// 播放视频
export function playLongVideo(data: any) {
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
export function fetchH5GuessYouLike(params: { video_id: number | string; limit?: number }) {
  return request.get('/api/h5/long_videos/guess_you_like', { params });
}

// 行为埋点接口
export function trackLongVideoAction(data: { video_id: number; action: string }) {
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
