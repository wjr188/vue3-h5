// src/api/searchHotKeyword.api.ts
import request from "@/utils/request";

export function fetchHotKeywords(type = "all", limit = 10) {
  return request.get("search_hot_keywords", {
    type, 
    limit
  });
}
