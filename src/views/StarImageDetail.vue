<template>
  <div class="image-detail-wrapper">
    <!-- ✅ 顶部固定 -->
    <div class="top-bar">
      <div class="left">
        <img src="/icons/back.svg" class="back-icon" @click="goBack" />
        <img v-lazy="star.avatar" class="avatar" />
        <div class="name">{{ star.name }}</div>
      </div>
    </div>

    <!-- ✅ 滚动主体部分 -->
    <div class="scroll-content" ref="scrollRef" @scroll="onScroll">
      <!-- 图集标题 -->
      <div class="album-title">{{ album.title }}</div>

      <!-- 图集内容 -->
      <div class="image-grid">
        <img
          v-for="(img, index) in displayImages"
          :key="index"
          v-lazy="img"
          class="image"
          @click="goToFullView(index)"
        />
      </div>

      <!-- 加载状态 -->
      <div class="loading-tip" v-if="isLoading">
        <img src="/icons/loading.svg" class="loading-icon" />
        <span>客官别走，妾身马上就好~</span>
      </div>

      <div class="no-more-tip" v-if="noMore">
        客官，妾身被你弄高潮了，扛不住了~
      </div>

      <!-- ✅ 分页观察哨兵 -->
      <div ref="sentinel" class="sentinel"></div>
    </div>

    <!-- ✅ 底部按钮 -->
    <div class="bottom-bar">
      <div class="icon-btn" @click="toggleLike">
        <img :src="liked ? '/icons/dianzan5.svg' : '/icons/like1.svg'" />
        <!-- ✅ 使用格式化后的点赞数 -->
        <span>{{ formattedLikeCount }}</span>
      </div>
      <div class="icon-btn" @click="toggleCollect">
        <img :src="collected ? '/icons/star7.svg' : '/icons/star.svg'" />
        <!-- ✅ 使用格式化后的收藏数 -->
        <span>{{ formattedStarCount }}</span>
      </div>
      <div class="icon-btn" @click="goToPromotionShare">
        <img src="/icons/share2.svg" />
        <span>分享</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useOnlyfansH5Store } from '@/store/onlyfansH5'
import { showToast } from 'vant'
import { likeContent, unlikeContent, collectContent, uncollectContent, getActionStatus } from '@/api/userAction.api'

interface Album {
  id?: string | number
  title?: string
  cover?: string
  images?: string[]
}

interface Star {
  id?: string | number
  name?: string
  avatar?: string
}

const route = useRoute()
const router = useRouter()
const historyStore = useHistoryStore()
const onlyfansStore = useOnlyfansH5Store()

// 解析数据
const data = computed<{ album?: Album; star?: Star; likes?: number; favs?: number }>(() => {
  const encodedData = route.params.data as string | undefined

  if (encodedData) {
    try {
      const decodedData = decodeURIComponent(encodedData)
      return JSON.parse(decodedData)
    } catch (e) {
      console.error('Failed to parse JSON from route:', e)
    }
  }

  if (route.query.fromHistory === '1' && route.query.fullData) {
    try {
      return JSON.parse(decodeURIComponent(String(route.query.fullData)))
    } catch (e) {
      console.error('Failed to parse JSON from query:', e)
    }
  }

  return {}
})

// 状态
const liked = ref(false)
const collected = ref(false)
const star = computed<Star>(() => data.value.star || {})
const album = computed<Album>(() => data.value.album || { images: [] })

// ✅ 使用 store 的图片数据
const displayImages = computed(() => onlyfansStore.mediaImageUrls)
const isLoading = computed(() => onlyfansStore.mediaImageLoading)
const noMore = computed(() => onlyfansStore.mediaImageNoMore)

// 滚动和观察者相关
const scrollRef = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

// ✅ 设置观察者，监听滚动到底部
function setupObserver() {
  if (observer) observer.disconnect()
  
  observer = new IntersectionObserver(async (entries) => {
    if (!entries[0].isIntersecting || isLoading.value || noMore.value) return
    
    // 暂时取消观察，避免重复触发
    if (sentinel.value) {
      observer!.unobserve(sentinel.value)
    }
    
    try {
      await loadMoreImages()
    } catch (error) {
      console.error('加载更多图片失败:', error)
    }
    
    // 重新观察
    await nextTick()
    if (sentinel.value && !noMore.value) {
      observer!.observe(sentinel.value)
    }
  }, { 
    root: scrollRef.value || null, 
    threshold: 0.1 
  })
  
  if (sentinel.value && !noMore.value) {
    observer.observe(sentinel.value)
  }
}

// ✅ 加载更多图片
async function loadMoreImages() {
  if (!album.value.id) return

  try {
    await onlyfansStore.loadMoreMediaImages(Number(album.value.id))
  } catch (error) {
    console.error('加载更多图片失败:', error)
    throw error
  }
}

// ✅ 初始化用户操作状态
async function initUserActionStatus() {
  if (!album.value.id) return
  
  try {
    const albumId = Number(album.value.id)
    const result = await getActionStatus(albumId, 'star_image')
    
    // 适应多种返回格式
    let userData = null
    if (result && result.code === 0 && result.data) {
      // 标准格式: {code: 0, msg: "ok", data: {liked: true, collected: true}}
      userData = result.data
    } else if (result && typeof result.liked !== 'undefined' && typeof result.collected !== 'undefined') {
      // 直接格式: {liked: true, collected: true}
      userData = result
    }
    
    if (userData) {
      liked.value = userData.liked || false
      collected.value = userData.collected || false
    }
  } catch (error) {
    // 失败时保持默认值（false）
  }
}

// ✅ 初始化图片数据
async function initializeImages() {
  if (!album.value.id) return

  try {
    // 重置图片状态
    onlyfansStore.resetMediaImages()
    
    // 获取第一页图片
    await onlyfansStore.fetchMediaImages(Number(album.value.id), {
      page: 1,
      page_size: 12,
      force: true
    })
  } catch (error) {
    console.error('初始化图片数据失败:', error)
  }
}

// 兼容性处理：如果没有 album.id 或 store 中没有数据，使用传入的 images
const fallbackImages = computed(() => {
  if (displayImages.value.length > 0) {
    return displayImages.value
  }
  return album.value.images || []
})

const finalDisplayImages = computed(() => {
  return displayImages.value.length > 0 ? displayImages.value : fallbackImages.value
})

// 滚动监听（兼容旧版本的滚动加载）
function onScroll() {
  // 如果使用 store 数据且有观察者，就不需要滚动监听
  if (displayImages.value.length > 0 && observer) return
  
  // 兼容旧版本：使用滚动监听
  const el = scrollRef.value
  if (!el) return

  const scrollBottom = el.scrollTop + el.clientHeight
  if (scrollBottom + 50 >= el.scrollHeight && !isLoading.value && !noMore.value) {
    loadMoreImages()
  }
}

// 清理观察者
onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
})

const formatWk = (num: number | string | undefined): string => {
  if (typeof num === 'string' && /[wkWK]$/.test(num)) return num
  const n = Number(num)
  if (isNaN(n) || n === 0) return '0.00'
  if (n >= 10000) return (n / 10000).toFixed(2) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(2) + 'k'
  return n.toFixed(2)
}

const formattedLikeCount = computed(() => {
  const storeData = onlyfansStore.mediaImages.pagination
  const count = typeof storeData.like_count === 'number' 
    ? storeData.like_count 
    : (data.value.likes || 0)
  return formatWk(count)
})

const formattedStarCount = computed(() => {
  const storeData = onlyfansStore.mediaImages.pagination
  const count = typeof storeData.favorite_count === 'number' 
    ? storeData.favorite_count 
    : (data.value.favs || 0)
  return formatWk(count)
})

// 保留原有的数值计算属性（用于数据操作）
const likeCount = computed(() => {
  const storeData = onlyfansStore.mediaImages.pagination
  if (typeof storeData.like_count === 'number') {
    return storeData.like_count
  }
  return data.value.likes || 0
})

const starCount = computed(() => {
  const storeData = onlyfansStore.mediaImages.pagination
  if (typeof storeData.favorite_count === 'number') {
    return storeData.favorite_count
  }
  return data.value.favs || 0
})

// ✅ 添加：获取分页信息用于调试
const pageInfo = computed(() => {
  const pagination = onlyfansStore.mediaImages.pagination
  return {
    total: pagination.total,
    page: pagination.page,
    page_size: pagination.page_size,
    has_more: pagination.has_more,
    like_count: pagination.like_count,
    favorite_count: pagination.favorite_count
  }
})

onMounted(async () => {
  // 初始化图片数据
  await initializeImages()
  
  // 等待一个 tick 确保数据加载完成
  await nextTick()
  
  // 初始化用户操作状态（点赞和收藏）
  await initUserActionStatus()
  
  // 设置观察者
  await nextTick()
  setupObserver()

  // 添加历史记录
  historyStore.addRecord({
    id: String(album.value.id ?? album.value.title ?? 'unknown'),
    type: 'only_img',
    time: new Date().toISOString(),
    data: {
      album: album.value,
      star: star.value,
      cover: album.value.cover || finalDisplayImages.value[0],
      title: album.value.title || '无标题',
      likes: likeCount.value,
      favs: starCount.value,
      index: 0
    }
  })
})

// 操作函数，调用后端API
async function toggleLike() {
  if (!album.value.id) {
    showToast('图片信息无效')
    return
  }

  try {
    const albumId = Number(album.value.id)
    const pagination = onlyfansStore.mediaImages.pagination
    
    if (liked.value) {
      // 当前已点赞，执行取消点赞
      await unlikeContent(albumId, 'star_image')
      liked.value = false
      pagination.like_count = Math.max(0, (pagination.like_count || 0) - 1)
      showToast('取消点赞')
    } else {
      // 当前未点赞，执行点赞
      await likeContent(albumId, 'star_image')
      liked.value = true
      pagination.like_count = (pagination.like_count || 0) + 1
      showToast('点赞成功')
    }
  } catch (error) {
    console.error('点赞操作失败:', error)
    showToast('操作失败，请稍后重试')
  }
}

async function toggleCollect() {
  if (!album.value.id) {
    showToast('图片信息无效')
    return
  }

  try {
    const albumId = Number(album.value.id)
    const pagination = onlyfansStore.mediaImages.pagination
    
    if (collected.value) {
      // 当前已收藏，执行取消收藏
      await uncollectContent(albumId, 'star_image')
      collected.value = false
      pagination.favorite_count = Math.max(0, (pagination.favorite_count || 0) - 1)
      showToast('取消收藏')
    } else {
      // 当前未收藏，执行收藏
      await collectContent(albumId, 'star_image')
      collected.value = true
      pagination.favorite_count = (pagination.favorite_count || 0) + 1
      showToast('收藏成功')
    }
  } catch (error) {
    console.error('收藏操作失败:', error)
    showToast('操作失败，请稍后重试')
  }
}

function goBack() {
  router.back()
}

function goToFullView(index: number) {
  const payload = {
    album: album.value,
    star: star.value,
    likes: likeCount.value,
    favs: starCount.value,
    index,
    images: finalDisplayImages.value // 传递当前所有图片
  }

  router.push({
    name: 'FullImageViewer',
    params: { data: encodeURIComponent(JSON.stringify(payload)) }
  })
}

function goToPromotionShare() {
  router.push({ name: 'PromotionShare' })
}
</script>

<style scoped>
.image-detail-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
}

.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 13.33vw;
  display: flex;
  align-items: center;
  background: #fff;
  padding: 3.2vw;
  z-index: 999;
}

.left {
  display: flex;
  align-items: center;
}

.back-icon {
  width: 5.86vw;
  height: 5.86vw;
  margin-right: 2.66vw;
}

.avatar {
  width: 10.66vw;
  height: 10.66vw;
  border-radius: 50%;
  object-fit: cover;
  margin-left: 3.2vw;
}

.name {
  margin-left: 4.8vw;
  font-weight: bold;
  font-size: 5.06vw;
  color: #000000a9;
}

.scroll-content {
  flex: 1;
  overflow-y: auto;
  margin-top: 13.33vw;
  padding-bottom: 16vw;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-mask-image: linear-gradient(black 100%, black 100%);
  mask-image: linear-gradient(black 100%, black 100%);
  -webkit-overflow-scrolling: touch;
}

.scroll-content::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
}

.album-title {
  font-weight: bold;
  font-size: 4.8vw;
  margin: 1.6vw 4.26vw 0;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-grid {
  padding: 2.66vw;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.6vw;
}

.image {
  width: 100%;
  height: 30vw;
  object-fit: cover;
  border-radius: 1.6vw;
  cursor: pointer;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 13.86vw;
  background: #fff;
  border-top: 0.27vw solid #eee;
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.icon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 3.2vw;
  color: #333;
}

.icon-btn img {
  width: 5.33vw;
  height: 5.33vw;
  margin-bottom: 1.06vw;
}

.loading-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #888;
  font-size: 3.73vw;
  margin: 5.33vw 0;
}

.loading-icon {
  width: 7.46vw;
  height: 7.46vw;
  margin-bottom: 2.13vw;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.no-more-tip {
  text-align: center;
  color: #999;
  font-size: 3.73vw;
  margin: 5.33vw 0;
}

/* ✅ 新增：观察哨兵样式 */
.sentinel {
  height: 1px;
  width: 100%;
  margin: 2vw 0;
}
</style>
