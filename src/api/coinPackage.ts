import request from "@/utils/request"; // 这里改成你刚才那个拦截器文件路径

// 列表 - 使用加密API
export function fetchCoinPackageList(params: { status?: number|string } = {}) {
  return request.get("coin_package_list", params);
}

// 新增 - 使用加密API
export function addCoinPackage(data: any) {
  return request.post("coin_package_add", data);
}

// 编辑 - 使用加密API
export function updateCoinPackage(data: any) {
  return request.post("coin_package_update", data);
}

// 删除 - 使用加密API
export function deleteCoinPackage(data: { id?: number; ids?: number[] }) {
  return request.post("coin_package_delete", data);
}

// 批量上下架 - 使用加密API
export function updateCoinPackageStatus(data: { ids: number[]; status: number }) {
  return request.post("coin_package_status", data);
}
