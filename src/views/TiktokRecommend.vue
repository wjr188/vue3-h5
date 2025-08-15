<template>
  <div class="tiktok-wrapper">
    <div class="swiper-area">
      <swiper
        direction="vertical"
        :slides-per-view="1"
        :space-between="0"
        :resistance-ratio="0.35"
        :threshold="20"
        :observer="true"
        :observe-parents="true"
        class="tiktok-container"
        @slideChange="onSlideChange"
        @swiper="onSwiperReady"
      >
        <swiper-slide v-for="(video, index) in douyinStore.videos" :key="video.id">
          <div class="video-page">
            <!-- 当前页：有 src 显示视频，否则显示封面 -->
            <NativePlayer
              v-if="index === currentIndex && video.src"
              :ref="el => setPlayerRef(index, el)"
              :key="video.id"
              :src="video.src"
              :cover="video.cover"
              :shouldPlay="shouldPlay"
              @requestPlay="onRequestPlay"
              @timeUpdate="onTimeUpdate"
              @played="onPlayed"
            />
            <img
              v-else
              :src="video.cover"
              class="preview-cover"
              alt="封面"
            />
            <div
              v-if="index === currentIndex && !shouldPlay"
              class="play-btn"
              @click="handleUnlock(video)"
            >
              <img src="/icons/play1.svg" />
            </div>
          </div>
          <!-- Overlay -->
          <div class="video-overlay">
            <div class="author">
              <span class="name">@{{ video.author }}</span>
              <span class="verified-badge">V</span>
            </div>
            <div class="title">{{ video.title }}</div>
            <div class="tags">
              <span class="tag" v-for="tag in video.tags" :key="tag">#{{ tag }}</span>
            </div>
            
            <!-- VIP提示 -->
            <div
              v-if="!video.unlocked && (video.vip || video.isVip)"
              class="vip-badge"
              @click="handleUnlock(video)"
            >
              开通VIP观看完整视频
            </div>
            
            <!-- 金币提示 -->
            <div
              v-else-if="!video.unlocked && Number(video.coin) > 0"
              class="coin-badge"
              @click="handleUnlock(video)"
            >
              支付{{ video.coin }}金币观看完整视频
            </div>
            
            <!-- 已解锁提示 -->
            <div
              v-else-if="video.unlocked"
              class="unlocked-badge"
              @click="handleUnlock(video)"
            >
              已解锁视频
            </div>
            
            <!-- 限时免费提示 -->
            <div
              v-else
              class="free-badge"
              @click="handleUnlock(video)"
            >
              限时免费
            </div>
          </div>
          
          <!-- 热门标签（放在最下面，在底部导航栏上方） -->
          <div class="hot-tags-bottom" v-if="currentKeyword">
            <div class="hot-tags-container">
              <div class="hot-tags-wrapper">
                <img src="/icons/remen6.png" class="hot-tags-icon" alt="热门" />
                <div class="hot-tags-scroll">
                  <div class="hot-tags-text" @click="handleKeywordClick">
                    {{ currentKeyword.display_label }}
                  </div>
                </div>
                <div class="hot-tags-arrow" @click="handleKeywordClick">
                  <span>›</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="video-actions">
            <img class="avatar" v-lazy="video.avatar" />
            <div class="action-item" @click="handleLike(video)">
              <img :src="video.liked ? '/icons/like7.svg' : '/icons/like.svg'" class="action-icon" />
              <div class="count">{{ formatCount(video.like_count || video.likes || 0) }}</div>
            </div>
            <div class="action-item" @click="handleCollect(video)">
              <img :src="video.collected ? '/icons/star7.svg' : '/icons/fav1.svg'" class="action-icon" />
              <div class="count">{{ formatCount(video.collect_count || video.favorites || 0) }}</div>
            </div>
            <div class="action-item" @click="goToShare">
              <img src="/icons/share1.svg" class="action-icon" />
              <div class="count">分享</div>
            </div>
          </div>
        </swiper-slide>
      </swiper>
      
      <!-- 懒加载提示 -->
      <div v-if="isLoading" class="loading-indicator">
        <div class="loading-spinner-custom"></div>
        <div class="loading-text">客官别走，妾身马上就好~</div>
      </div>
    </div>
    <!-- 进度条绝对定位 -->
    <VideoProgress
      v-if="douyinStore.videos[currentIndex] && shouldPlay"
      :currentTime="Number(currentTime)"
      :duration="Number(duration)"
      @seek="onSeek"
      @seeking="onSeeking"
      class="video-progress-fixed"
    />
    <!-- Toast -->
<div v-if="toastVisible || toastText"
     class="toast-tip"
     :class="{ show: toastVisible }">
  {{ toastText }}
</div>
    <!-- VIP弹窗 -->
    <div v-if="showVipModal" class="vip-modal-mask" @click.self="showVipModal = false">
      <div class="vip-modal">
        <div class="vip-title">温馨提示</div>
        <div class="vip-desc">
          今日可免费观看次数已用完，开通VIP可畅享免费解锁<br />
          邀请好友注册立刻送3天VIP
        </div>
        <div class="vip-actions">
          <button class="btn orange" @click="goInvite">分享得VIP</button>
          <button class="btn red" @click="goVip">立即开通VIP</button>
        </div>
      </div>
    </div>

    

    <!-- 单部金币视频购买弹窗 -->
<div
  v-if="showCoinModal && currentVideo && !currentVideo.unlocked"
  class="coin-sheet-mask"
  @click.self="showCoinModal = false"
>
  <div class="coin-sheet-simple">
    <div class="coin-sheet-title">购买单部金币视频</div>
    <div class="coin-sheet-row">
      <span>金币余额：{{ userStore.userInfo.goldCoins || '0.00' }}</span>
      <button class="coin-sheet-btn" @click="goRecharge">立即充值</button>
    </div>
    <div class="coin-sheet-row">
      <span>支付金额</span>
      <span class="coin-sheet-amount">{{ currentVideo?.coin || 0 }}金币</span>
    </div>
    <div class="coin-sheet-row coin-sheet-discount">
      <span>您当前不享受折扣优惠</span>
      <span class="coin-sheet-vip" @click="goVip">购买VIP享受折扣</span>
    </div>
    <div class="coin-sheet-row">
      <span>实际支付</span>
      <span class="coin-sheet-amount">{{ currentVideo?.coin || 0 }}金币</span>
    </div>
    <button class="coin-sheet-buy-btn" @click="buySingleCoin(currentVideo)">立即购买</button>
  </div>
</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Swiper, SwiperSlide } from 'swiper/vue'
import type { Swiper as SwiperType } from 'swiper'
import 'swiper/css'
import NativePlayer from '../components/NativePlayer.vue'
import VideoProgress from '../components/VideoProgress.vue'
import CardCornerIcon from '../components/CardCornerIcon.vue'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useDouyinVideosStore, type DouyinVideo } from '@/store/douyin.store'
import { useUserStore } from '@/store/user'
import { likeContent, collectContent, unlikeContent, uncollectContent } from '@/api/userAction.api'
import { getRandomKeyword, recordKeywordDisplay, recordKeywordClick, type KeywordItem } from '@/api/keyword.api'
import { trackLongVideoAction } from '@/api/longVideo.api'

interface VideoItem {
  id: number
  src: string
  cover: string
  author: string
  title: string
  tags: string[]
  duration: string
  avatar: string
  likes: string | number
  favorites: string | number
  coin: number
  vip: boolean
  isVip?: boolean
  unlocked?: boolean
}

const douyinStore = useDouyinVideosStore()
const userStore = useUserStore()

const currentIndex = ref(0)
const shouldPlay = ref(false)
const playerRefs = ref<Record<number, InstanceType<typeof NativePlayer> | null>>({})
const router = useRouter()

const currentTime = ref(0)
const duration = ref(0)
const historyStore = useHistoryStore()

let swiperInstance: SwiperType | null = null
let page = 1

const toastText = ref('')
const toastVisible = ref(false)
const showVipModal = ref(false)
const showCoinModal = ref(false)
const isLoading = ref(false)

// 关键词相关状态
const currentKeyword = ref<KeywordItem | null>(null)

let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string, duration = 1500) {
  toastText.value = msg
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastVisible.value = false
    setTimeout(() => {
      toastText.value = ''
    }, 300)
  }, duration)
}
// 加载视频（替换原 loadMoreVideos）
const loadMoreVideos = async () => {
  if (isLoading.value || !douyinStore.hasMore) return
  isLoading.value = true
  await douyinStore.loadVideos({ 
    pageSize: 10, 
    last_id: douyinStore.lastId,
    userId: userStore.uuid  // 添加用户ID，让后端知道要检查该用户的解锁状态
  })
  isLoading.value = false
}

const onSlideChange = (swiper: SwiperType) => {
  const oldIndex = currentIndex.value
  currentIndex.value = swiper.activeIndex
  shouldPlay.value = false
  showVipModal.value = false
  showCoinModal.value = false
  // 重置进度条
  currentTime.value = 0
  duration.value = 0
  // 不要 video.value = null，避免弹窗数据丢失

  // ★★★ 记录上一个视频的浏览埋点（用户已经看过的视频） ★★★
  if (oldIndex >= 0 && oldIndex < douyinStore.videos.length) {
    const previousVideo = douyinStore.videos[oldIndex]
    if (previousVideo) {
      recordVideoView(previousVideo)
    }
  }

  // 每次切换视频时获取新的关键词
  loadRandomKeyword()

  // 修改触发条件：滑到最后一个视频时才触发懒加载
  if (
    currentIndex.value >= douyinStore.videos.length - 1 &&
    !isLoading.value &&
    douyinStore.hasMore
  ) {
    loadMoreVideos()
  }
}

const onSwiperReady = (swiper: SwiperType) => {
  swiperInstance = swiper
}

const currentVideo = ref<DouyinVideo | null>(null)

const onRequestPlay = async () => {
  const videoData = douyinStore.videos[currentIndex.value]
  if (!videoData) return

  // 重置进度条（准备播放新视频）
  currentTime.value = 0
  duration.value = 0

  // ★★★ 只要是免费视频，直接请求播放接口，别做任何拦截 ★★★
  if ((!videoData.vip && !videoData.isVip) && (!videoData.coin || Number(videoData.coin) === 0)) {
    try {
      const res = await douyinStore.fetchPlayInfo(videoData.id, userStore.uuid)
      if (res.canPlay && res.playUrl) {
        videoData.src = res.playUrl
        shouldPlay.value = true
      }
    } catch (e) {
      showToast('播放失败，请重试')
    }
    return
  }

  const userId = userStore.uuid
  if (!userId) {
    showToast('请先登录')
    return
  }

  // ★★★ 关键修复：有试看次数的用户，不管什么类型的视频都应该能试看 ★★★
  const remaining = userStore.userInfo.dyVideoMax - userStore.userInfo.dyVideoUsed
  if (remaining > 0) {
    try {
      const res = await douyinStore.fetchPlayInfo(videoData.id, userStore.uuid)
      if (res?.canPlay && res?.playUrl) {
        videoData.src = res.playUrl
        shouldPlay.value = true
      } else {
        // 🔧 播放失败时刷新用户信息，可能是试看次数已用完
        await userStore.fetchUserInfo(true)
        const newRemaining = userStore.userInfo.dyVideoMax - userStore.userInfo.dyVideoUsed
        
        if (newRemaining <= 0) {
          // 试看次数已用完，显示对应弹窗
          const isVipVideo = !!videoData.vip || !!videoData.isVip
          const isCoinVideo = Number(videoData.coin) > 0
          if (isCoinVideo) {
            showCoinModal.value = true
          } else if (isVipVideo) {
            showVipModal.value = true
          } else {
            showToast('今日免费观看次数已用完')
          }
        } else {
          showToast('获取播放地址失败')
        }
      }
    } catch (e) {
      // 🔧 播放异常时也刷新用户信息
      await userStore.fetchUserInfo(true)
      const newRemaining = userStore.userInfo.dyVideoMax - userStore.userInfo.dyVideoUsed
      
      if (newRemaining <= 0) {
        // 试看次数已用完，显示对应弹窗
        const isVipVideo = !!videoData.vip || !!videoData.isVip
        const isCoinVideo = Number(videoData.coin) > 0
        if (isCoinVideo) {
          showCoinModal.value = true
        } else if (isVipVideo) {
          showVipModal.value = true
        } else {
          showToast('今日免费观看次数已用完')
        }
      } else {
        showToast('播放失败，请重试')
      }
    }
    return
  }

  const isVipVideo = !!videoData.vip || !!videoData.isVip
  const isCoinVideo = Number(videoData.coin) > 0
  const isCoinCardUser = userStore.userInfo.can_watch_coin === 1
  const isVipCardUser = userStore.userInfo.can_view_vip_video === 1

  // 没有试看次数的情况下才检查权限

  // 其它情况（已解锁、金币视频等）按原逻辑处理
  if (videoData.unlocked) {
    try {
      const res = await douyinStore.fetchPlayInfo(videoData.id, userId)
      if (res.canPlay && res.playUrl) {
        videoData.src = res.playUrl
        shouldPlay.value = true
      }
    } catch (e) {
      showToast('播放失败，请重试')
    }
    return
  }

  // 金币卡用户可以看金币视频
  if (isCoinVideo && isCoinCardUser) {
    try {
      const res = await douyinStore.fetchPlayInfo(videoData.id, userId)
      if (res.canPlay && res.playUrl) {
        videoData.src = res.playUrl
        shouldPlay.value = true
      }
    } catch (e) {
      showCoinModal.value = true
    }
    return
  }

  // VIP卡用户可以看VIP视频
  if (isVipVideo && isVipCardUser) {
    try {
      const res = await douyinStore.fetchPlayInfo(videoData.id, userId)
      if (res.canPlay && res.playUrl) {
        videoData.src = res.playUrl
        shouldPlay.value = true
      }
    } catch (e) {
      showVipModal.value = true
    }
    return
  }

  // 没有权限的情况，显示相应弹窗
  if (isCoinVideo) {
    showCoinModal.value = true
  } else if (isVipVideo) {
    showVipModal.value = true
  } else {
    // 其他情况直接播放
    try {
      const res = await douyinStore.fetchPlayInfo(videoData.id, userId)
      if (res.canPlay && res.playUrl) {
        videoData.src = res.playUrl
        shouldPlay.value = true
      }
    } catch (e) {
      showToast('播放失败，请重试')
    }
  }
}

const onTimeUpdate = (payload: { currentTime: number; duration: number }) => {
  currentTime.value = payload.currentTime
  duration.value = payload.duration
}

const onSeeking = (time: number) => {
  currentTime.value = time
}

const onPlayed = () => {
  const item = douyinStore.videos[currentIndex.value]
  if (!item) return
  historyStore.addRecord({
    id: item.src,
    type: 'douyin',
    time: new Date().toISOString(),
    data: item
  })
  
  // ★★★ 记录视频播放的浏览埋点 ★★★
  recordVideoView(item)
}

const onSeek = (time: number) => {
  const player = playerRefs.value[currentIndex.value]
  if (player?.seekTo) {
    player.seekTo(time)
    shouldPlay.value = true
  }
}

const setPlayerRef = (
  index: number,
  el: any
) => {
  playerRefs.value[index] = el
}

const goToShare = () => {
  router.push('/promotion-share')
}

// 加载随机关键词
const loadRandomKeyword = async () => {
  try {
    const data = await getRandomKeyword() // 完全随机获取关键词
    if (data) {
      currentKeyword.value = data
    } else {
      // 如果没有获取到关键词，清空显示
      currentKeyword.value = null
    }
  } catch (error) {
    currentKeyword.value = null
  }
}

// 处理关键词点击事件
const handleKeywordClick = async () => {
  if (!currentKeyword.value) return
  
  try {
    // 记录点击次数（保留点击统计，用于后台分析）
    await recordKeywordClick(currentKeyword.value.id)
  } catch (e) {
    // 静默处理错误，不影响用户体验
  }
  
  // 跳转到搜索页，使用keyword字段进行搜索
  router.push({
    path: '/search',
    query: {
      keyword: currentKeyword.value.keyword
    }
  })
}

// 热门标签滚动功能（保留原有功能作为备用）
const scrollHotTags = () => {
  handleKeywordClick()
}

// 点赞功能
async function handleLike(video: DouyinVideo) {
  if (!userStore.uuid) {
    showToast('请先登录')
    return
  }

  // 立即更新UI状态，实现点击后马上变红
  const originalLiked = video.liked
  const originalCount = video.like_count || video.likes || 0
  
  // 先更新UI
  video.liked = !originalLiked
  video.like_count = originalLiked ? originalCount - 1 : originalCount + 1
  video.likes = video.like_count
  
  showToast(video.liked ? '点赞成功' : '取消点赞')

  // 立即调用API写入数据库
  try {
    const response = video.liked 
      ? await likeContent(video.id, 'douyin')
      : await unlikeContent(video.id, 'douyin')
    
    if (response && response.data) {
      // 用服务器返回的真实数据更新
      video.liked = response.data.liked || false
      video.like_count = response.data.like_count || 0
      video.likes = response.data.like_count || 0
      
      // 同步更新 store 中的数据
      const storeVideo = douyinStore.videos.find(v => v.id === video.id)
      if (storeVideo) {
        storeVideo.liked = video.liked
        storeVideo.like_count = video.like_count
        storeVideo.likes = video.likes
      }
    }
  } catch (error) {
    console.error('点赞操作失败:', error)
    // 如果API调用失败，回滚状态
    video.liked = originalLiked
    video.like_count = originalCount
    video.likes = originalCount
    showToast('点赞失败，请重试')
  }
}

// 收藏功能
async function handleCollect(video: DouyinVideo) {
  if (!userStore.uuid) {
    showToast('请先登录')
    return
  }

  // 立即更新UI状态，实现点击后马上变红
  const originalCollected = video.collected
  const originalCount = video.collect_count || video.favorites || 0
  
  // 先更新UI
  video.collected = !originalCollected
  video.collect_count = originalCollected ? originalCount - 1 : originalCount + 1
  video.favorites = video.collect_count
  
  showToast(video.collected ? '收藏成功' : '取消收藏')

  // 立即调用API写入数据库
  try {
    const response = video.collected 
      ? await collectContent(video.id, 'douyin')
      : await uncollectContent(video.id, 'douyin')
    
    if (response && response.data) {
      // 用服务器返回的真实数据更新
      video.collected = response.data.collected || false
      video.collect_count = response.data.collect_count || 0
      video.favorites = response.data.collect_count || 0
      
      // 同步更新 store 中的数据
      const storeVideo = douyinStore.videos.find(v => v.id === video.id)
      if (storeVideo) {
        storeVideo.collected = video.collected
        storeVideo.collect_count = video.collect_count
        storeVideo.favorites = video.favorites
      }
    }
  } catch (error) {
    console.error('收藏操作失败:', error)
    // 如果API调用失败，回滚状态
    video.collected = originalCollected
    video.collect_count = originalCount
    video.favorites = originalCount
    showToast('收藏失败，请重试')
  }
}

// ★ 修改点4：优化解锁按钮处理
function handleUnlock(item: DouyinVideo) {
  currentVideo.value = item;
  
  // 已解锁视频直接播放，不需要任何弹窗
  if (item.unlocked) {
    onRequestPlay()
    return
  }
  
  // 免费视频直接播放
  if ((!item.vip && !item.isVip) && (!item.coin || Number(item.coin) === 0)) {
    onRequestPlay()
    return
  }

  // ★★★ 关键修复：有试看次数的用户，不管什么类型的视频都应该能试看 ★★★
  const remaining = userStore.userInfo.dyVideoMax - userStore.userInfo.dyVideoUsed
  if (remaining > 0) {
    onRequestPlay()
    return
  }

  // 没有试看次数时才检查权限
  const isVipVideo = !!item.vip || !!item.isVip
  const isCoinVideo = Number(item.coin) > 0
  const isCoinCardUser = userStore.userInfo.can_watch_coin === 1
  const isVipCardUser = userStore.userInfo.can_view_vip_video === 1

  // 如果是金币视频，优先处理金币逻辑
  if (isCoinVideo) {
    // 金币卡用户可以直接尝试播放
    if (isCoinCardUser) {
      onRequestPlay()
      return
    }
    // 普通用户显示金币弹窗
    showCoinModal.value = true;
    return;
  }

  // 如果是VIP视频
  if (isVipVideo) {
    // VIP卡用户可以直接尝试播放
    if (isVipCardUser) {
      onRequestPlay()
      return
    }
    
    // 其他情况显示VIP弹窗
    showVipModal.value = true
    return
  }

  // 其他情况直接播放
  onRequestPlay()
}

function goVip() {
  showVipModal.value = false
  showCoinModal.value = false
  router.push({ name: 'Vip' })
}
function goInvite() {
  router.push({ name: 'PromotionShare' })
}
function goRecharge() {
  showCoinModal.value = false
  router.push({ path: '/vip', query: { tab: 'coin' } })
}

// swiper切换或视频切换时
function checkVideoPermission(video) {
  if (video.unlocked) return
  if (video.vip && !userStore.isVIP && userStore.userInfo.dyVideoUsed >= userStore.userInfo.dyVideoMax) {
    showVipModal.value = true
    return
  }
  if (video.coin > 0 && !userStore.isVIP && userStore.userInfo.dyVideoUsed >= userStore.userInfo.dyVideoMax) {
    showCoinModal.value = true
    return
  }
}

onMounted(async () => {
  await userStore.fetchUserInfo() // ← 加这一行，必须 await
  loadMoreVideos()
  
  // 页面加载时获取初始关键词
  await loadRandomKeyword()
  
  console.log('视频列表', douyinStore.videos)
  document.body.style.overflow = 'hidden'
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})

async function buySingleCoin(video: DouyinVideo) {
  if (!video) return
  if (userStore.userInfo.goldCoins < video.coin) {
    showToast('金币余额不足，请先充值')
    return
  }
  try {
    await douyinStore.buySingleVideo({
      videoId: video.id,
      userId: userStore.uuid
    })
    showToast('购买成功，已解锁！')
    showCoinModal.value = false
    video.unlocked = true
    await userStore.fetchUserInfo()
  } catch (e) {
    showToast('购买失败，请重试')
    console.error('购买失败', e)
  }
}

// 数字格式化函数（仿抖音显示）
function formatCount(count: number | string): string {
  const num = Number(count) || 0
  if (num >= 10000) {
    return (num / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
  }
  return num.toString()
}

// 新增用户类型判断
const canViewVip = userStore.userInfo.can_view_vip_video === 1
const canWatchCoin = userStore.userInfo.can_watch_coin === 1
const isSuperUser = canViewVip && canWatchCoin
const isVipUser = canViewVip && !canWatchCoin
const isCoinUser = canWatchCoin && !canViewVip
const isNormalUser = !canViewVip && !canWatchCoin

// 记录视频浏览埋点
async function recordVideoView(video: DouyinVideo) {
  if (!video || !userStore.uuid) return
  
  try {
    console.log('开始记录浏览埋点:', { id: video.id, type: 'douyin', user_uuid: userStore.uuid })
    const response = await trackLongVideoAction({
      id: video.id,
      type: 'douyin', // 抖音视频类型
      action: 'view',
      user_uuid: userStore.uuid
    })
    console.log('浏览埋点记录成功:', response)
  } catch (error) {
    // 埋点失败不影响用户体验，静默处理
    console.error('浏览埋点记录失败:', error)
  }
}
</script>

<style scoped>
.tiktok-wrapper {
  width: 100vw;
  background: transparent; /* 改为透明 */
  position: relative;
  overflow: hidden;
  min-height: 100vh; /* 兼容极端情况，必要时可加 */
}
.swiper-area {
  position: absolute;
  left: 0;
  right: 0;
  top: 0; /* 从顶部开始 */
  bottom: calc(16vw + env(safe-area-inset-bottom, 0)); /* TabBar高度+安全区 */
  background: transparent; /* 改为透明 */
  z-index: 2;
  overflow-y: auto;
  height: auto !important;
  min-height: 0 !important;
  /* 这里不要height: 100%; 只要top/bottom撑住 */
}
.tiktok-container,
.swiper,
.swiper-slide,
.video-page {
  width: 100vw;
  height: 100%;
  min-height: 0;
  background: transparent; /* 改为透明 */
  position: relative;
  box-sizing: border-box;
}

.video-progress-fixed {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 15.5vw;
  z-index: 20;
  pointer-events: auto;
}
.preview-cover {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  object-fit: cover;
}
.video-overlay {
  position: absolute;
  left: 4.26vw;
  bottom: 15vw;
  color: white;
  z-index: 5;
  width: 66%;
}
.author {
  display: flex;
  align-items: center;
  font-weight: bold;
  font-size: 4.53vw;
  margin-bottom: 1.6vw;
}
.verified-badge {
  font-size: 3.73vw;
  background-color: #ff4466;
  color: #fff;
  border-radius: 50%;
  padding: 0.8vw 1.86vw;
}
.title {
  font-size: 4vw;
  line-height: 1.4;
  max-height: 2.8em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 2.66vw;
}
.tags {
  display: flex;
  gap: 1.06vw;
  flex-wrap: wrap;
  margin-bottom: 2.66vw;
}
.tag {
  background: rgba(60, 60, 60, 0.8);
  color: #ffcc00;
  font-size: 3.2vw;
  padding: 0.8vw 2.66vw;
  border-radius: 1.6vw;
}

/* 热门标签底部容器 */
.hot-tags-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
}

/* 热门标签样式 */
.hot-tags-container {
  width: 100%;
}

.hot-tags-wrapper {
  display: flex;
  align-items: center;
  gap: 2.5vw;
  width: 100%;
  background: rgba(0, 0, 0, 0.6);
  padding: 1.5vw 3.5vw;
  backdrop-filter: blur(4px);
}

.hot-tags-icon {
  width: 4vw;
  height: 4vw;
  flex-shrink: 0;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}

.hot-tags-scroll {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.hot-tags-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 3.5vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1.2;
}

.hot-tags-text:hover {
  color: #fff;
}

.hot-tags-wrapper:hover {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
}

.hot-tags-arrow {
  color: rgba(255, 255, 255, 0.7);
  font-size: 4.5vw;
  font-weight: bold;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hot-tags-arrow:hover {
  color: #fff;
  transform: translateX(2px);
}

.vip-badge {
  display: inline-block;
  padding: 2px 12px;
  background: linear-gradient(90deg, #ff8800, #ff4dcb);
  color: #fff;
  border-radius: 16px;
  font-size: 3.2vw;
  margin-top: 2vw;
  cursor: pointer;
  font-weight: bold;
  width: fit-content;
}
.coin-badge {
  display: inline-block;
  padding: 2px 12px;
  background: linear-gradient(90deg, #bdbdbd, #ff8800);
  color: #fff;
  border-radius: 16px;
  font-size: 3.2vw;
  margin-top: 2vw;
  cursor: pointer;
  font-weight: bold;
  width: fit-content;
}
.unlocked-badge {
  display: inline-block;
  padding: 2px 12px;
  background: linear-gradient(90deg, #00c851, #00ff80);
  color: #fff;
  border-radius: 16px;
  font-size: 3.2vw;
  margin-top: 2vw;
  cursor: pointer;
  font-weight: bold;
  width: fit-content;
}
.free-badge {
  display: inline-block;
  padding: 2px 12px;
  background: linear-gradient(90deg, #00c851, #00ff80);
  color: #fff;
  border-radius: 16px;
  font-size: 3.2vw;
  margin-top: 2vw;
  cursor: pointer;
  font-weight: bold;
  width: fit-content;
}
.unlock {
  font-size: 3.2vw;
  color: #fff;
  background: linear-gradient(to right, #ff5b99, #ff3c5f);
  padding: 1.6vw 3.2vw;
  border-radius: 99vw;
  display: inline-block;
  width: auto;
  max-width: 100%;
  white-space: nowrap;
}
.video-actions {
  position: absolute;
  right: 4.26vw;
  bottom: 15vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6.4vw;
  color: white;
  z-index: 5;
}
.avatar {
  width: 14.93vw;
  height: 14.93vw;
  border-radius: 50%;
  margin-bottom: 5.33vw;
  border: 0.53vw solid #fff;
}
.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.06vw;
  cursor: pointer;
}
.action-icon {
  width: 9.6vw;
  height: 9.6vw;
}
.count {
  font-size: 3.2vw;
}
.toast-tip {
  position: fixed;
  left: 50%;
  bottom: 50vh;
  transform: translateX(-50%) translateY(0);
  background: rgba(32,32,32,0.92);
  color: #fff;
  font-size: 4vw;
  border-radius: 2vw;
  padding: 2.8vw 7vw;
  min-width: 36vw;
  max-width: 72vw;
  box-shadow: 0 4px 16px 0 rgba(0,0,0,0.17);
  text-align: center;
  pointer-events: none;
  z-index: 10000;
  opacity: 0;
  transition: opacity 0.3s cubic-bezier(.4,0,.2,1), transform 0.3s cubic-bezier(.4,0,.2,1);
  backdrop-filter: blur(8px);
  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Helvetica Neue', Arial, 'Microsoft Yahei', sans-serif;
}
.toast-tip.show {
  opacity: 1;
  transform: translateX(-50%) translateY(-1vw) scale(1.04);
}
.play-btn {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 72px;
  height: 72px;
  background: rgba(0,0,0,0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  cursor: pointer;
}
.play-btn img {
  width: 28px;
  height: 28px;
}
.vip-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: center;
}
.vip-modal {
  background: #fff;
  border-radius: 3.2vw;
  width: 80vw;
  max-width: 380px;
  padding: 5vw;
  text-align: center;
}
.vip-title {
  font-size: 4.8vw;
  font-weight: bold;
  margin-bottom: 2.7vw;
}
.vip-desc {
  font-size: 3.7vw;
  color: #333;
  margin-bottom: 5vw;
}
.vip-actions {
  display: flex;
  justify-content: space-between;
  gap: 2.7vw;
}
.btn {
  flex: 1;
  padding: 2.7vw 0;
  border-radius: 1.5vw;
  font-size: 3.7vw;
  font-weight: bold;
  border: none;
  cursor: pointer;
}
.btn.orange {
  background: linear-gradient(to right, #ffc14c, #ff8800);
  color: white;
}
.btn.red {
  background: linear-gradient(to right, #ff4d4d, #ff0066);
  color: white;
}
.coin-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
}
.coin-modal {
  background: #fff;
  border-radius: 3.2vw;
  width: 80vw;
  max-width: 380px;
  padding: 5vw;
  text-align: center;
}
.coin-title {
  font-size: 4.8vw;
  font-weight: bold;
  margin-bottom: 2.7vw;
}
.coin-desc {
  font-size: 3.7vw;
  color: #333;
  margin-bottom: 5vw;
}
.coin-actions {
  display: flex;
  justify-content: space-between;
  gap: 2.7vw;
}
.coin-sheet-mask {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 16vw; /* TabBar高度 */
  top: 0;
  background: rgba(0,0,0,0.5);
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: flex-end;
}
.coin-sheet-simple {
  width: 100vw;
  max-width: 480px;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 24px 20px 16px 20px;
  box-sizing: border-box;
  animation: slideUp 0.25s cubic-bezier(.4,0,.2,1);
}
.coin-sheet-title {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 18px;
}
.coin-sheet-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}
.coin-sheet-row:last-child {
  border-bottom: none;
}
.coin-sheet-btn {
  background: linear-gradient(90deg, #ffc14c, #ff8800);
  color: #fff;
  border: none;
  border-radius: 16px;
  padding: 4px 16px;
  font-size: 13px;
  cursor: pointer;
}
.coin-sheet-amount {
  color: #ff4d4d;
  font-weight: bold;
}
.coin-sheet-discount {
  color: #ff4dcb;
  font-size: 13px;
  border-bottom: none;
  padding-bottom: 0;
}
.coin-sheet-discount span:first-child {
  color: #ff4d4d;
  font-size: 13px;
  font-weight: normal;
}
.coin-sheet-vip {
  color: #ff4dcb;
  border: 1px solid #ff4dcb;
  border-radius: 6px;
  padding: 2px 8px;
  margin-left: 8px;
  font-size: 13px;
  cursor: pointer;
  background: #fff0fa;
}
.coin-sheet-buy-btn {
  width: 100%;
  margin-top: 20px;
  background: linear-gradient(90deg, #ff4d4d, #ff8800);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 12px 0;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}
@keyframes slideUp {
  from { transform: translateY(100%);}
  to { transform: translateY(0);}
}

.loading-indicator {
  position: fixed;
  bottom: calc(16vw + 2vw); /* TabBar高度 + 间距 */
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 15;
}

.loading-spinner {
  width: 8vw;
  height: 8vw;
  margin-bottom: 2vw;
  animation: spin 0.8s linear infinite;
  background: transparent;
  filter: none;
}

.loading-spinner-custom {
  width: 8vw;
  height: 8vw;
  margin-bottom: 2vw;
  border: 0.4vw solid rgba(255, 255, 255, 0.3);
  border-top: 0.4vw solid #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 3.2vw;
  color: #ff5f5f;
  font-weight: 500;
  text-align: center;
}
</style>
<style>
body.ios-browser .swiper-area {
  bottom: calc(16vw + env(safe-area-inset-bottom, 0)) !important; /* 16vw为TabBar高度 */
}
</style>
