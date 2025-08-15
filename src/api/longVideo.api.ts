// src/api/longVideo.ts
import request from "@/utils/request";

// 获取H5专用长视频列表 - 使用加密API
export function fetchLongVideoList(params: any) {
  return request.get("long_video_h5_list", params);
}

// 获取长视频详情（H5专用，不返回视频地址）- 使用加密API
export function fetchLongVideoDetail(id: number | string, type: string = 'long', userId?: string) {
  
  const params: any = { id, type };
  if (userId) params.userId = userId;
  return request.get("long_video_h5_detail", params);
}

// 播放视频 - 使用加密API
export function playLongVideo(data: any & { type?: string; id?: number|string }) {
  // data 里必须有 type 和 id
  return request.post("long_video_play", data);
}

// 获取某个子分类下的全部视频（分页）- 使用加密API
export function fetchLongVideoByCategory(categoryId: number | string, params: any = {}) {
  return request.get("long_video_category_videos", { category_id: categoryId, ...params });
}

// 获取全部视频（H5专用分页，不带视频地址）- 使用加密API
export function fetchH5AllLongVideos(params: any = {}) {
  return request.get('long_video_all', params);
}

// H5专用：猜你喜欢推荐 - 使用加密API
export function fetchH5GuessYouLike(params: { id: number | string; type?: string; limit?: number }) {
  // params 里必须有 type 和 id
  return request.get('long_video_guess_you_like', params);
}

// 行为埋点接口 - 支持同时记录统计和浏览记录 - 使用加密API
export function trackLongVideoAction(data: { 
  id: number; 
  type: string; 
  action: string; 
  user_uuid?: string; // 新增：用于浏览记录，当action='view'时推荐传入
}) {
  // data 里必须有 type 和 id
  return request.post('long_video_track', data);
}

// 榜单接口 - 使用加密API
export function fetchLongVideoRank(params: { action: string; range: string }) {
  return request.get('long_video_rank', params);
}

// H5专用：限免专区视频列表（只返回非VIP且金币为0的视频）- 使用加密API
export function fetchH5LimitedFreeVideos(params: any = {}) {
  return request.get('long_video_limited_free', params);
}
