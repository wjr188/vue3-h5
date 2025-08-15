import request from '@/utils/request'

// 定义接口返回的类型
export interface UnlockedChaptersResult {
  unlocked: number[]
  can_view_vip_video: number
  can_watch_coin: number
}

/**
 * 解锁长视频
 * @param data 请求参数，包含 video_id
 * @returns Promise 解析为服务器返回的数据格式
 */
export function unlockLongVideo(data: { video_id: number }): Promise<any> {
  return request.post('unlock_long_video', data)
}

/**
 * 解锁漫画章节
 * @param data 请求参数，包含 chapter_id
 */
export function unlockComicChapter(data: { chapter_id: number }): Promise<any> {
  return request.post('unlock_comic_chapter', data)
}

/**
 * 查询用户已解锁的漫画章节ID（含VIP/金币全免权限）
 * @param params 查询参数，包含 comic_id
 */
export function getUnlockedComicChapters(params: { comic_id: number }): Promise<UnlockedChaptersResult> {
  return request.get('unlocked_chapters', params)
}

/**
 * 解锁小说章节
 * @param data 请求参数，包含 chapter_id
 */
export function unlockNovelChapter(data: { chapter_id: number }): Promise<any> {
  return request.post('unlock_novel_chapter', data)
}

/**
 * 查询用户已解锁的小说章节ID（含VIP/金币全免权限）
 * @param params 查询参数，包含 novel_id
 */
export function getUnlockedNovelChapters(params: { novel_id: number }): Promise<UnlockedChaptersResult> {
  return request.get('unlocked_novel_chapters', params)
}

/**
 * 解锁有声小说章节
 * @param data 请求参数，包含 chapter_id
 */
export function unlockAudioNovelChapter(data: { chapter_id: number }): Promise<any> {
  return request.post('unlock_audio_novel_chapter', data)
}

/**
 * 查询用户已解锁的有声小说章节ID（含VIP/金币全免权限）
 * @param params 查询参数，包含 audio_novel_id
 */
export function getUnlockedAudioNovelChapters(params: { audio_novel_id: number }): Promise<UnlockedChaptersResult> {
  return request.get('unlocked_audio_novel_chapters', params)
}

/**
 * 整部解锁漫画
 * @param data 请求参数，包含 comic_id
 */
export function unlockComicWhole(data: { comic_id: number }): Promise<any> {
  return request.post('unlock_comic_whole', data)
}

/**
 * 整本解锁小说
 * @param data 请求参数，包含 novel_id
 */
export function unlockNovelWhole(data: { novel_id: number }): Promise<any> {
  return request.post('unlock_novel_whole', data)
}

/**
 * 解锁短视频
 * @param data 请求参数，包含 video_id
 */
export function unlockDouyinVideo(data: { video_id: number }): Promise<any> {
  return request.post('unlock_douyin_video', data)
}

/**
 * 解锁暗网视频
 * @param data 请求参数，包含 video_id
 */
export function unlockDarknetVideo(data: { video_id: number }): Promise<any> {
  return request.post('unlock_darknet_video', data)
}

/**
 * 解锁动漫视频
 * @param data 请求参数，包含 video_id
 */
export function unlockAnimeVideo(data: { video_id: number }): Promise<any> {
  return request.post('unlock_anime_video', data)
}

/**
 * 解锁 Star/OnlyFans 视频
 * @param data 请求参数，包含 video_id
 */
export function unlockStarVideo(data: { video_id: number }): Promise<any> {
  return request.post('unlock_star_video', data)
}
