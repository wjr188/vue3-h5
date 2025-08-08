<template>
  <div class="acg-card" @click="handleClick">
    <!-- 新版榜单样式 -->
 <template v-if="resolvedType === 'list'">
  <div class="list-card">
    <div style="position: relative;">
      <img class="list-cover" v-lazy="resolvedCover" alt="封面" />
      <!-- 右上角徽章 -->
      <div v-if="isVip" class="corner-tag">
        <img src="/icons/vip4.png" class="corner-icon" />
      </div>
      <div v-else-if="coin > 0" class="corner-tag">
        <img src="/icons/coin2.png" class="corner-icon" />
      </div>
    </div>
    <div class="list-info">
      <div class="list-title">{{ resolvedTitle }}</div>
      <div class="list-intro">{{ resolvedIntro }}</div>
      <div class="list-meta">
  <span class="views">
    <img src="/icons/view.svg" class="view-icon" />
    {{ formatViews(resolvedViews) }}观看
  </span>
  <span class="status">
    {{ resolvedSerialStatus }}/共{{ resolvedCount }}章
  </span>
</div>
    </div>
  </div>
</template>


 <template v-else-if="resolvedType === 'videoGrid'">
  <div class="video-grid">
    <div class="video-grid-cover">
      <img v-lazy="resolvedCover" alt="封面" />
      <!-- 右上角徽章 -->
      <div v-if="isVip" class="corner-tag">
        <img src="/icons/vip4.png" class="corner-icon" />
      </div>
      <div v-else-if="coin > 0" class="corner-tag">
        <img src="/icons/coin2.png" class="corner-icon" />
      </div>
      <div class="meta-overlay">
        <div class="views">
          <img src="/icons/play4.svg" class="play-icon" />
          {{ formatViews(resolvedViews) }}
        </div>
        <div class="duration">{{ formatDuration(resolvedDuration) }}</div>
      </div>
    </div>
    <!-- 标题放在这里，作为video-grid的子元素 -->
    <div class="video-grid-title">{{ resolvedTitle }}</div>
  </div>
</template>

    <!-- 原始封面卡片 -->
    <template v-else>
      <div class="cover">
        <img v-lazy="resolvedCover" alt="封面" />
        <!-- 右上角徽章 -->
  <div v-if="isVip" class="corner-tag">
    <img src="/icons/vip4.png" class="corner-icon" />
  </div>
  <div v-else-if="coin > 0" class="corner-tag">
    <img src="/icons/coin2.png" class="corner-icon" />
  </div>
        <div class="title-overlay">
          <div class="title-text">{{ resolvedTitle }}</div>
        </div>
      </div>
      <div class="info-bar">
       <div class="episode">
  共{{
    (props.data?.chapter_count != null
      ? props.data.chapter_count
      : resolvedEpisodeCount)
  }}{{
    resolvedType === 'audio'
      ? '首'
      : resolvedType === 'anime'
      ? '集'
      : '话'
  }}
</div>
        <div class="category">
  {{ resolvedSerialStatus }}
</div>
</div>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
const isVip = computed(() => props.data?.is_vip === 1);
const coin = computed(() => Number(props.data?.coin ?? 0));

interface DataItem {
  name: string;
  coin: number;
  is_vip: number;
  is_serializing: any;
  chapter_count: null;
  id?: number | string
  title?: string
  cover?: string
  category?: string
  intro?: string
  views?: number | string
  count?: number | string
  duration?: string
  episodeCount?: number
  tags?: string[]
  src?: string
  activeTab?: string
}

const props = defineProps<{
  id?: number | string
  cover?: string
  title?: string
  episodeCount?: number
  category?: string
  intro?: string
  views?: number | string
  count?: number | string
  duration?: string
  type?: string
  activeTab?: string
  data?: DataItem | null
}>()
const resolvedSerialStatus = computed(() => {
  // 只兼容 data 透传
  const val = props.data?.is_serializing
  return val == 1 ? '连载中' : '已完结'
})
const emit = defineEmits<{
  (e: 'item-click', payload: {
    id: number | string
    title: string
    cover: string
    episodeCount: number
    category: string
    src: string
    tags: string[]
  }): void
}>()

// 🟢 计算属性
const resolvedTitle = computed(() => props.data?.title ?? props.data?.name ?? props.title ?? '')
const resolvedCover = computed(() => props.data?.cover ?? props.cover ?? '')
const resolvedCategory = computed(() => props.data?.category ?? props.category ?? '')
const resolvedShortCategory = computed(() => {
  const tab = props.data?.activeTab ?? props.activeTab ?? ''
  return tab === '有声' ? resolvedCategory.value.slice(0, 3) : resolvedCategory.value.slice(0, 2)
})
const resolvedFirstTag = computed(() => {
  const tags = props.data?.tags
  return Array.isArray(tags) && tags.length > 0 ? tags[0] : ''
})
const resolvedEpisodeCount = computed(() => props.data?.episodeCount ?? props.episodeCount ?? 1)
const resolvedIntro = computed(() => props.data?.intro ?? props.intro ?? '')
const resolvedViews = computed(() => props.data?.views ?? props.views ?? 0)
const resolvedCount = computed(() => props.data?.count ?? props.count ?? 0)
const resolvedDuration = computed(() => props.data?.duration ?? props.duration ?? '')
const resolvedId = computed(() => props.data?.id ?? props.id ?? '')
const resolvedType = computed(() => {
  if (props.type === 'list') return 'list'
  if (props.type === 'videoGrid') return 'videoGrid'
  if (props.activeTab === '有声') return 'audio'
  if (props.activeTab === '动漫') return 'anime'
  return 'acg'
})

function handleClick() {
  emit('item-click', {
    id: resolvedId.value,
    title: resolvedTitle.value,
    cover: resolvedCover.value,
    episodeCount: resolvedEpisodeCount.value,
    category: resolvedCategory.value,
    src: props.data?.src ?? '',
    tags: Array.isArray(props.data?.tags) ? props.data.tags : []
  })
}
function formatDuration(sec: number | string) {
  sec = Number(sec) || 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return [h, m, s].map(i => String(i).padStart(2, '0')).join(':');
  } else {
    return [m, s].map(i => String(i).padStart(2, '0')).join(':');
  }
}

function formatViews(val: number | string): string {
  const n = Number(val)
  if (isNaN(n)) return String(val)
  if (n >= 10000) return (n / 10000).toFixed(2) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(2) + 'k'
  return n.toString()
}
</script>
<style scoped>
.acg-card {
  position: relative;
  overflow: hidden;
  border-radius: 2vw;
  background: #fff;
  margin: 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 100%;
}

/* 🟢 新版榜单卡片 list */
.list-card {
  display: flex;
  padding: 0;
  background: #fff;
  border-radius: 2vw;
  overflow: hidden;
  height: 45vw;
}
.list-cover {
  width: 34vw;
  height: 100%;
  object-fit: cover;
  flex-shrink: 0;
}
.list-info {
  flex: 1;
  margin-left: 3vw;
  display: flex;
  flex-direction: column;
  position: relative;
  padding-bottom: 6vw;
}
.list-title {
  font-size: 4vw;
  font-weight: 600;
  color: #222;
  line-height: 1.4;
  margin: 1vw 0 1.5vw;
}
.list-intro {
  font-size: 3.2vw;
  color: #666;
  line-height: 1.6;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  margin-top: 0;
}
.list-meta {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  font-size: 3vw;
  color: #999;
  align-items: flex-end;
}
.views {
  display: flex;
  align-items: center;
  gap: 1vw;
}
.view-icon {
  width: 3.5vw;
  height: 3.5vw;
}
.status {
  text-align: right;
  flex-shrink: 0;
}

/* 🟢 原始竖图封面卡片 */
.cover {
  position: relative;
  width: 100%;
  aspect-ratio: 3/4;
  overflow: hidden;
}
.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.title-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 2vw 1.5vw;
  background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
}
.title-text {
  color: rgba(255,255,255,0.9);
  font-size: 3.5vw;
  line-height: 1.2;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 下方小标签 */
.info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5vw;
  font-size: 3vw;
  gap: 1.5vw;
}
.episode,
.category {
  background: #ff6699;
  color: #fff;
  border-radius: 1.5vw;
  padding: 0.6vw 1.5vw;
  font-size: 2.6vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  display: inline-block;
  line-height: 1.2;
}
.episode {
  background: #f2f2f2;
  color: #000;
}

/* 🟢 新增横图视频卡片 videoGrid 样式 */
.video-grid {
  width: 45vw;   /* 195px 换算成 vw */
  height: 36vw; /* 155px 换算成 vw */
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  overflow: hidden;
}

.video-grid-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 1.5vw;
  overflow: hidden;
}
.video-grid-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.meta-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1vw 1.5vw;
  background: linear-gradient(to top, rgba(0,0,0,0.65), transparent);
  font-size: 3vw;
  color: #fff;
}
.meta-overlay .views {
  display: flex;
  align-items: center;
  gap: 1vw;
}
.meta-overlay .duration {
  flex-shrink: 0;
}
.video-grid-title {
  margin-top: 0.5vw;
  font-size: 3.3vw;
  color: #111;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  height: calc(3.3vw * 1.4 * 2); /* 两行文字的固定高度 */
  min-height: calc(3.3vw * 1.4 * 2);
  word-break: break-word;
}
.play-icon {
  width: 3.5vw !important;
  height: 3.5vw !important;
  max-width: none !important;
  flex-shrink: 0;
  object-fit: contain;
}
.corner-tag {
  position: absolute;
  top: 0.8vw;
  right: 0.8vw;
  display: flex;
  align-items: center;
  border-radius: 1vw 0 1vw 2vw;
  padding: 0.2vw 0.9vw 0.2vw 0.5vw;
}
.corner-icon {
  width: 10vw !important;    /* 建议3vw~4vw */
  height: auto !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: 12vw !important;
  display: block;
  object-fit: contain;
}

</style>
