<template>
  <van-sticky :offset-top="0">
    <div class="sticky-bar">
      <!-- 顶部栏+筛选栏 -->
      <van-nav-bar
        title="所有分类"
        left-arrow
        @click-left="$router.back()"
        placeholder
      >
        <template #right>
          <div class="topbar-more" @click="showAllTags = true">
            标签
            <van-icon name="arrow-down" />
          </div>
        </template>
      </van-nav-bar>
      <div class="filter-container">
        <div class="filter-row">
          <span class="filter-label">标签</span>
          <div class="filter-scroll">
            <div
              class="filter-item"
              v-for="(tag, index) in hotTags"
              :key="index"
              :class="{ active: activeTag === tag }"
              @click="selectTag(tag)"
            >
              {{ tag }}
            </div>
          </div>
        </div>
        <div class="filter-row">
          <span class="filter-label">排序</span>
          <div class="filter-scroll">
            <!-- 排序 -->
            <div
              class="filter-item"
              v-for="(order, index) in orders"
              :key="index"
              :class="{ active: activeOrder === order }"
              @click="onOrderChange(order)"
            >
              {{ order }}
            </div>
          </div>
        </div>
        <div class="filter-row">
          <span class="filter-label">价格</span>
          <div class="filter-scroll">
            <!-- 价格 -->
            <div
              class="filter-item"
              v-for="(price, index) in prices"
              :key="index"
              :class="{ active: activePrice === price }"
              @click="onPriceChange(price)"
            >
              {{ price }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </van-sticky>
  <div class="all-categories">
    <!-- 首次加载/筛选时 loading -->
    <div v-if="!hasLoaded && isLoading" class="loading-tip">
      <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
      <div class="loading-text">客官别走，妾身马上就好~</div>
    </div>
    <!-- 卡片区域 -->
    <div v-show="hasLoaded" class="card-list">
      <div
        class="video-card"
        v-for="(video, idx) in visibleList"
        :key="video.id + '-' + idx"
        @click="goToPlay(video)"
      >
        <div class="cover-wrapper">
          <CardCornerIcon
            :isVip="video.priceType === 'VIP'"
            :coinAmount="video.priceType === '金币' ? video.coinAmount || 0 : 0"
          />
          <img :src="video.cover" class="card-img" />
          <div class="meta">
            <div class="views">
              <img src="/icons/play4.svg" class="play-icon" />
              {{ (video.views / 10000).toFixed(1) }}w
            </div>
            <div class="duration">{{ formatDuration(video.duration) }}</div>
          </div>
        </div>
        <div class="card-title">{{ video.title }}</div>
        <div class="card-tag">{{ video.tags?.[0] || '' }}</div>
      </div>
      <div v-if="hasLoaded && !isLoading && visibleList.length === 0" class="no-data-tip">
        暂无相关视频
      </div>
    </div>
    <!-- 懒加载分页 loading，只在分页加载时出现 -->
    <div v-if="hasLoaded && isLoading" class="loading-tip">
      <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
      <div class="loading-text">客官别走，妾身马上就好~</div>
    </div>
    <div v-if="noMore && visibleList.length > 0" class="no-more-text">
      客官，妾身被你弄高潮了，扛不住了 ~
    </div>
    <div ref="sentinel" class="load-more-trigger"></div>

    <!-- 所有标签弹窗 -->
    <van-popup v-model:show="showAllTags" position="bottom" round>
      <div class="popup-content">
        <div class="popup-title">全部标签</div>
        <div class="popup-tags">
          <div
            class="popup-tag"
            v-for="tag in tags"
            :key="tag"
            :class="{ active: activeTag === tag }"
            @click="selectTag(tag)"
          >
            {{ tag }}
          </div>
        </div>
      </div>
    </van-popup>
   
  </div>
</template>

<script setup lang="ts">
import CardCornerIcon from './CardCornerIcon.vue'
import { ref, computed, onMounted, onUnmounted, nextTick, onActivated } from 'vue'
import { fetchH5AllLongVideos } from '@/api/longVideo.api'
import { useLongTagStore } from '@/store/longTagStore'
import { useRouter } from 'vue-router'

interface VideoItem {
  id: number
  cover: string
  title: string
  views: number
  duration: number
  collects: number
  tags: string[]
  priceType: string
}

// 状态管理
const tags = ref<string[]>([])
const hotTags = computed(() => tags.value.slice(0, 8)) // 只显示前8个标签
const visibleList = ref<VideoItem[]>([])
const isLoading = ref(false)
const noMore = ref(false)
const sentinel = ref<HTMLElement | null>(null)
const page = ref(1)
const pageSize = 20
let loadingLock = false

// 筛选条件
const orders = ref(['最多观看', '最多收藏', '最新上架'])
const prices = ref(['全部类型', '免费', 'VIP', '金币'])
const activeTag = ref('全部标签')
const activeOrder = ref('最多观看')
const activePrice = ref('全部类型')
const showAllTags = ref(false)
const hasLoaded = ref(false)
const scrollTop = ref(0)

function goToPlay(video: VideoItem) {
  // 记录实际滚动容器的 scrollTop
  const wrapper = document.querySelector('.scroll-wrapper')
  if (wrapper) {
    scrollTop.value = wrapper.scrollTop
  }
  router.push(`/play/${video.id}`)
}

onActivated(() => {
  nextTick(() => {
    const wrapper = document.querySelector('.scroll-wrapper')
    if (wrapper) {
      wrapper.scrollTop = scrollTop.value || 0
    }
  })
  initObserver()
})

// 初始化
onMounted(async () => {
  const longTagStore = useLongTagStore()
  await longTagStore.loadTags()
  const sortedTags = (longTagStore.tags || []).slice().sort((a, b) => a.sort - b.sort)
  tags.value = sortedTags.map(t => t.name)
  // 只在首次进入时拉数据
  if (!hasLoaded.value) {
    await loadVideos(true)
    hasLoaded.value = true
  }
  initObserver()
})

function getCache(key: string) {
  const cacheStr = localStorage.getItem('videoCache')
  if (!cacheStr) return undefined
  const cache = JSON.parse(cacheStr)
  return cache[key]
}

function setCache(key: string, data: any) {
  const MAX_CACHE = 50
  let cache = {}
  const cacheStr = localStorage.getItem('videoCache')
  if (cacheStr) cache = JSON.parse(cacheStr)
  cache[key] = data
  // 控制缓存数量
  const keys = Object.keys(cache)
  if (keys.length > MAX_CACHE) {
    delete cache[keys[0]]
  }
  localStorage.setItem('videoCache', JSON.stringify(cache))
}

// 核心数据加载
async function loadVideos(reset = false) {
  if (loadingLock) return;
  loadingLock = true;

  if (reset) {
    page.value = 1;
    visibleList.value = [];
    noMore.value = false;
    hasLoaded.value = false; // 重置加载状态
  }

  isLoading.value = true;
  try {
    // 关键：每种筛选条件都生成唯一 key
    const params = {
      page: page.value,
      pageSize,
      sort: activeOrder.value,
      priceType: activePrice.value,
      tag: activeTag.value
    }
    const cacheKey = JSON.stringify(params)
    let res = getCache(cacheKey)
    if (!res) {
      res = await fetchH5AllLongVideos({
        page: page.value,
        pageSize,
        sort: activeOrder.value === '最多观看' ? 'play' : 
              activeOrder.value === '最多收藏' ? 'collect' : 'new',
        priceType: activePrice.value === 'VIP' ? 'VIP' :
                  activePrice.value === '金币' ? '金币' :
                  activePrice.value === '免费' ? '免费' : undefined,
        tag: activeTag.value !== '全部标签' ? activeTag.value : undefined
      });
      setCache(cacheKey, res)
    }

    const newVideos = (res.list || []).map(item => ({
      id: item.id,
      cover: item.cover_url,
      title: item.title,
      views: item.play,
      duration: item.duration,
      collects: item.collect,
      tags: item.tags || [],
      priceType: item.coin > 0 ? '金币' : item.vip ? 'VIP' : 'free',
      coinAmount: item.coin || 0
    }));

    visibleList.value = [...visibleList.value, ...newVideos];
    page.value++;
    if (newVideos.length < pageSize) {
      noMore.value = true;
    }
  } finally {
    isLoading.value = false;
    loadingLock = false;
    hasLoaded.value = true; // 接口回来的时候才设置 true
  }
}

// 修复后的懒加载观察器
let observer: IntersectionObserver | null = null;

function initObserver() {
  if (!sentinel.value || noMore.value) return;

  if (observer) {
    observer.disconnect();
  }

  observer = new IntersectionObserver(
    (entries) => {
      // 增加 noMore 判断
      if (entries[0].isIntersecting && !isLoading.value && !noMore.value) {
        loadVideos();
      }
    },
    {
      root: null,
      rootMargin: '400px',
      threshold: 0.1
    }
  );

  observer.observe(sentinel.value);
}

function destroyObserver() {
  observer?.disconnect();
  observer = null;
}

// 筛选处理
async function handleFilterChange() {
  destroyObserver();
  await loadVideos(true);
  initObserver();
}

// 事件处理
async function onOrderChange(order: string) {
  if (activeOrder.value === order) return;
  activeOrder.value = order;
  await handleFilterChange();
}

async function onPriceChange(price: string) {
  if (activePrice.value === price) return;
  activePrice.value = price;
  await handleFilterChange();
}

async function selectTag(tag: string) {
  activeTag.value = activeTag.value === tag ? '全部标签' : tag;
  showAllTags.value = false;
  await handleFilterChange();
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00';
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  const minStr = min < 10 ? '0' + min : '' + min;
  const secStr = sec < 10 ? '0' + sec : '' + sec;
  return `${minStr}:${secStr}`;
}

const router = useRouter()






onUnmounted(() => {
  destroyObserver();
});
</script>

<style scoped>

.van-sticky,
.van-sticky--fixed {
  /* 不设置 height/min-height，让内容自适应 */
}

.filter-container {
  margin-top: 0 !important;
  padding-top: 0 !important;
}

::v-deep(.van-nav-bar) {
  border-bottom: none !important;
  box-shadow: none !important;
  margin-bottom: 0 !important;
}

.all-categories {
  background: #fff;
}
.filter-container {
  background: #fff;
  border-bottom: 0.26vw solid #eee;
}

.filter-row {
  display: flex;
  align-items: center;
  padding: 2.1vw 3.2vw;
}
.filter-label {
  flex: 0 0 auto;
  font-weight: bold;
  margin-right: 2.1vw;
}
.filter-scroll {
  display: flex;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  flex: 1;
}
.filter-scroll::-webkit-scrollbar {
  display: none;
}
.filter-item {
  flex: 0 0 auto;
  padding: 1vw 2.6vw;
  background: #eee;
  border-radius: 3.2vw;
  margin-right: 2.1vw;
  white-space: nowrap;
  cursor: pointer;
  transition: 0.2s;
  font-size: 3.2vw;
}
.filter-item.active {
  background: #f12c2c;
  color: white;
}
.topbar-more {
  padding: 1vw 2.6vw;
  background: #eee;
  border-radius: 3.2vw;
  font-size: 3.2vw;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.topbar-more .van-icon {
  font-size: 3.2vw;
  margin-left: 1vw;
}

/* 卡片 */
.card-list {
  display: flex;
  flex-wrap: wrap;
  padding: 2.1vw;
}
.video-card {
  width: 48%;
  background: rgb(240, 240, 240);
  margin: 1%;
  border-radius: 1.6vw;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.cover-wrapper {
  position: relative;
}
.card-img {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
  display: block;
  background: #f2f2f2;
}
.meta {
  position: absolute;
  bottom: 0.5vw;
  left: 1vw;
  right: 2vw;
  display: flex;
  justify-content: space-between;
  font-size: 2.8vw;
  color: #fff;
  text-shadow: 0 0 0.8vw rgba(0,0,0,0.7);
}

.views,
.duration {
  display: flex;
  align-items: center;
  gap: 1vw;
  font-size: 2.8vw;
}

.play-icon {
  width: 4vw;
  height: 4vw;
}

.card-title {
  font-size: 3.6vw;
  font-weight: bold;
  margin: 1vw 0 0 0;
  padding: 0 1vw;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}
.card-tag {
  font-size: 3.2vw;
  color: #fff;
  background: #f12c2c;
  border-radius: 1vw;
  padding: 0.5vw 2.6vw;
  margin: 1vw 0 1vw 1vw;
  align-self: flex-start;
}

/* 懒加载提示 */
.loading-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5.3vw 0;
  font-size: 3.6vw;
}
.custom-spinner {
  width: 9.3vw;
  height: 9.3vw;
  margin-bottom: 2vw;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.loading-text {
  color: #ff5f5f;
  font-weight: 500;
}
.no-more-text {
  text-align: center;
  color: #999;
  font-size: 3.6vw;
  margin: 5.3vw 0;
}
.load-more-trigger {
  height: 1px;
  margin-top: 0;
}

/* 弹窗 */
.popup-content {
  padding: 4.3vw;
}
.popup-title {
  font-weight: bold;
  margin-bottom: 3.2vw;
  text-align: center;
  font-size: 4vw;
}
.popup-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 2.1vw;
}
.popup-tag {
  padding: 1.5vw 3.2vw;
  background: #eee;
  border-radius: 1vw;
  cursor: pointer;
  font-size: 3.6vw;
}
.popup-tag.active {
  background: #f12c2c;
  color: #fff;
}

/* 顶部bar样式 */
::v-deep(.van-nav-bar__title) {
  font-size: 5vw !important;
  font-weight: bold !important;
  color: #333 !important;
}
::v-deep(.van-icon-arrow-left) {
  font-size: 6.9vw !important;
  color: #333 !important;
}
.no-data-tip {
  text-align: center;
  color: #999;
  font-size: 3.6vw;
  margin: 10vw 0;
}

.sticky-bar {
  background: #fff;
  box-sizing: border-box;
  z-index: 10;
  overflow: hidden;
}
</style>