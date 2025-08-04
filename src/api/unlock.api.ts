import request from '@/utils/request'
export interface UnlockedChaptersResult {
  unlocked: number[]
  can_view_vip_video: number
  can_watch_coin: number
}

/**
 * 解锁长视频
 */
export function unlockLongVideo(data: { video_id: number }) {
  return request.post('/api/h5/unlock/long_video', data)
}

/**
 * 解锁漫画章节
 */
export function unlockComicChapter(data: { chapter_id: number }) {
  return request.post('/api/h5/unlock/comic_chapter', data)
}
/**
 * 查询用户已解锁的漫画章节ID（含VIP/金币全免权限）
 * @param params { comic_id: number }
 * @returns Promise<{ unlocked, can_view_vip_video, can_watch_coin }>
 */
export function getUnlockedComicChapters(
  params: { comic_id: number }
): Promise<UnlockedChaptersResult> {
  return request.get('/api/h5/unlock/unlocked_chapters', { params })
}

/**
 * 解锁小说章节
 * @param data { chapter_id: number }
 */
export function unlockNovelChapter(data: { chapter_id: number }) {
  return request.post('/api/h5/unlock/novel_chapter', data)
}
/**
 * 查询用户已解锁的小说章节ID（含VIP/金币全免权限）
 * @param params { novel_id: number }
 * @returns Promise<{ unlocked, can_view_vip_video, can_watch_coin }>
 */
export function getUnlockedNovelChapters(
  params: { novel_id: number }
): Promise<UnlockedChaptersResult> {
  return request.get('/api/h5/unlock/unlocked_novel_chapters', { params })
}

/**
 * 解锁有声小说章节
 * @param data { chapter_id: number }
 */
export function unlockAudioNovelChapter(data: { chapter_id: number }) {
  return request.post('/api/h5/unlock/audio_novel_chapter', data)
}
/**
 * 查询用户已解锁的有声小说章节ID（含VIP/金币全免权限）
 * @param params { audio_novel_id: number }
 * @returns Promise<{ unlocked, can_view_vip_video, can_watch_coin }>
 */
export function getUnlockedAudioNovelChapters(
  params: { audio_novel_id: number }
): Promise<UnlockedChaptersResult> {
  return request.get('/api/h5/unlock/unlocked_audio_novel_chapters', { params })
}

/**
 * 整部解锁漫画
 * @param data { comic_id: number }
 */
export function unlockComicWhole(data: { comic_id: number }) {
  return request.post('/api/h5/unlock/comic_whole', data)
}

/**
 * 整本解锁小说
 * @param data { novel_id: number }
 */
export function unlockNovelWhole(data: { novel_id: number }) {
  return request.post('/api/h5/unlock/novel_whole', data)
}
