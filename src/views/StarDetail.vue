<template>
  <div class="detail-wrapper" ref="detailWrapper" :style="{ backgroundImage: 'url(' + star.avatar + ')' }">
    <!-- 顶部返回 -->
    <div class="back-fixed" @click="goBack">
      <img src="/icons/back3.svg" alt="返回" />
    </div>

    <div class="overlay">
      <div class="header">
        <img :src="star.avatar" class="avatar" alt="明星头像" />
        <div class="info">
          <h2 class="name">{{ star.name }}</h2>
          <div class="meta-line">
            <span>国家：{{ star.country || '未知' }}</span>
            <span>身高：{{ star.height || '未知' }}</span>
            <span>生日：{{ star.birthday || '未知' }}</span>
          </div>
          <div class="meta-line">
            <span>罩杯：{{ star.cup || '未知' }}</span>
            <span>影片数量：{{ videoCount }}</span>
            <span>三围：{{ star.size || '未知' }}</span>
          </div>
          <div class="intro-container">
            <span class="intro-label">人物简介：</span>
            <span class="intro-text" :class="{ folded: !showFullIntro }">
              {{ star.intro || 'Hi，我是' + star.name + '，欢迎关注我！' }}
            </span>
            <span class="toggle" @click="showFullIntro = !showFullIntro">
              <img :src="showFullIntro ? '/icons/up.svg' : '/icons/down.svg'" alt="展开/收起简介" />
            </span>
          </div>
        </div>
      </div>

      <div class="stats">
        <div class="stat"><div class="number">{{ formatWk(star.visits) }}</div><div class="label">访客</div></div>
        <div class="stat"><div class="number">{{ formatWk(star.likes) }}</div><div class="label">点赞</div></div>
        <div class="stat"><div class="number">{{ formatWk(star.fans) }}</div><div class="label">粉丝</div></div>
      </div>
    </div>

    <div class="pure-white-wrapper">
      <div class="tab-wrapper">
        <div class="tab-indicator-bar"></div>
        <div class="tab-switch">
          <div class="tab" :class="{ active: activeTab === 'video' }" @click="switchTab('video')">
            视频 <div class="tab-line" v-if="activeTab === 'video'"></div>
          </div>
          <div class="tab" :class="{ active: activeTab === 'image' }" @click="switchTab('image')">
            图片 <div class="tab-line" v-if="activeTab === 'image'"></div>
          </div>
        </div>
      </div>

      <!-- 左右滑动 -->
      <div class="swiper-area">
        <swiper
          :slides-per-view="1"
          :space-between="0"
          @swiper="onSwiper"
          @slideChange="onSlideChange"
          class="mySwiper"
          :allowTouchMove="true"
        >
          <!-- 视频页 -->
          <swiper-slide>
            <div class="video-list-content">
              <!-- 首屏加载 -->
              <div v-if="isLoadingVideo && !videoList.length" class="loading-tip">
                <img src="/icons/loading.svg" class="loading-icon" />
                <span>正在加载视频数据...</span>
              </div>

              <!-- 列表 -->
              <div v-else-if="videoList.length" class="video-list">
                <div
                  class="video-card"
                  v-for="video in videoList"
                  :key="video.id || video.title"
                  @click="goToPlay(video)"
                >
                  <div class="video-thumb">
                    <img v-lazy="video.cover" class="cover" alt="视频封面" />
                    <!-- 只显示 VIP 图标或金币数（关闭彩色提示） -->
  <CardCornerIcon
    :isVip="video.vip"
    :coinAmount="video.coin"
    :showVipTip="false"
    :showCoinTip="false"
  />

                    <div class="video-overlay">
                      <span class="views">
                        <img src="/icons/play4.svg" class="play-icon" />
                        {{ formatViews(video.views) }}
                      </span>
                      <span class="duration">{{ displayDuration(video.duration) }}</span>
                    </div>
                  </div>

                  <!-- 底部区域：标题两行 + 标签贴底 -->
                  <div class="video-bottom">
  <div class="video-title">{{ video.title }}</div>
  <div class="tag">
  {{ video.tag || (video.tags && video.tags[0]?.name) || '' }}
</div>
</div>
                </div>
              </div>

              <!-- 空状态 -->
              <div v-else class="loading-tip" style="color:#999">
                <span>暂无视频内容</span>
              </div>

              <!-- 加载更多 -->
              <div class="loading-tip" v-if="isLoadingVideo && videoList.length">
                <img src="/icons/loading.svg" class="loading-icon" />
                <span>客官别走，妾身马上就好~</span>
              </div>

              <!-- 没有更多 -->
              <div class="no-more-tip" v-if="noMoreVideo && videoList.length">
                客官，妾身被你弄高潮了，扛不住了~
              </div>

              <div ref="videoSentinel" class="sentinel"></div>
            </div>
          </swiper-slide>

          <!-- 图片页 -->
          <swiper-slide>
            <div class="image-list-content">
              <!-- 首屏加载 -->
              <div v-if="isLoadingImage && !imageList.length" class="loading-tip">
                <img src="/icons/loading.svg" class="loading-icon" />
                <span>正在加载图片数据...</span>
              </div>

              <!-- 列表 -->
              <div v-else-if="imageList.length" class="image-grid">
                <div
                  class="image-card"
                  v-for="(img, index) in imageList"
                  :key="img.id || index"
                  @click="goToImageDetail(img)"
                >
                  <div class="image-thumb">
                    <img v-lazy="img.src || img.cover" class="image" alt="图片封面" />
                    <div class="corner-label">
                      <img src="/icons/tupian.svg" class="corner-icon" />
                      <span>图片</span>
                    </div>
                    <div class="image-overlay">
                      <span class="views">
                        <img src="/icons/view1.svg" class="play-icon" />
                        {{ formatViews(img.views) }}
                      </span>
                      <span class="count">
                        <img src="/icons/tupian1.svg" class="play-icon" />
                        {{ img.count }}
                      </span>
                    </div>
                  </div>
                  <div class="image-title">{{ img.title }}</div>
                </div>
              </div>

              <!-- 空状态 -->
              <div v-else class="loading-tip" style="color:#999">
                <span>暂无图片内容</span>
              </div>

              <!-- 加载更多 -->
              <div class="loading-tip" v-if="isLoadingImage && imageList.length">
                <img src="/icons/loading.svg" class="loading-icon" />
                <span>客官别走，妾身马上就好~</span>
              </div>

              <!-- 没有更多 -->
              <div class="no-more-tip" v-if="noMoreImage && imageList.length">
                客官，妾身被你弄高潮了，扛不住了~
              </div>

              <div ref="imageSentinel" class="sentinel"></div>
            </div>
          </swiper-slide>
        </swiper>
      </div>
    </div>  
     <!-- 返回顶部按钮（绑定 detailWrapper 这个滚动容器） -->
    <BackToTop
  v-if="detailWrapper"            
  :scroll-container="detailWrapper"
  :threshold="300"
  :duration="300"
/>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onActivated, computed, onBeforeUnmount } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/swiper.min.css'
import type { Swiper as SwiperClass } from 'swiper'
import { useOnlyfansH5Store } from '@/store/onlyfansH5'
import CardCornerIcon from '@/components/CardCornerIcon.vue'
import BackToTop from '@/components/BackToTop.vue'  // ⬅️ 新增
import { trackLongVideoAction } from '@/api/longVideo.api'  // 埋点接口
import { useUserStore } from '@/store/user'  // 用户信息


const router = useRouter()
const onlyfansStore = useOnlyfansH5Store()
const userStore = useUserStore()  // 用户store

interface Star {
  id: string | number
  name: string
  avatar: string
  country?: string
  height?: string
  birthday?: string
  cup?: string
  size?: string
  visits?: number | string
  likes?: number | string
  fans?: number | string
  intro?: string
}
interface VideoItem {
  id?: number
  src: string
  cover: string
  title: string
  duration?: string | number
  views?: number
  tag?: string
   tags?: { id:number; name:string }[]  // 新增：标签数组
   vip?: boolean        // ✅ 新增
  coin?: number        // ✅ 新增
}
interface ImageItem {
  id?: number
  src?: string
  cover?: string
  title: string
  views?: number
  count?: number
}

const activeTab = ref<'video' | 'image'>('video')
const showFullIntro = ref(false)
const star = ref<Star>({} as Star)
const detailWrapper = ref<HTMLElement | null>(null)
const swiperInstance = ref<SwiperClass | null>(null)

/* ---------- 远程翻页状态 ---------- */
const pageSize = 15

const videoList = ref<VideoItem[]>([])
const imageList = ref<ImageItem[]>([])

const videoPage = ref(1)
const imagePage = ref(1)

const totalVideo = ref(0)
const totalImage = ref(0)

const loadingVideo = ref(false)
const loadingImage = ref(false)

const videoSentinel = ref<HTMLElement | null>(null)
const imageSentinel = ref<HTMLElement | null>(null)
let videoObserver: IntersectionObserver | null = null
let imageObserver: IntersectionObserver | null = null

const isLoadingVideo = computed(() => onlyfansStore.videoLoading && activeTab.value === 'video')
const isLoadingImage = computed(() => onlyfansStore.imageLoading && activeTab.value === 'image')
const noMoreVideo = computed(() => onlyfansStore.videoNoMore)
const noMoreImage = computed(() => onlyfansStore.imageNoMore)

/* ---------- 工具 ---------- */
function displayDuration(d?: string | number | null) {
  if (d === 0 || d === '0') return '00:00'
  if (d === undefined || d === null || d === '') return '00:00'
  const s = String(d).trim()
  if (/^\d+$/.test(s)) {
    const sec = parseInt(s, 10)
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const ss = sec % 60
    const mm = String(m).padStart(2, '0')
    const sss = String(ss).padStart(2, '0')
    return h > 0 ? `${h}:${mm}:${sss}` : `${mm}:${sss}`
  }
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) return s
  return '00:00'
}
function formatWk(num: number | string | undefined) {
  if (typeof num === 'string' && /[wkWk]$/.test(num)) return num
  const n = Number(num)
  if (isNaN(n) || n === 0) return '0.0'
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toFixed(1)
}
function formatViews(num: number | string | undefined) {
  if (!num) return '0'
  const n = Number(num)
  if (n >= 10000) return (n / 10000).toFixed(2) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(2) + 'k'
  return n.toString()
}

/* ---------- 滚动记忆 ---------- */
function getScrollKey(type: string) {
  return `star-scroll-${type}-${star.value.name}`
}
function saveScroll(type: string) {
  if (detailWrapper.value) sessionStorage.setItem(getScrollKey(type), detailWrapper.value.scrollTop.toString())
}
function restoreScroll(type: string) {
  const saved = sessionStorage.getItem(getScrollKey(type))
  if (saved && detailWrapper.value) {
    const targetScroll = parseInt(saved)
    const tryRestore = () => {
      if (!detailWrapper.value) return
      const realHeight = detailWrapper.value.scrollHeight
      if (realHeight < targetScroll + 100) requestAnimationFrame(tryRestore)
      else detailWrapper.value!.scrollTop = targetScroll
    }
    tryRestore()
  }
}

/* ---------- 数据映射 ---------- */
const mapVideo = (m: any): VideoItem => ({
  id: m.id,
  src: '',
  cover: m.cover || '',
  title: m.title,
  duration: m.duration ?? m.video_duration ?? m.length ?? m.time ?? '',
  views: m.views ?? m.view_count ?? m.play_count ?? m.plays ?? 0,
  tag: Array.isArray(m.tags) && m.tags.length ? m.tags[0].name : undefined, // ✅
  tags: Array.isArray(m.tags) ? m.tags : [],
  vip: !!(m.vip ?? m.is_vip),          // true/false 或 1/0 皆可
  coin: Number(m.coin) > 0 ? Number(m.coin) : 0                                // ✅
})

const mapImage = (m: any): ImageItem => ({
  id: m.id,
  src: '',
  cover: m.cover || '',
  title: m.title,
  views: m.view_count,
  count: m.like_count
})

/* ---------- 远程加载 ---------- */
async function fetchMediaPage(kind: 'video' | 'image', page: number) {
  if (!star.value.id) return
  try {
    const result = await onlyfansStore.fetchCreatorMedia(Number(star.value.id), {
      type: kind,
      page,
      page_size: pageSize,
      append: page > 1
    })
    const isVideo = kind === 'video'
    if (isVideo) {
      videoList.value = onlyfansStore.videoList.map(mapVideo)
      totalVideo.value = result.total
    } else {
      imageList.value = onlyfansStore.imageList.map(mapImage)
      totalImage.value = result.total
    }
  } catch (error) {
    console.error(`获取${kind}数据失败:`, error)
  }
}

/* ---------- 观察者 ---------- */
function setupObserver(kind: 'video' | 'image') {
  const root = detailWrapper.value || null
  if (kind === 'video') {
    videoObserver?.disconnect()
    videoObserver = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || loadingVideo.value || noMoreVideo.value) return
      if (videoSentinel.value) videoObserver!.unobserve(videoSentinel.value)
      videoPage.value += 1
      await fetchMediaPage('video', videoPage.value)
      await nextTick()
      if (videoSentinel.value && !noMoreVideo.value) videoObserver!.observe(videoSentinel.value)
    }, { root, threshold: 0.1 })
    if (videoSentinel.value && !noMoreVideo.value) videoObserver.observe(videoSentinel.value)
  } else {
    imageObserver?.disconnect()
    imageObserver = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || loadingImage.value || noMoreImage.value) return
      if (imageSentinel.value) imageObserver!.unobserve(imageSentinel.value)
      imagePage.value += 1
      await fetchMediaPage('image', imagePage.value)
      await nextTick()
      if (imageSentinel.value && !noMoreImage.value) imageObserver!.observe(imageSentinel.value)
    }, { root, threshold: 0.1 })
    if (imageSentinel.value && !noMoreImage.value) imageObserver.observe(imageSentinel.value)
  }
}
onBeforeUnmount(() => { videoObserver?.disconnect(); imageObserver?.disconnect() })

/* ---------- 首次加载 ---------- */
onMounted(async () => {
  const stored = sessionStorage.getItem('star-detail-data')
  if (!stored) return
  const data = JSON.parse(stored) as Star
  star.value = data

  if (data.id) {
    try {
      await onlyfansStore.fetchCreatorProfile(Number(data.id))
      if (onlyfansStore.creatorProfile) {
        const c: any = onlyfansStore.creatorProfile.creator
        star.value = {
          ...star.value,
          id: c.id,
          name: c.name,
          avatar: c.avatar,
          intro: c.intro ?? star.value.intro,
          country: c.country ?? star.value.country,
          height: c.height != null ? String(c.height) : star.value.height,
          birthday: c.birth_date ?? star.value.birthday,
          cup: c.cup_size ?? star.value.cup,
          size: c.measurements ?? c.measurement ?? star.value.size,
          visits: c.visitor_count ?? star.value.visits,
          likes: c.like_count ?? star.value.likes,
          fans: c.fans_count ?? star.value.fans,
        }
      }
    } catch { /* 忽略：失败就用缓存 */ }
  }

  // 加载第一页（两类都拉一页，切 tab 无等待）
  videoPage.value = 1
  imagePage.value = 1
  await Promise.all([fetchMediaPage('video', 1), fetchMediaPage('image', 1)])

  const savedTab = sessionStorage.getItem('star-detail-tab')
  if (savedTab === 'video' || savedTab === 'image') activeTab.value = savedTab

  await nextTick()
  swiperInstance.value?.slideTo(activeTab.value === 'video' ? 0 : 1, 0)
  setupObserver(activeTab.value)
  restoreScroll(activeTab.value)
})

const videoCount = computed(() =>
  onlyfansStore.creatorProfile?.creator?.video_count ||
  totalVideo.value || 0
)

onActivated(async () => {
  const savedTab = sessionStorage.getItem('star-detail-tab')
  if (savedTab === 'video' || savedTab === 'image') activeTab.value = savedTab
  await nextTick()
  swiperInstance.value?.slideTo(activeTab.value === 'video' ? 0 : 1, 0)
  setupObserver(activeTab.value)
  await nextTick()
  restoreScroll(activeTab.value)
})

/* ---------- 交互 ---------- */
function switchTab(tab: 'video' | 'image') {
  const lastTab = activeTab.value
  saveScroll(lastTab)
  activeTab.value = tab
  sessionStorage.setItem('star-detail-tab', tab)
  swiperInstance.value?.slideTo(tab === 'video' ? 0 : 1)
  nextTick(() => {
    setupObserver(tab)
    restoreScroll(tab)
  })
}
function onSwiper(swiper: SwiperClass) { swiperInstance.value = swiper }
function onSlideChange(swiper: SwiperClass) {
  const lastTab = activeTab.value
  const newTab = swiper.activeIndex === 0 ? 'video' : 'image'
  if (lastTab !== newTab) saveScroll(lastTab)
  activeTab.value = newTab
  sessionStorage.setItem('star-detail-tab', activeTab.value)
  nextTick(() => {
    setupObserver(activeTab.value)
    restoreScroll(activeTab.value)
  })
}

function goToPlay(video: VideoItem) {
  saveScroll(activeTab.value)
  sessionStorage.setItem('return-from', 'star')
  sessionStorage.setItem('star-detail-data', JSON.stringify(star.value))
  
  // 🚀 添加埋点 - Only圈视频浏览记录
  if (video.id && userStore.uuid) {
    try {
      trackLongVideoAction({
        id: video.id,
        type: 'star', // Only圈类型
        action: 'view', // 浏览行为
        user_uuid: userStore.uuid // 用户UUID，用于写入浏览记录表
      }).catch(error => {
        console.warn('埋点失败:', error)
      })
    } catch (error) {
      console.warn('埋点异常:', error)
    }
  }
  
  // ✅ 修改：像 AcgAnime 中那样简洁地跳转到 PlayPage
  router.push({
    name: 'PlayPage',
    params: { id: video.id, source: 'star' },
    query: { type: 'star' }
  })
}
function goToImageDetail(img: ImageItem) {
  saveScroll(activeTab.value)
  sessionStorage.setItem('return-from', 'star')
  sessionStorage.setItem('last-star', JSON.stringify(star.value))
  sessionStorage.setItem('star-detail-tab', 'image')
  
  // 🚀 添加埋点 - Only圈图片浏览记录
  if (img.id && userStore.uuid) {
    try {
      trackLongVideoAction({
        id: img.id,
        type: 'star_image', // Only圈图片类型
        action: 'view', // 浏览行为
        user_uuid: userStore.uuid // 用户UUID，用于写入浏览记录表
      }).catch(error => {
        console.warn('埋点失败:', error)
      })
    } catch (error) {
      console.warn('埋点异常:', error)
    }
  }
  
  const payload = { star: { id: star.value.id, name: star.value.name, avatar: star.value.avatar }, album: { ...img } }
  router.push({ name: 'StarImageDetail', params: { data: encodeURIComponent(JSON.stringify(payload)) } })
}
function goBack() {
  saveScroll(activeTab.value)
  sessionStorage.removeItem('star-detail-scrollTop')
  router.back()
}
onBeforeRouteLeave(() => {
  saveScroll(activeTab.value)
  sessionStorage.removeItem('star-detail-scrollTop')
})
</script>

<style scoped>
.detail-wrapper {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-mask-image: linear-gradient(black 100%, black 100%);
  mask-image: linear-gradient(black 100%, black 100%);
}
.detail-wrapper::-webkit-scrollbar { display: none !important; }

.overlay { background: rgba(0, 0, 0, 0.45); padding: 4.26vw; color: #fff; position: relative; flex-shrink: 0; }
.pure-white-wrapper { background: #fff; border-radius: 5.33vw 5.33vw 0 0; margin-top: 2.66vw; flex: 1; display: flex; flex-direction: column; position: relative; }

.back-fixed { position: fixed; top: 1.6vw; left: 3.2vw; z-index: 9999; cursor: pointer; padding: 1.33vw; }
.back-fixed img { width: 6.4vw; height: 6.4vw; }
.header { display: flex; gap: 3.2vw; margin-bottom: 3.2vw; align-items: center; }
.avatar { width: 18.66vw; height: 18.66vw; border-radius: 2.13vw; object-fit: cover; }
.info { flex: 1; }
.name { font-size: 4.53vw; font-weight: bold; margin: 0 0 1.6vw; }
.meta-line { font-size: 3.2vw; opacity: 0.9; margin-bottom: 1.06vw; }
.meta-line span { margin-right: 3.2vw; }

.intro-container { margin: 2.13vw 0; padding: 2.13vw 3.2vw; background: rgba(255, 255, 255, 0.12); border-radius: 1.6vw; display: flex; align-items: center; font-size: 3.46vw; color: #fff; width: 100%; box-sizing: border-box; }
.intro-text { flex: 1; line-height: 1.4; min-width: 0; }
.intro-text.folded { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.toggle { margin-left: 1.6vw; flex-shrink: 0; display: flex; align-items: center; }
.toggle img { width: 4.26vw; height: 4.26vw; opacity: 0.9; }

.stats { display: flex; justify-content: space-around; margin-top: 2.66vw; padding-top: 2.66vw; border-top: 0.27vw solid rgba(255, 255, 255, 0.1); }
.stat { text-align: center; }
.stat .number { font-size: 4.26vw; font-weight: bold; color: #fff; }
.stat .label { font-size: 3.2vw; color: #ccc; }

.tab-wrapper { position: sticky; top: 0; z-index: 10; overflow: hidden; flex-shrink: 0; background: #fff; border-radius: 5.33vw 5.33vw 0 0; margin-top: -3.2vw; padding-top: 1.6vw; }
.tab-switch { display: flex; justify-content: space-around; background: #fff; position: relative; }
.tab-switch .tab { font-size: 4vw; font-weight: bold; color: #999; position: relative; padding: 2.66vw 0 2.13vw; cursor: pointer; }
.tab-switch .tab.active { color: #f12c2c; }
.tab-line { position: absolute; bottom: -0.26vw; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 1.6vw solid transparent; border-right: 1.6vw solid transparent; border-top: 1.6vw solid #f12c2c; }
.tab-indicator-bar { height: 2.13vw; background: #000; border-radius: 2.66vw 2.66vw 0 0; width: 21.33vw; margin: 1.6vw auto -0.53vw; }

.swiper-area { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.mySwiper { flex: 1; width: 100%; height: 100%; overflow: hidden; }
.swiper-slide { height: auto; display: flex; flex-direction: column; padding: 0 2.66vw; box-sizing: border-box; }
.video-list-content, .image-list-content { flex: 1; }

.video-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2.66vw; }

/* 卡片：改为上下布局，底部贴边 */
.video-card {
  background: rgba(240, 240, 240, 0.9);
  border-radius: 1.6vw;
  overflow: hidden;
  position: relative;
  height: 49.33vw;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
.video-thumb { position: relative; height: 29.33vw; overflow: hidden; }
.cover { width: 100%; height: 100%; object-fit: cover; border-radius: 1.06vw; }
.video-overlay { position: absolute; bottom: 1.06vw; left: 1.06vw; right: 1.06vw; display: flex; justify-content: space-between; font-size: 3.2vw; color: #fff; text-shadow: 0 0 0.8vw black; }

/* 新增：底部容器 */
.video-bottom{
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.06vw;
}
.video-title {
  font-size: 3.73vw; color: #333; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;
}
.tag {
  align-self: flex-start;
  font-size: 2.93vw; color: #fff; background: #f12c2c;
  display: inline-block; padding: 0.53vw 1.6vw; border-radius: 1.06vw;
  margin-top: 1.06vw;
}

.image-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2.66vw; }
.image-card { background: rgba(240, 240, 240, 0.9); border-radius: 1.6vw; overflow: hidden; height: 80vw; }
.image-thumb { height: 66.66vw; position: relative; }
.image { width: 100%; height: 100%; object-fit: cover; border-radius: 1.06vw; }
.image-overlay { position: absolute; bottom: 1.06vw; left: 1.06vw; right: 1.06vw; display: flex; justify-content: space-between; align-items: center; font-size: 3.2vw; color: #fff; text-shadow: 0 0 0.8vw black; padding: 0 1.06vw; }
.image-title { font-size: 3.73vw; color: #333; font-weight: normal; line-height: 1.4; margin-top: 1.6vw; padding-left: 1.06vw; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; }

.loading-tip { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #888; font-size: 3.73vw; margin: 5.33vw 0; }
.loading-icon { width: 7.46vw; height: 7.46vw; margin-bottom: 2.13vw; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.no-more-tip { text-align: center; color: #999; font-weight: bold;font-size: 3.73vw; margin: 5.33vw 0; }

.sentinel { height: 1px; width: 100%; opacity: 0; }

.views { display: flex; align-items: center; gap: 1.06vw; }
.play-icon { width: 4vw; height: 4vw; filter: drop-shadow(0 0 0.53vw #000a); }
.corner-label { position: absolute; top: 1.06vw; right: 1.06vw; display: flex; align-items: center; background: rgba(0,0,0,0.5); padding: 0.53vw 1.06vw; border-radius: 1.06vw; font-size: 3.2vw; color: #fff; }
.corner-icon { width: 3.73vw; height: 3.73vw; margin-right: 0.53vw; }
.image-overlay .views, .image-overlay .count { display: flex; align-items: center; gap: 1.06vw; }

/* 右下角时长更清晰 */
.video-thumb::after {
  content: "";
  position: absolute; left: 0; right: 0; bottom: 0;
  height: 18%;
  background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.45) 100%);
  pointer-events: none;
}
.video-overlay .duration {
  display: inline-flex; align-items: center;
  padding: 0.4vw 1.2vw; border-radius: 1.2vw;
  background: rgba(0,0,0,.6);
  line-height: 1; font-size: 3.2vw; color: #fff; white-space: nowrap;
}

/* 保险：小图标不被全局样式拉伸 */
.detail-wrapper .video-overlay img,
.detail-wrapper .image-overlay img,
.detail-wrapper .corner-label img {
  object-fit: contain !important;
}
</style>
