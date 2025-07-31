import request from "@/utils/request";

// 获取所有长视频标签
export function fetchLongVideoTags() {
  return request.get("/api/longtags/list");
}

// 新增标签
export function addLongVideoTag(data: { name: string }) {
  return request.post("/api/longtags/add", data);
}

// 更新标签
export function updateLongVideoTag(data: { id: number; name: string }) {
  return request.post("/api/longtags/update", data);
}

// 删除标签
export function deleteLongVideoTag(data: { id: number }) {
  return request.post("/api/longtags/delete", data);
}

// ...其它标签相关接口...