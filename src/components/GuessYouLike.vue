<template>
  <div class="guess-you-like">
    <div class="section-title">猜你喜欢</div>
    <div class="recommend-list">
      <div
        class="video-card"
        v-for="item in list"
        :key="item.id"
        @click="$emit('play', item)"
      >
        <div class="cover-wrapper">
          <img :src="item.cover_url || item.cover" class="sub-image" />
          <CardCornerIcon :isVip="item.vip" :coinAmount="item.coin" />
          <div class="meta">
            <span class="views">
              <img src="/icons/play4.svg" class="play-icon" />
              {{ formatPlayCount(item.play ?? 0) }}
            </span>
            <span class="duration">{{ formatDuration(item.duration) }}</span>
          </div>
        </div>
        <div class="title">{{ item.title }}</div>
        <span v-if="item.tags && item.tags.length" class="tag-badge">
          {{ item.tags[0] }}
        </span>
        <span v-else class="tag-badge" style="visibility: hidden;">占位</span>
      </div>
      <!-- 懒加载触发点 -->
      <div ref="sentinel" class="load-more-trigger"></div>
      <!-- 加载中提示 -->
      <div v-if="isLoading" class="loading-tip">
        <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
        <div class="loading-text">客官别走，妾身马上就好~</div>
      </div>
      <!-- 没有更多提示 -->
      <div v-if="noMore && list.length > 0" class="no-more-text">
        客官，妾身被你看光了，扛不住了~
      </div>
      <!-- 空数据提示 -->
      <div v-if="!isLoading && list.length === 0" class="empty-data-message">
        <p>暂无推荐内容~</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { fetchH5GuessYouLike } from '@/api/longVideo.api'
import CardCornerIcon from './CardCornerIcon.vue'

const props = defineProps<{
  videoId: number | string
}>()

const list = ref<any[]>([])
const isLoading = ref(false)
const noMore = ref(false)
const page = ref(1)
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

function formatDuration(sec: number | string | undefined): string {
  const s = Number(sec)
  if (isNaN(s) || s <= 0) return '00:00'
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`
}

function formatPlayCount(count: number): string {
  if (count >= 100000) {
    return (count / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  } else {
    return count?.toString() ?? '0'
  }
}

async function loadGuess(reset = false) {
  if (!props.videoId) return  // 没有 videoId 不请求
  if (isLoading.value || noMore.value) return
  isLoading.value = true
  if (reset) {
    page.value = 1
    list.value = []
    noMore.value = false
  }
  const res = await fetchH5GuessYouLike({ video_id: props.videoId, limit: 8, page: page.value })
  const newList = res?.list || []
  if (page.value === 1) {
    list.value = newList
  } else {
    list.value = [...list.value, ...newList]
  }
  if (newList.length < 8) noMore.value = true
  isLoading.value = false
}

function initObserver() {
  nextTick(() => {
    if (observer) observer.disconnect()
    if (!sentinel.value) return
    observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !isLoading.value && !noMore.value) {
        page.value++
        loadGuess()
      }
    }, { rootMargin: '120px' })
    observer.observe(sentinel.value)
  })
}

onMounted(() => {
  if (props.videoId) {
    loadGuess(true)
    initObserver()
  }
})
onUnmounted(() => {
  if (observer) observer.disconnect()
})

watch(
  () => props.videoId,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      loadGuess(true)
      initObserver()
    }
  }
)

</script>

<style scoped>
.guess-you-like {
  margin-top: 3vw;
}
.section-title {
  font-size: 5vw;      /* 字体大小 */
  font-weight: 700;    /* 字体粗细 */
  color: #e23d41;      /* 字体颜色 */
  font-family: '微软雅黑', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif; /* 字体 */
  margin: 2.7vw 1.1vw 1vw 0;
  padding-left: 2vw; /* 这里控制往右移的距离，2vw 可根据实际微调 */
  text-align: left;
}
.recommend-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3vw 2vw;
  padding: 4vw 2vw 0 2vw;
  box-sizing: border-box;
  position: relative; /* 新增，方便子元素居中 */
}
.video-card {
  width: 100%;
  background: #f5f4f4;
  border-radius: 2vw;
  box-shadow: 0 0.4vw 2vw rgba(160,160,160,0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin-bottom: 3vw;
}
.cover-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 0;
  overflow: hidden;
}
.sub-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 1.6vw;
  background-color: #f2f2f2;
  border: 0.27vw solid #eee;
  display: block;
}
.meta {
  position: absolute;
  bottom: 0.5vw;
  left: 1vw;
  right: 1vw;
  display: flex;
  justify-content: space-between;
  font-size: 2.9vw;
  color: #fff;
  text-shadow: 0 0 4px rgba(0,0,0,0.7);
}
.views,
.duration {
  display: flex;
  align-items: center;
  gap: 1.1vw;
}
.play-icon {
  width: 4.3vw;
  height: 4.3vw;
}
.title {
  font-size: 3.6vw;
  color: #222;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  height: calc(1.4em * 2);
  margin-top: 1vw;
}
.tag-badge {
  display: inline-block;
  padding: 0.5vw 2vw;
  font-size: 3vw;
  background: #f12c2c;
  color: white;
  border-radius: 1vw;
  align-self: flex-start;
  height: 5.2vw;
  line-height: 5.2vw;
  margin-bottom: 1vw;
}
.loading-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center; /* 新增，水平居中 */
  grid-column: span 2;     /* 新增，占满两列 */
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
  grid-column: span 2;
  text-align: center;
  color: #999;
  padding: 3vw 0;
}
.empty-data-message {
  grid-column: span 2;
  text-align: center;
  color: #999;
  padding: 3vw 0;
}
</style>