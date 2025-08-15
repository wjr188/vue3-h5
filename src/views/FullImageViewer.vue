<template>
  <div class="full-image-viewer">
    <!-- 顶部标题栏 -->
    <div class="top-bar">
      <img src="/icons/back.svg" class="back-icon" @click="goBack" />
      <div class="title">{{ album.title }}</div>
    </div>

    <!-- 图片滑动区域 -->
    <div class="image-swiper" @scroll.passive="onScroll" ref="scrollContainer">
      <div
        v-for="(img, index) in displayImages"
        :key="index"
        class="image-wrapper"
        :class="{ locked: index > 1 && !isVip }"
      >
        <img v-lazy="img" class="full-image" />
        <!-- ✅ 前端VIP限制：前2张免费，后面需要VIP -->
        <div class="lock-overlay" v-if="index > 1 && !isVip">
          <div class="vip-button" @click.stop="showModal = true">
            开通VIP观看完整图集
          </div>
        </div>
      </div>
      
      <!-- loading部分 -->
      <div class="loading-tip" v-if="isLoading">
        <img src="/icons/loading.svg" class="loading-icon" />
        客官别走，妾身马上就好~
      </div>

      <div class="end-tip" v-if="!isLoading && noMore">
        客官，妾身被你弄高潮了，扛不住了 ~
      </div>
    </div>

    <!-- 弹窗 -->
    <div v-if="showModal" class="modal-mask" @click.self="showModal = false">
      <div class="modal-box">
        <div class="modal-title">VIP专享内容</div>
        <div class="modal-text">
          开通VIP可无限观看色图<br />
          还有{{ lockedCount }}张图片需要VIP解锁<br />
          邀请好友注册立刻送3天VIP
        </div>
        <div class="modal-actions">
          <button class="btn orange" @click="goToPromotionShare">邀请好友</button>
          <button class="btn red" @click="goToVip">开通会员</button>
        </div>
      </div>
    </div>

    <!-- 底部栏 -->
    <div class="bottom-bar">
      <div class="icon-btn">
        <img src="/icons/like1.svg" />
        <span>{{ formattedLikeCount }}</span>
      </div>
      <div class="icon-btn">
        <img src="/icons/star.svg" />
        <span>{{ formattedStarCount }}</span>
      </div>
      <div class="icon-btn" @click="goToPromotionShare">
        <img src="/icons/share2.svg" />
        <span>分享</span>
      </div>

      <div class="index-text">{{ currentIndex + 1 }}/{{ totalImages }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed, ref, onMounted } from 'vue'
import { useOnlyfansH5Store } from '@/store/onlyfansH5'
import { useUserStore } from '@/store/user' // ✅ 引入 user store

const route = useRoute()
const router = useRouter()
const onlyfansStore = useOnlyfansH5Store()
const userStore = useUserStore() // ✅ 使用 user store

interface Album {
  id?: string | number
  title?: string
  images?: string[]
}

interface Star {
  id?: string | number
  name?: string
  avatar?: string
}

interface Data {
  album: Album
  star?: Star
  likes?: number
  favs?: number
  index?: number
  images?: string[] // 从 StarImageDetail 传递过来的图片列表
}

const data = computed<Data>(() => {
  try {
    return route.params.data ? JSON.parse(decodeURIComponent(route.params.data as string)) : { album: {} }
  } catch (error) {
    console.error('Error parsing data:', error)
    return { album: {} }
  }
})

const album = computed<Album>(() => data.value.album || {})
const star = computed<Star>(() => data.value.star || {})
const showModal = ref(false)
const currentIndex = ref<number>(data.value.index || 0)
const scrollContainer = ref<HTMLDivElement | null>(null)

// ✅ 使用 store 数据或传递的 images 数据
const displayImages = computed(() => {
  // 优先使用传递过来的图片数据
  if (data.value.images && data.value.images.length > 0) {
    return data.value.images
  }
  // 回退使用 store 中的数据
  if (onlyfansStore.mediaImageUrls.length > 0) {
    return onlyfansStore.mediaImageUrls
  }
  // 最后回退使用 album.images
  return album.value.images || []
})

const isLoading = computed(() => onlyfansStore.mediaImageLoading)
const noMore = computed(() => onlyfansStore.mediaImageNoMore)

// ✅ 从 user store 获取真实的 VIP 状态
const isVip = computed(() => userStore.isVIP)

// ✅ 计算锁定的图片数量
const lockedCount = computed(() => {
  if (isVip.value) return 0 // VIP用户没有锁定图片
  const total = displayImages.value.length
  return Math.max(0, total - 2) // 前2张免费，其余需要VIP
})

const totalImages = computed(() => displayImages.value.length)

// ✅ 格式化数字显示
const formatWk = (num: number | undefined): string => {
  if (!num) return '0.00'
  if (num >= 10000) return (num / 10000).toFixed(2) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(2) + 'k'
  return num.toFixed(2)
}

// ✅ 格式化点赞收藏数
const formattedLikeCount = computed(() => {
  const storeCount = onlyfansStore.mediaImages.pagination.like_count
  const count = typeof storeCount === 'number' ? storeCount : (data.value.likes || 0)
  return formatWk(count)
})

const formattedStarCount = computed(() => {
  const storeCount = onlyfansStore.mediaImages.pagination.favorite_count
  const count = typeof storeCount === 'number' ? storeCount : (data.value.favs || 0)
  return formatWk(count)
})

function onScroll() {
  const container = scrollContainer.value
  if (!container || !displayImages.value.length) return
  
  const perImgHeight = container.scrollHeight / displayImages.value.length
  const newIndex = Math.floor(container.scrollTop / perImgHeight)
  currentIndex.value = Math.max(0, Math.min(newIndex, displayImages.value.length - 1))
}

function goBack() {
  router.back()
}

function goToVip() {
  router.push({ name: 'Vip' })
}

function goToPromotionShare() {
  router.push({ name: 'PromotionShare' })
}

// ✅ 在组件初始化时确保用户信息已加载
onMounted(async () => {
  // 确保用户信息已加载
  if (!userStore.userInfoLoaded) {
    try {
      await userStore.fetchUserInfo()
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }

  console.log('📱 FullImageViewer 初始化:', {
    album_id: album.value.id,
    图片数量: displayImages.value.length,
    当前索引: currentIndex.value,
    VIP状态: isVip.value,
    VIP过期时间: userStore.vipExpireTime,
    锁定数量: lockedCount.value
  })
  
  // 如果有初始索引，滚动到对应位置
  if (data.value.index && scrollContainer.value) {
    const targetTop = (data.value.index * scrollContainer.value.scrollHeight) / displayImages.value.length
    scrollContainer.value.scrollTo({ top: targetTop, behavior: 'smooth' })
  }
})
</script>

<!-- 样式保持不变 -->
<style scoped>
.full-image-viewer {
  background: #fff;
  color: #fff;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  font-size: 4vw;
}

.top-bar {
  display: flex;
  align-items: center;
  background: #fff;
  color: #000;
  height: 13vw;
  padding: 0 3vw;
  position: sticky;
  top: 0;
  z-index: 10;
  font-size: 4vw;
  font-weight: bold;
}

.back-icon {
  width: 5vw;
  height: 5vw;
  margin-right: 2vw;
}

.title {
  flex: 1;
  text-align: center;
  font-size: 4.3vw;
  font-weight: bold;
  margin-right: 8vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-swiper {
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-mask-image: linear-gradient(black 100%, black 100%);
  mask-image: linear-gradient(black 100%, black 100%);
  padding-bottom: 3vw;
}

.image-swiper::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
}

.image-wrapper {
  position: relative;
}

.full-image {
  width: 100vw;
  display: block;
  object-fit: contain;
}

.lock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  backdrop-filter: blur(2vw);
  display: flex;
  justify-content: center;
  align-items: center;
}

.vip-button {
  background: #d80000;
  color: #fff;
  padding: 2vw 6vw;
  border-radius: 10vw;
  font-size: 3.7vw;
  font-weight: bold;
  box-shadow: 0 0.8vw 2.4vw rgba(0,0,0,0.16);
}

.bottom-bar {
  height: 13vw;
  background: #fff;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  color: #333;
  font-size: 3vw;
  border-top: 0.3vw solid #eee;
  padding-left: 5vw;
  gap: 8vw;
}

.icon-btn {
  display: flex;
  align-items: center;
  gap: 2vw;
}

.icon-btn img {
  width: 4.5vw;
  height: 4.5vw;
}

.index-text {
  margin-left: auto;
  margin-right: 4vw;
  color: #999;
  font-size: 3.5vw;
}

.loading-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #aaa;
  font-size: 3.2vw;
  margin: 5vw 0;
}

.loading-icon {
  width: 7vw;
  height: 7vw;
  margin-bottom: 2vw;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0); }
  100% { transform: rotate(360deg); }
}

.end-tip {
  text-align: center;
  color: #888;
  font-size: 3.4vw;
  margin: 7vw 0 12vw;
}

/* 弹窗样式 */
.modal-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.modal-box {
  background: #fff;
  border-radius: 4vw;
  padding: 5vw 0;
  width: 82vw;
  max-width: 92vw;
  text-align: center;
  box-shadow: 0 2vw 4vw rgba(0,0,0,0.15);
}

.modal-title {
  font-size: 5vw;
  font-weight: bold;
  color: #333;
  margin-bottom: 3vw;
}

.modal-text {
  font-size: 4vw;
  color: #333;
  margin-bottom: 5vw;
  line-height: 1.6;
  font-weight: normal;
  white-space: pre-line;
  text-align: center;
}

.modal-actions {
  display: flex;
  justify-content: space-around;
  gap: 3vw;
}

.btn {
  padding: 2vw 6vw;
  font-size: 4vw;
  border: none;
  border-radius: 2vw;
  cursor: pointer;
  transition: background 0.3s;
}

.orange {
  background-color: #FFA500;
  color: white;
}

.orange:hover {
  background-color: #FF7F00;
}

.red {
  background: linear-gradient(45deg, #FF416C, #FF4B2B);
  color: white;
}

.red:hover {
  background: linear-gradient(45deg, #FF5E6C, #FF5733);
}
</style>
