import request from "@/utils/request";

// 获取所有长视频标签 - 使用加密API
export function fetchLongVideoTags() {
  return request.get("long_video_tag_list");
}