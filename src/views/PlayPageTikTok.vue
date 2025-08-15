<template>
  <div class="tiktok-play-wrapper">
    <div class="back-button" @click="goBack">
      <img src="/icons/back1.svg" alt="返回" />
    </div>

    <swiper
      ref="swiperRef"
      direction="vertical"
      :slides-per-view="1"
      :resistance-ratio="0.3"
      :threshold="20"
      :initial-slide="0"
      class="tiktok-swiper"
      @slideChange="onSlideChange"
      @swiper="onSwiperReady"
    >
      <swiper-slide
        v-for="(video, index) in videoList"
        :key="video.id"
        class="video-slide"
      >
        <div class="video-page">
          <!-- NativePlayer 组件绑定 -->
          <NativePlayer
            v-if="index === currentIndex && video.src"
            :ref="el => setPlayerRef(index, el)"
            :src="video.src"
            :cover="video.cover"
            :shouldPlay="shouldPlay"
            :showPlayButton="false"
            :showPauseButton="true"
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
          <!-- 自定义播放按钮：参考推荐页的逻辑 -->
          <div
            v-show="index === currentIndex && !shouldPlay"
            class="play-btn"
            :class="{ loading: isLoadingPlay }"
            @click="() => handleUnlock(video)"
          >
            <img v-if="!isLoadingPlay" src="/icons/play1.svg" />
            <div v-else class="loading-spinner"></div>
          </div>


          <div class="video-overlay">
            <div class="nickname-line">
              <span class="nickname">@{{ video.author }}</span>
            </div>
            <div class="title">{{ video.title }}</div>
            <div class="tags">
              <span class="tag" v-for="(tag, tagIndex) in video.tags" :key="tagIndex">#{{ tag }}</span>
            </div>
            
            <!-- VIP提示（放在tags下方） -->
            <div
              v-if="!video.unlocked && (video.vip || video.isVip)"
              class="vip-badge"
              @click="handleUnlock(video)"
            >
              开通VIP观看完整视频
            </div>
            
            <!-- 金币提示（放在tags下方） -->
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

          <div class="video-actions">
            <div class="action-item">
              <img :src="video.avatar" alt="博主头像" class="avatar" />
            </div>
            <div class="action-item" @click="handleLike(video)">
              <img 
                :src="video.liked ? '/icons/like7.svg' : '/icons/like.svg'" 
                alt="点赞" 
                class="action-icon"
              />
              <span class="count">{{ video.like_count || video.likes || 0 }}</span>
            </div>
            <div class="action-item" @click="handleCollect(video)">
              <img 
                :src="video.collected ? '/icons/star7.svg' : '/icons/fav1.svg'" 
                alt="收藏" 
                class="action-icon"
              />
              <span class="count">{{ video.collect_count || video.favorites || 0 }}</span>
            </div>
            <div class="action-item">
              <img src="/icons/share1.svg" alt="分享" class="action-icon" />
              <span class="count">分享</span>
            </div>
          </div>
        </div>
      </swiper-slide>
    </swiper>

    <VideoProgress
      v-if="videoList[currentIndex] && shouldPlay"
      :currentTime="Number(currentTime)"
      :duration="Number(duration)"
      @seek="onSeek"
      @seeking="onSeeking"
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
import { useRouter, useRoute } from 'vue-router'
import type { Swiper as SwiperType } from 'swiper'
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/css'
import NativePlayer from '../components/NativePlayer.vue'
import VideoProgress from '../components/VideoProgress.vue'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useDouyinVideosStore, type DouyinVideo } from '@/store/douyin.store' // 👈 引入store
import { useUserStore } from '@/store/user'
import { likeContent, collectContent, unlikeContent, uncollectContent } from '@/api/userAction.api'
const router = useRouter()
const route = useRoute()
const historyStore = useHistoryStore()
const douyinStore = useDouyinVideosStore() // 👈 实例化store
const userStore = useUserStore() // 👈 实例化 userStore

// 直接使用 DouyinVideo 类型，不需要重新定义
// Swiper 类型
const swiperRef = ref<SwiperType | null>(null)
const playerRef = ref<any>(null)
const videoList = ref<DouyinVideo[]>([])
const currentIndex = ref(Number(route.query.index || 0))
const tag = route.query.tag as string
const pageSize = 10
const lastId = ref<number>(0)
const loading = ref(false)
const noMore = ref(false)
const startIndex = currentIndex.value
const shouldPlay = ref(false) // 改成false，和推荐页一样
const currentTime = ref(0)
const duration = ref(0)
const isLoadingPlay = ref(false) // 添加加载状态

// 弹窗相关状态
const showVipModal = ref(false)
const showCoinModal = ref(false)
const currentVideo = ref<DouyinVideo | null>(null)

// Toast 函数
let toastTimer: ReturnType<typeof setTimeout> | null = null
const toastText = ref('')
const toastVisible = ref(false)

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

// 拉取标签下的视频列表
async function loadVideos(init = false) {
  if (loading.value || noMore.value) return
  loading.value = true
  try {
    // ★★★ 关键修复：调用 loadVideos 时传递 tag 参数
    await douyinStore.loadVideos({
      tag,
      pageSize,
      last_id: lastId.value,
      userId: userStore.uuid  // 添加用户ID，让后端知道要检查该用户的解锁状态
    })
    // 直接用 store 里的 videos
    if (init) {
      videoList.value = [...douyinStore.videos]
    } else {
      videoList.value = [...videoList.value, ...douyinStore.videos]
    }
    if (douyinStore.videos.length < pageSize) noMore.value = true
    lastId.value = douyinStore.videos.length ? douyinStore.videos[douyinStore.videos.length - 1].id : lastId.value
    if (init && route.query.id) {
      const queryId = Number(route.query.id)
      const idx = videoList.value.findIndex(v => v.id === queryId)
      if (idx >= 0) currentIndex.value = idx
    }
    
    // 修复：视频加载完成后，如果 Swiper 已经准备好，立即跳转到正确位置
    if (init && swiperRef.value && videoList.value.length > 0) {
      // 使用延时确保 DOM 更新完成
      setTimeout(() => {
        const swiper = swiperRef.value
        if (swiper && typeof swiper.slideTo === 'function') {
          swiper.slideTo(currentIndex.value, 0, false)
          // 手动触发 onSlideChange 确保状态同步
          if (swiper.realIndex !== currentIndex.value) {
            // 如果 slideTo 无效，直接设置 currentIndex 为实际显示的索引
            currentIndex.value = swiper.realIndex
          }
        }
      }, 200)
    }
    
    // 备用方案：如果是初始化且有目标索引，但 Swiper 跳转失败，则直接调整 currentIndex
    if (init && currentIndex.value > 0 && swiperRef.value) {
      setTimeout(() => {
        const swiper = swiperRef.value
        if (swiper && swiper.realIndex === 0 && currentIndex.value !== 0) {
          // 既然跳转不了，就让第0个视频显示播放按钮
          currentIndex.value = 0
        }
      }, 500)
    }
    
    // 强制同步机制：1秒后检查并修正状态不一致问题
    if (init) {
      setTimeout(() => {
        const swiper = swiperRef.value
        if (swiper) {
          const realIndex = swiper.realIndex ?? swiper.activeIndex ?? 0
          if (currentIndex.value !== realIndex) {
            currentIndex.value = realIndex
          }
        }
      }, 1000)
    }
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(async () => {
  // 确保初始状态正确
  shouldPlay.value = false
  currentTime.value = 0
  duration.value = 0
  await userStore.fetchUserInfo() // 获取用户信息
  
  // 重置 store 状态，避免之前的缓存干扰
  douyinStore.reset()
  
  // 检查是否从搜索页或收藏页跳转过来
  if ((route.query.from === 'search' || route.query.from === 'favorites') && route.query.id) {
    // 从搜索页或收藏页跳转，调用单个视频详情接口
    try {
      loading.value = true
      const videoDetail = await douyinStore.fetchVideoDetail(route.query.id as string, userStore.uuid)
      // 将单个视频设置到视频列表中
      videoList.value = [videoDetail]
      currentIndex.value = 0
      
      // 🔥 如果是从收藏页跳转，设置收藏状态为true
      if (route.query.from === 'favorites') {
        videoDetail.collected = true
      }
    } catch (error) {
      // 加载视频详情失败
    } finally {
      loading.value = false
    }
  } else {
    // 从发现页跳转或正常流程，加载视频列表
    try {
      await loadVideos(true)
      
      // 如果是从发现页跳转，需要将点击的视频移到第一个位置
      if (route.query.from === 'discover' && route.query.id) {
        const clickedVideoId = Number(route.query.id)
        const clickedIndex = videoList.value.findIndex(v => v.id === clickedVideoId)
        
        if (clickedIndex > 0) {
          // 将点击的视频移动到第一个位置
          const clickedVideo = videoList.value.splice(clickedIndex, 1)[0]
          videoList.value.unshift(clickedVideo)
          currentIndex.value = 0
          
          // 立即跳转到第一个视频
          if (swiperRef.value) {
            setTimeout(() => {
              const swiper = swiperRef.value
              if (swiper && typeof swiper.slideTo === 'function') {
                swiper.slideTo(0, 0, false)
              }
            }, 100)
          }
        } else if (clickedIndex === 0) {
          // 已经在第一个位置
          currentIndex.value = 0
        } else {
          // 如果在当前列表中找不到，直接使用第一个视频（不调用单个接口）
          currentIndex.value = 0
        }
      }
    } catch (error) {
      // 加载视频列表失败
    }
  }
})

// 滑动到最后一条时自动加载更多
const onSlideChange = (swiper: SwiperType) => {
  currentIndex.value = swiper.realIndex
  shouldPlay.value = false // 确保切换视频时重置播放状态
  showVipModal.value = false // 切换视频时关闭弹窗
  showCoinModal.value = false
  // 重置进度条
  currentTime.value = 0
  duration.value = 0
  
  if (
    currentIndex.value === videoList.value.length - 1 &&
    !loading.value &&
    !noMore.value
  ) {
    loadVideos()
  }
}

const onSwiperReady = (swiper: SwiperType) => {
  swiperRef.value = swiper
  // 确保初始状态正确
  shouldPlay.value = false
}
const onRequestPlay = async () => {
  const video = videoList.value[currentIndex.value]
  if (!video || isLoadingPlay.value) return

  // 重置进度条（准备播放新视频）
  currentTime.value = 0
  duration.value = 0

  // 如果已经有播放地址，直接播放
  if (video.src) {
    shouldPlay.value = true
    return
  }

  // 🔍 调试信息：打印用户试看次数信息
  console.log('🔍 试看次数调试信息：', {
    dyVideoUsed: userStore.userInfo.dyVideoUsed,
    dyVideoMax: userStore.userInfo.dyVideoMax,
    remaining: userStore.userInfo.dyVideoMax - userStore.userInfo.dyVideoUsed,
    can_watch_coin: userStore.userInfo.can_watch_coin,
    can_view_vip_video: userStore.userInfo.can_view_vip_video,
    isVIP: userStore.isVIP,
    video: {
      id: video.id,
      title: video.title,
      vip: video.vip,
      isVip: video.isVip,
      coin: video.coin,
      unlocked: video.unlocked
    }
  })

  // 🔧 临时修复：如果显示有剩余次数但被拦截，强制刷新用户信息
  const currentRemaining = userStore.userInfo.dyVideoMax - userStore.userInfo.dyVideoUsed
  if (currentRemaining > 0) {
    console.log('🔄 检测到有剩余次数，刷新用户信息...')
    await userStore.fetchUserInfo(true) // 强制刷新
    const newRemaining = userStore.userInfo.dyVideoMax - userStore.userInfo.dyVideoUsed
    console.log('🔄 刷新后剩余次数：', newRemaining)
  }

  const userId = userStore.uuid
  if (!userId) {
    showToast('请先登录')
    return
  }

  // ★★★ 关键修复：有试看次数的用户，不管什么类型的视频都应该能试看 ★★★
  const finalRemaining = userStore.userInfo.dyVideoMax - userStore.userInfo.dyVideoUsed
  if (finalRemaining > 0) {
    console.log('🎯 有试看次数，直接请求播放接口', { finalRemaining, videoType: video.vip || video.isVip ? 'VIP' : (Number(video.coin) > 0 ? 'Coin' : 'Free') })
    isLoadingPlay.value = true
    try {
      const res = await douyinStore.fetchPlayInfo(Number(video.id), userStore.uuid)
      if (res?.canPlay && res?.playUrl) {
        video.src = res.playUrl
        shouldPlay.value = true
        console.log('✅ 试看播放成功')
      } else {
        console.log('❌ 播放接口返回失败：', res)
        showToast('获取播放地址失败')
      }
    } catch (e) {
      console.log('❌ 播放接口异常：', e)
      showToast('播放失败，请重试')
    } finally {
      isLoadingPlay.value = false
    }
    return
  }

  // ★★★ 只要是免费视频，直接请求播放接口，别做任何拦截 ★★★
  if ((!video.vip && !video.isVip) && (!video.coin || Number(video.coin) === 0)) {
    isLoadingPlay.value = true
    
    const startTime = Date.now()
    
    try {
      const res = await douyinStore.fetchPlayInfo(Number(video.id), userStore.uuid)
      const endTime = Date.now()
      
      if (res?.canPlay && res?.playUrl) {
        video.src = res.playUrl
        shouldPlay.value = true
      } else {
        showToast('获取播放地址失败')
      }
    } catch (e) {
      const endTime = Date.now()
      showToast('播放失败，请重试')
    } finally {
      isLoadingPlay.value = false
    }
    return
  }

  const isVipVideo = !!video.vip || !!video.isVip
  const isCoinVideo = Number(video.coin) > 0
  const remaining = userStore.userInfo.dyVideoMax - userStore.userInfo.dyVideoUsed
  const isCoinCardUser = userStore.userInfo.can_watch_coin === 1
  const isVipCardUser = userStore.userInfo.can_view_vip_video === 1

  // 没有试看次数的情况下才检查权限
  console.log('🚫 没有试看次数，检查用户权限', { remaining, isVipVideo, isCoinVideo, isCoinCardUser, isVipCardUser })

  // 其它情况（已解锁、金币视频等）按原逻辑处理
  if (video.unlocked) {
    console.log('🔓 视频已解锁，直接播放')
    isLoadingPlay.value = true
    try {
      const res = await douyinStore.fetchPlayInfo(video.id, userStore.uuid)
      if (res.canPlay && res.playUrl) {
        video.src = res.playUrl
        shouldPlay.value = true
      } else {
        showToast('获取播放地址失败，请重试')
      }
    } catch (e) {
      showToast('播放失败，请重试')
    } finally {
      isLoadingPlay.value = false
    }
    return
  }

  // 金币卡用户可以看金币视频
  if (isCoinVideo && isCoinCardUser) {
    console.log('💰 金币卡用户观看金币视频')
    isLoadingPlay.value = true
    try {
      const res = await douyinStore.fetchPlayInfo(video.id, userStore.uuid)
      if (res.canPlay && res.playUrl) {
        video.src = res.playUrl
        shouldPlay.value = true
      }
    } catch (e) {
      await showCoinModalWithRefresh()
    } finally {
      isLoadingPlay.value = false
    }
    return
  }

  // VIP卡用户可以看VIP视频
  if (isVipVideo && isVipCardUser) {
    console.log('👑 VIP卡用户观看VIP视频')
    isLoadingPlay.value = true
    try {
      const res = await douyinStore.fetchPlayInfo(video.id, userStore.uuid)
      if (res.canPlay && res.playUrl) {
        video.src = res.playUrl
        shouldPlay.value = true
      }
    } catch (e) {
      showVipModal.value = true
    } finally {
      isLoadingPlay.value = false
    }
    return
  }

  // 没有权限的情况，显示相应弹窗
  if (isCoinVideo) {
    console.log('💰 金币视频，显示金币弹窗')
    await showCoinModalWithRefresh()
  } else if (isVipVideo) {
    console.log('👑 VIP视频，显示VIP弹窗')
    showVipModal.value = true
  } else {
    // 其他情况直接播放
    console.log('🎬 其他情况，直接播放')
    isLoadingPlay.value = true
    try {
      const res = await douyinStore.fetchPlayInfo(video.id, userStore.uuid)
      if (res.canPlay && res.playUrl) {
        video.src = res.playUrl
        shouldPlay.value = true
      }
    } catch (e) {
      showToast('播放失败，请重试')
    } finally {
      isLoadingPlay.value = false
    }
  }
}

// 显示金币弹窗前刷新用户信息
async function showCoinModalWithRefresh() {
  try {
    await userStore.fetchUserInfo() // 刷新用户信息，获取最新金币数量
    showCoinModal.value = true
  } catch (e) {
    showCoinModal.value = true // 即使刷新失败也显示弹窗
  }
}

// 添加权限处理函数（参考推荐页）
const handleUnlock = async (video: DouyinVideo) => {
  currentVideo.value = video
  
  // 已解锁视频直接播放，不需要任何弹窗
  if (video.unlocked) {
    onRequestPlay()
    return
  }
  
  // 免费视频直接播放
  if ((!video.vip && !video.isVip) && (!video.coin || Number(video.coin) === 0)) {
    onRequestPlay()
    return
  }
  
  // ★★★ 关键修复：有试看次数的用户，不管什么类型的视频都应该能试看 ★★★
  const remaining = userStore.userInfo.dyVideoMax - userStore.userInfo.dyVideoUsed
  if (remaining > 0) {
    console.log('🎯 handleUnlock：有试看次数，直接播放', { remaining, videoTitle: video.title })
    onRequestPlay()
    return
  }
  
  const isVipVideo = !!video.vip || !!video.isVip
  const isCoinVideo = Number(video.coin) > 0
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
    await showCoinModalWithRefresh()
    return
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

const onTimeUpdate = ({ currentTime: ct, duration: dur }: { currentTime: number, duration: number }) => {
  currentTime.value = Number(ct)
  duration.value = Number(dur)
}

const onSeek = (time: number) => {
  if (playerRef.value?.seekTo) {
    playerRef.value.seekTo(time)
    shouldPlay.value = true
  }
}
const onSeeking = (time: number) => {
  currentTime.value = time
}

const setPlayerRef = (index: number, el: any) => {
  if (index === currentIndex.value && el) {
    playerRef.value = el
  }
}

const goBack = () => {
  // 🔥 处理从收藏页跳转的返回逻辑
  if (route.query.from === 'favorites') {
    // 从收藏页跳转过来的，直接返回收藏页
    router.back()
  } else {
    router.go(-1)
  }
}


onBeforeUnmount(() => {
  document.body.style.overflow = ''
})

const onPlayed = () => {
  const video = videoList.value[currentIndex.value]
  if (video) {
    historyStore.addRecord({
  id: String(video.id ?? video.src), // 👈 一律转成字符串
  type: 'douyin',
  time: new Date().toISOString(),
  data: {
    title: video.title || '短视频',
    cover: video.cover || '',
    author: video.author || '',
    tags: video.tags || []
  }
})

  }
}

function hasPlayUrl(video: any) {
  // 只要 video.src 或 video.playUrl 有值就返回 true，否则 false
  return !!(video.src || video.playUrl)
}

// 弹窗处理方法
function goVip() {
  showVipModal.value = false
  showCoinModal.value = false
  router.push('/vip') // 使用路径而不是 name
}

function goInvite() {
  router.push('/promotion-share') // 使用路径而不是 name
}

function goRecharge() {
  showCoinModal.value = false
  router.push({ path: '/vip', query: { tab: 'coin' } })
}

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
    // 购买成功后自动开始播放
    setTimeout(() => {
      onRequestPlay()
    }, 500)
  } catch (e) {
    showToast('购买失败，请重试')
  }
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
</script>
<style scoped>
.tiktok-play-wrapper {
  background: #000;
  height: 100vh;
  overflow: hidden;
}
.tiktok-swiper,
.video-page {
  width: 100vw;
  height: 100vh;
  position: relative;
  background: #000;
}

.video-slide {
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-cover {
  width: 100vw;
  height: 100vh;
  object-fit: cover;
}

.video-overlay {
  position: absolute;
  left: 4vw;
  bottom: 26vw;
  color: white;
  z-index: 5;
  width: 66vw;
}

.nickname-line {
  display: flex;
  align-items: center;
  font-weight: bold;
  font-size: 4vw;
  margin-bottom: 1vw;
}

.nickname {
  margin-right: 1vw;
}

.welfare-icon {
  width: 4vw;
  height: 4vw;
}

.title {
  font-size: 3.8vw;
  line-height: 1.4;
  max-height: 2.8em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 2vw;
}

.tags {
  display: flex;
  gap: 1vw;
  flex-wrap: wrap;
  margin-bottom: 2vw;
}

.tag {
  background: rgba(120, 120, 120, 0.3);
  color: #ffcc00;
  font-size: 2.7vw;
  padding: 1vw 2.5vw;
  border-radius: 1.5vw;
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

.video-actions {
  position: absolute;
  right: 4vw;
  bottom: 26vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6vw;
  color: white;
  z-index: 5;
}

.avatar {
  width: 14vw;
  height: 14vw;
  border-radius: 50%;
  margin-bottom: 5vw;
  border: 0.5vw solid #fff;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1vw;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.action-item:hover {
  transform: scale(1.1);
}

.action-item:active {
  transform: scale(0.95);
}

.action-icon {
  width: 9vw;
  height: 9vw;
  transition: all 0.3s ease;
}

.action-icon.liked {
  /* 点赞后只改变颜色，不改变大小 */
  filter: none;
}

.action-icon.collected {
  /* 收藏后只改变颜色，不改变大小 */
  filter: none;
}

.count {
  font-size: 2.7vw;
}

.back-button {
  position: fixed;
  top: 4vw;
  left: 4vw;
  z-index: 9999;
  width: 8vw;
  height: 8vw;
  cursor: pointer;
}

.back-button img {
  width: 100%;
  height: 100%;
}
.play-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999; /* 必须高于 NativePlayer */
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
}
.play-btn:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: translate(-50%, -50%) scale(1.1);
}
.play-btn:active {
  transform: translate(-50%, -50%) scale(0.95);
}
.play-btn.loading {
  cursor: not-allowed;
  pointer-events: none;
}
.play-btn img {
  width: 32px;
  height: 32px;
  margin-left: 3px; /* 播放图标向右偏移一点，视觉上更居中 */
}
.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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
.coin-sheet-mask {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
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
</style>
