<template>
  <div class="normal-category" :class="{ dark: isDarknet }" ref="scrollContainer">
    <div class="category-block" v-for="category in categoryList" :key="category.id">
      <div class="block-title-row">
        <div class="block-title">
          <img
            v-if="category.icon"
            :src="`/icons/${category.icon}`"
            class="category-icon"
            alt="icon"
          />
          <span>{{ category.name }}</span>
        </div>
        <div class="block-more" @click="onGoToMore(category.name)">➤</div>
      </div>
      <div class="sub-images">
        <div
          v-for="video in getVideoList(category.id)"
          :key="video.id"
          class="sub-card"
          @click="logAndGoToPlay(video)"
        >
          <div class="video-card">
            <div class="cover-wrapper">
              <img :src="video.cover_url || video.cover" class="sub-image" />
              <CardCornerIcon :isVip="video.vip" :coinAmount="video.coin" />
              <div class="meta">
                <span class="views">
                  <img src="/icons/play4.svg" style="width:14px;height:14px;vertical-align:middle;margin-right:2px;" />
                  {{ formatPlayCount(video.play ?? 0) }}
                </span>
                <span class="duration">{{ formatDuration(video.duration) }}</span>
              </div>
            </div>
            <div class="title">{{ video.title }}</div>
            <span v-if="video.tags && video.tags.length" class="tag-badge">
              {{ video.tags[0] }}
            </span>
            <span v-else class="tag-badge" style="visibility: hidden;">占位</span>
          </div>
        </div>
      </div>
      <div class="action-buttons">
        <button class="btn outline" @click="onGoToMore(category.name)">
          <img src="/static/more1.png" class="btn-icon" /> 查看更多
        </button>
        <button class="btn outline" @click="emit('refresh', category.id)">
          <img src="/static/refresh1.png" class="btn-icon" /> 更换一批
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CardCornerIcon from './CardCornerIcon.vue'
import { useRoute, useRouter } from 'vue-router'
import { ref, watch, computed, nextTick, onMounted, onBeforeUnmount, onActivated } from 'vue'
import { useCategoryUIStore } from '@/store/ui/longVideo/categoryUI.store'

const emit = defineEmits<{
  (e: 'clickItem', payload: any): void
  (e: 'goToMore', name: string): void
  (e: 'refresh', categoryId: number): void
}>()

const props = defineProps<{
  categoryList: any[]
  categoryName: string
  videoBasicData: Record<number, any[]>
  dark?: boolean
}>()

const route = useRoute()
const router = useRouter()
const isDarknet = computed(() => props.dark === true || route.meta.isDarknet === true || route.path.includes('darknet'))

// 滚动位置用 Pinia 存储（可选）
const scrollContainer = ref<HTMLElement | null>(null)
const categoryUIStore = useCategoryUIStore()
const categoryKey = props.categoryName
categoryUIStore.initPageState(categoryKey)

function recordScroll() {
  if (scrollContainer.value) {
    categoryUIStore.setScrollTop(categoryKey, scrollContainer.value.scrollTop)
  }
}
function restoreScroll() {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = categoryUIStore.pageStates[categoryKey]?.scrollTop ?? 0
    }
  })
}
onMounted(() => {
  scrollContainer.value?.addEventListener('scroll', recordScroll)
  restoreScroll()
})
onBeforeUnmount(() => {
  scrollContainer.value?.removeEventListener('scroll', recordScroll)
})
onActivated(() => {
  restoreScroll()
})

// 内容渲染
function getVideoList(categoryId: number) {
  const apiList = props.videoBasicData[categoryId]
  if (apiList && apiList.length > 0) {
    return apiList.map(v => ({
      ...v,
      cover: v.cover || v.cover_url
    })).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
  }
  return []
}
function onGoToMore(name: string) {
  emit('goToMore', name)
}
function logAndGoToPlay(video: any) {
  emit('clickItem', video)
}
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
    return count.toString()
  }
}
</script>

<style scoped>
.normal-category {
  padding-bottom: 3.2vw; /* 12px */
}
.normal-category.dark .block-title,
.normal-category.dark .title {
  color: #fff;
}
.category-block {
  margin-bottom: 7.5vw; /* 28px */
  box-sizing: border-box;
  padding: 0;
}
.block-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 2.7vw 1.1vw; /* 10px 4px */
}
.block-title {
  display: flex;
  align-items: center;
  font-size: 4.3vw;
  font-weight: bold;
  color: #222;
}
.category-icon {
  width: 18px;
  height: 18px;
  margin-left: 6px;
  vertical-align: middle;
}
.block-more {
  font-size: 4.3vw; /* 16px */
  color: #999;
  cursor: pointer;
  padding: 0.5vw 1.6vw; /* 2px 6px */
}
.block-more:hover {
  color: #f12c2c;
}
.sub-images {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  padding: 0 2.9vw; /* 两侧留白 */
  gap: 2vw;          /* 中间间距稍微缩小 */
  box-sizing: border-box;
}

.sub-card {
  display: flex;
  flex-direction: column;
}
.sub-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 1.6vw; /* 6px */
  background-color: #f2f2f2;
  border: 0.27vw solid #eee; /* 1px */
  display: block;
}
.title {
  font-size: 3.6vw;
  color: #222;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;            /* 始终占两行高度 */
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  height: calc(1.4em * 2);           /* 固定两行高度 */
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
  height: 5.2vw; /* 固定高度，让有无标签一致 */
  line-height: 5.2vw;
}

.corner {
  position: absolute;
  top: -0.5vw; /* -2px */
  right: -0.8vw; /* -3px */
  background-color: rgba(0, 0, 0, 0.7);
  color: #fff;
  border-radius: 1.3vw; /* 5px */
  padding: 0.2vw 0.8vw; /* 1px 3px */
  font-size: 2.4vw; /* 9px */
}
.action-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 3.2vw; /* 12px */
  padding: 0 1.1vw; /* 0 4px */
  gap: 2.7vw; /* 10px */
}
.btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.6vw; /* 6px */
  font-size: 3.7vw; /* 14px */
  padding: 2.1vw 0; /* 8px 0 */
  border-radius: 5.3vw; /* 20px */
  cursor: pointer;
  border: none;
}
.btn.outline {
  background-color: #fff;
  color: #444;
  border: 0.27vw solid #ccc; /* 1px */
}
.btn.outline:hover {
  border-color: #999;
  color: #000;
}
.btn-icon {
  width: 4.3vw; /* 16px */
  height: 4.3vw;
}
.load-more-trigger {
  height: 0.27vw; /* 1px */
}
.loading-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5.3vw 0; /* 20px 0 */
  font-size: 3.7vw; /* 14px */
}
.spinner {
  width: 8vw; /* 30px */
  height: 8vw;
  animation: spin 0.8s linear infinite;
  margin-bottom: 2.1vw; /* 8px */
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.loading-text {
  color: #ff5f5f;
  font-weight: 500;
}
.end-bar {
  text-align: center;
  color: #999;
  font-weight: bold;
  font-size: 3.7vw; /* 14px */
  margin: 13.3vw 0; /* 50px 0 */
}
.cover-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 0; /* 不要加 radius 否则内容会被剪掉 */
  overflow: hidden;
}
.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.mask-layer {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 1.1vw;
  font-size: 3vw;
  color: #fff;
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
  gap: 1.1vw; /* 4px */
}
.play-icon {
  width: 4.3vw; /* 16px */
  height: 4.3vw;
}
.views img {
  filter: drop-shadow(0 0 2px rgba(24, 24, 24, 0.8));
}
.video-card {
  width: 46vw;
  height: auto; /* 不要强行限制高度 */
  display: flex;
  flex-direction: column;
  padding: 0;
  border-radius: 1vw;
  overflow: hidden;
  background:rgb(240, 240, 240);
  box-shadow: 0 0 2vw rgba(0, 0, 0, 0.05);
}

.vip-corner {
  position: absolute;
  top: 0.5vw;
  right: 0.5vw;
  z-index: 2;
  display: flex;
  align-items: center;
}
.coin-tag {
  display: flex;
  align-items: center;
  background: rgba(0,0,0,0.7);
  color: #fff;
  border-radius: 1vw;
  padding: 0.2vw 1vw;
  font-size: 2.4vw;
}
.coin-icon {
  width: 18px;
  height: 18px;
  margin-left: 2px;
}
.vip-img {
  width: 32px;
  height: 18px;
}
</style>
