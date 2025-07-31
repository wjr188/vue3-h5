<template>
  <div class="limited-free-page">
    <!-- 吸顶导航 -->
    <van-nav-bar
      fixed
      safe-area-inset-top
      title="限免专区"
      left-arrow
      @click-left="onBack"
    />

    <!-- 卡片列表 + 懒加载容器 -->
    <div class="swipe-content">
      <div class="card-list">
        <div
          class="video-card"
          v-for="item in videoList"
          :key="item.id"
        >
          <div class="thumb-wrap">
            <img v-lazy="item.cover" class="cover" alt="" />
            <div class="video-info-bar">
              <span class="views">
                <img src="/icons/play4.svg" class="play-icon" />
                {{ formatViews(item.views) }}
              </span>
              <span class="duration">{{ item.duration }}</span>
            </div>
          </div>
          <div class="desc-box">
            <div class="video-title">{{ item.title }}</div>
            <div class="card-bottom">
              <span
                class="tag"
                v-if="item.tags && item.tags.length"
              >{{ item.tags[0] }}</span>
            </div>
          </div>
        </div>
      </div>
      <!-- 懒加载触发点 -->
      <div
        v-if="hasMore && !loading"
        ref="sentinel"
        class="load-more-trigger"
      ></div>
      <!-- 加载中提示 -->
      <div v-if="loading" class="loading-tip">
        <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
        <div class="loading-text">客官别走，妾身马上就好~</div>
      </div>
      <!-- 无更多提示 -->
      <div v-if="!hasMore && videoList.length > 0" class="no-more-text">
        客官，妾身被你看光了，扛不住了~
      </div>
      <!-- 空数据提示 -->
      <div v-if="!loading && videoList.length === 0" class="empty-data-message">
        <p>暂无限免视频数据或数据加载失败...</p>
      </div>
    </div>
    <!-- SVG icons 放在这里 -->
    <svg style="display:none">
      <symbol id="icon-play" viewBox="0 0 1024 1024">
        <path fill="#fff" d="M512 0C229.23 0 0 229.23 0 512s229.23 512 512 512 512-229.23 512-512S794.77 0 512 0zm208.94 524.09L418.15 692.65c-16.4 11.3-38.15-0.13-38.15-20.56V351.91c0-20.43 21.75-31.86 38.15-20.56l302.79 168.56c16.4 11.3 16.4 29.83 0 40.18z"/>
      </symbol>
      <symbol id="icon-playcount" viewBox="0 0 1024 1024">
        <path fill="#fff" d="M128 192a64 64 0 0 1 64-64h640a64 64 0 0 1 64 64v640a64 64 0 0 1-64 64H192a64 64 0 0 1-64-64V192zm320 128v384l320-192-320-192z"/>
      </symbol>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { fetchH5LimitedFreeVideos } from '@/api/longVideo.api'

interface VideoItem {
  id: number
  cover: string
  title: string
  views: number
  duration: string
  category_id: number
  tags?: string[]
  create_time?: string
}

const router = useRouter()
function onBack(): void {
  router.back()
}

function formatViews(val: number): string {
  if (val >= 10000) {
    return (val / 10000).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') + 'w'
  } else if (val >= 1000) {
    return (val / 1000).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') + 'k'
  }
  return val?.toString() ?? '0'
}

const videoList = ref<VideoItem[]>([])
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = 20
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

async function loadList(isLoadMore = false) {
  if (loading.value) return
  loading.value = true
  try {
    const res = await fetchH5LimitedFreeVideos({ page: page.value, pageSize })
    const list = res.list || []
    if (isLoadMore) {
      videoList.value = [...videoList.value, ...list]
    } else {
      videoList.value = list
    }
    hasMore.value = list.length >= pageSize
    if (hasMore.value) page.value += 1
  } finally {
    loading.value = false
  }
}

function observeSentinel() {
  if (observer) observer.disconnect()
  observer = new window.IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMore.value && !loading.value) {
      loadList(true)
    }
  }, { root: document.querySelector('.swipe-content'), rootMargin: '120px' })
  if (sentinel.value) observer.observe(sentinel.value)
}

onMounted(async () => {
  await loadList()
  nextTick(() => {
    observeSentinel()
  })
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
})
</script>

<style scoped>
.limited-free-page {
  padding-top: 12.3vw;
  background: #f7f8fa;
  min-height: 100vh;
}
.swipe-content {
  width: 100vw;
  background: #fff;
  min-height: 50vw;
  height: 100vh;
  overflow-y: auto;
}
.card-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3vw 2vw;
  padding: 4vw 2vw 0 2vw;
}
.video-card {
  background: #f5f4f4;
  border-radius: 2vw;
  box-shadow: 0 0.4vw 2vw rgba(160,160,160,0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 44vw;
  height: 40vw;
  min-height: 42vw;
  max-height: 54vw;
  position: relative;
}
.thumb-wrap {
  width: 100%;
  aspect-ratio: 16/9;
  background: #e8e8e8;
  border-radius: 2vw 2vw 0 0;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
}
.cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 2vw 2vw 0 0;
  background: #e8e8e8;
}
.video-info-bar {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 3vw;
  color: #fff;
  padding: 0 2vw 1vw 2vw;
  background: linear-gradient(0deg,rgba(34,34,34,0.80),rgba(34,34,34,0.10) 85%);
  border-radius: 0 0 2vw 2vw;
}
.desc-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.5vw 2vw 1vw 2vw;
  min-height: 12vw;
}
.video-title {
  font-size: 3.3vw;
  color: #303030;
  font-weight: 550;
  line-height: 1.25;
  margin-bottom: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  min-height: 8vw;
  max-height: 8vw;
}
.card-bottom {
  display: flex;
  align-items: center;
  gap: 2vw;
  margin-top: 2vw;
  padding-bottom: 0.3vw;
}
.tag {
  background: #e23d41;
  color: #fff;
  font-size: 3vw;
  border-radius: 0.7vw;
  padding: 0.4vw 2vw 1vw 2vw;
  margin-right: 1vw;
  font-weight: 500;
  display: inline-block;
  line-height: 1;
}
.van-tag {
  margin: 0 1.6vw 1.6vw;
  align-self: flex-start;
}
::v-deep(.van-nav-bar__title) {
  font-size: 5.1vw !important;
  font-weight: bold !important;
  color: #333 !important;
}
::v-deep(.van-icon-arrow-left) {
  font-size: 6.9vw !important;
  color: #333 !important;
}
.play-icon {
  width: 4.3vw;
  height: 4.3vw;
  margin-right: 1vw;
  vertical-align: middle;
  filter: drop-shadow(0 0 2px rgba(24, 24, 24, 0.8));
}
.views {
  display: flex;
  align-items: center;
  gap: 1vw;
  font-size: 3vw;
  color: #fff;
  text-shadow: 0 0 4px rgba(0,0,0,0.7);
}
.loading-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5.3vw 0;
  font-size: 3.73vw;
}
.custom-spinner {
  width: 9.3vw;
  height: 9.3vw;
  margin-bottom: 2.1vw;
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
  font-weight: bold;
  font-size: 3.73vw;
  margin: 5.3vw 0;
}
.empty-data-message {
  text-align: center;
  padding: 8vw;
  color: #999;
  font-size: 4.26vw;
}
</style>
