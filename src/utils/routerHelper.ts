// 路由跳转辅助工具
import { Router } from 'vue-router'

export interface PlayPageParams {
  id: number | string
  type?: string
  from?: string
  title?: string
}

/**
 * 跳转到播放页面的统一方法
 * @param router Vue Router 实例
 * @param params 跳转参数
 */
export function goToPlayPage(router: Router, params: PlayPageParams) {
  const { id, type, from, title } = params
  
  router.push({
    path: `/play/${id}`,
    query: {
      ...(type && { type }),
      ...(from && { from }),
      ...(title && { title }),
    }
  })
}

/**
 * 各个页面的跳转示例
 * 注意：PlayPage只处理长视频、暗网、动漫三种类型
 */

// 从长视频页面跳转
export function goToPlayFromLongVideo(router: Router, videoId: number) {
  goToPlayPage(router, {
    id: videoId,
    type: 'long_video',
    from: 'longVideo'
  })
}

// 从 Darknet 页面跳转 - 使用独立的 darknet 类型
export function goToPlayFromDarknet(router: Router, videoId: number) {
  goToPlayPage(router, {
    id: videoId,
    type: 'darknet', // 后端现在支持 darknet 类型
    from: 'darknet'
  })
}

// 从动漫页面跳转 - 映射为 long_video
export function goToPlayFromAnime(router: Router, videoId: number) {
  goToPlayPage(router, {
    id: videoId,
    type: 'long_video', // 后端映射为 long_video
    from: 'anime'
  })
}
