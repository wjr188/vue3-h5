<template>
  <div class="category-block" :class="{ 'dark-mode': props.dark }" data-stop-swipe>
    <!-- 子分类标题 + 右箭头 -->
    <div class="block-title-row" data-stop-swipe>
      <div class="block-title-left">
        <span v-if="category.icon" class="group-icon">
          <img :src="`/icons/${category.icon}`" alt="icon" class="icon-img" />
        </span>
        <div class="block-title">{{ category.name }}</div>
      </div>
      <div class="block-more" @click="goToMore" data-stop-swipe>➤</div>
    </div>

   <!-- 主图卡片 -->
<div
  class="main-card"
  @click="emitMainClick"
  data-stop-swipe
>

  <div class="cover-wrapper" data-stop-swipe>
    <img v-lazy="category.mainImage" class="main-image" alt="主图" />
    <CardCornerIcon :isVip="category.mainVip" :coinAmount="category.mainCoin" />
    <div class="meta">
      <div class="views">
        <img src="/icons/play4.svg" class="play-icon" />
        {{ (category.mainViews / 10000).toFixed(1) }}w
      </div>
      <div class="duration">{{ formatDuration(category.mainDuration) }}</div>
    </div>
  </div>
  <div class="main-title">{{ category.mainTitle }}</div>
  <div class="tags" v-if="category.mainTags && category.mainTags.length">
    <span class="tag" v-for="(t, i) in category.mainTags" :key="i">{{ t }}</span>
  </div>
  <!-- 兼容老数据 -->
  <div class="tag" v-else-if="category.mainTag">{{ category.mainTag }}</div>
</div>

<!-- 子图卡片（2x2） -->
<div class="sub-images">
  <div
    v-for="(item, index) in shuffledSubImages"
    :key="item.id"
    class="sub-card"
    @click="emitClick(item)"
    data-stop-swipe
  >
    <div class="cover-wrapper">
      <img v-lazy="item.cover" class="sub-image" alt="子图" />
      <CardCornerIcon :isVip="item.vip" :coinAmount="item.coin" />
      <div class="meta">
        <div class="views">
          <img src="/icons/play4.svg" class="play-icon" />
          {{ (item.views / 10000).toFixed(1) }}w
        </div>
        <div class="duration">{{ formatDuration(item.duration) }}</div>
      </div>
    </div>
    <div class="sub-title">{{ item.title }}</div>
    <div class="tag" v-if="item.tags && item.tags.length">
      {{ item.tags[0] }}
    </div>
    <div class="tag" v-else-if="item.tag">{{ item.tag }}</div>
  </div>
</div>

    <!-- 查看更多 + 更换一批 -->
    <div class="action-buttons" data-stop-swipe>
      <button class="btn outline" @click="goToMore" data-stop-swipe>
        <img src="/static/more1.png" class="btn-icon" alt="更多" loading="lazy" />
        查看更多
      </button>
      <button class="btn outline" @click="emit('refreshGroup', category.id)" data-stop-swipe>
        <img src="/static/refresh1.png" class="btn-icon" alt="刷新" loading="lazy" />
        更换一批
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'

// 类型定义
interface SubImage {
  id: number
  cover: string
  title: string
  tag: string
  src: string
  views: number
  duration?: string
}
interface Category {
  name: string
  mainId: number
  mainImage: string
  mainTitle: string
  mainTag: string
  mainViews: number
  mainDuration?: string
  src: string
  subImages: SubImage[]
}

// emits
const emit = defineEmits(['clickItem', 'goToMore', 'refreshGroup'])

// props
const props = defineProps<{
  category: Category
  dark?: boolean
}>()

// 子图列表
const shuffledSubImages = ref<SubImage[]>([])

// 初始化/监听更新
watch(
  () => props.category,
  (val) => {
    // console.log('[CategoryBlock.vue] props.category 变化', val)
    shuffleSubImages()
  },
  { immediate: true } // 👈 不要 deep: true
)

function shuffleSubImages() {
  shuffledSubImages.value = [...props.category.subImages]
    .map(v => ({ ...v }))
    .sort(() => Math.random() - 0.5)
}

// 主图点击
function emitMainClick(): void {
  emit('clickItem', {
    id: props.category.mainId,
    cover: props.category.mainImage,
    title: props.category.mainTitle,
    tag: props.category.mainTag,
    src: props.category.src,
    views: props.category.mainViews,
    duration: props.category.mainDuration
  })
}

// 子图点击
function emitClick(item: SubImage): void {
  emit('clickItem', item)
}

// 更多
function goToMore(): void {
  // console.log('goToMore emit', props.category.id, props.category.name)
  emit('goToMore', props.category.id, props.category.name)
}

function formatDuration(duration?: string | number) {
  if (!duration) return '00:00';
  let sec = Number(duration);
  if (isNaN(sec)) return duration;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
</script>

<style scoped>
.category-block {
  margin-bottom: 7.5vw; /* 28px */
  box-sizing: border-box;
}

.block-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 2.7vw 1.1vw; /* 10px 4px */
}
.block-title-left {
  display: flex;
  align-items: center;
}
.block-title {
  font-size: 4.3vw; /* 16px */
  font-weight: 600;
  color: #222;
}
.block-more {
  font-size: 4.3vw;
  color: #999;
  cursor: pointer;
  padding: 0.5vw 1.6vw;
  user-select: none;
  transition: color 0.2s;
}
.block-more:hover {
  color: #f12c2c;
}

.main-card {
  margin-bottom: 3.2vw; /* 12px */
  background: rgb(240, 240, 240); /* 设置背景颜色 */
  box-shadow: 0 0 2vw rgba(0, 0, 0, 0.05); /* 添加阴影 */
  border-radius: 2.1vw; /* 8px */
  overflow: hidden;
  transition: box-shadow 0.3s ease; /* 添加过渡效果 */
}

.main-card:hover {
  box-shadow: 0 0 4vw rgba(0, 0, 0, 0.2); /* 鼠标悬停时的阴影效果 */
}

.main-image {
  width: 100%;
  border-radius: 2.1vw; /* 8px */
  object-fit: cover;
  display: block;
  aspect-ratio: 16 / 9;
  max-height: 53.3vw; /* 200px */
}

.sub-images {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2.7vw; /* 10px */
}
.sub-card {
  display: flex;
  flex-direction: column;
  cursor: pointer;
  user-select: none;
  background: rgb(240, 240, 240); /* 设置背景颜色 */
  box-shadow: 0 0 2vw rgba(0, 0, 0, 0.05); /* 添加阴影 */
  border-radius: 1.6vw; /* 6px */
  overflow: hidden;
  transition: box-shadow 0.3s ease; /* 添加过渡效果 */
}

.sub-card:hover {
  box-shadow: 0 0 4vw rgba(0, 0, 0, 0.2); /* 鼠标悬停时的阴影效果 */
}
.sub-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 1.6vw; /* 6px */
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
.main-title {
  font-size: 3.6vw;
  color: #222;
  font-weight: bold;
  margin-top: 1vw;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  height: calc(1.4em * 2);
}
.sub-title {
  font-size: 3.6vw;
  color: #222;
  margin-top: 1vw;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  height: calc(1.4em * 2);
}
.tag {
  font-size: 3.2vw; /* 12px */
  color: #fff;
  background-color: #f12c2c;
  border-radius: 1vw; 
  padding: 0.3vw 2.1vw; /* 1px 8px */
  display: inline-block;
  margin-top: 1.1vw; /* 4px */
  align-self: flex-start;
  white-space: nowrap;
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
  margin-top: 0.5vw;
}

.action-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 3.2vw; /* 12px */
  padding: 0 1.1vw; /* 4px */
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
  user-select: none;
}
.btn.outline {
  background-color: #fff;
  color: #444;
  border: 0.27vw solid #ccc; /* 1px */
  transition: all 0.3s;
}
.btn.outline:hover {
  border-color: #999;
  color: #000;
}
.btn-icon {
  width: 4.3vw; /* 16px */
  height: 4.3vw;
  object-fit: contain;
}

/* ✅ 暗网模式样式 */
.dark-mode .block-title,
.dark-mode .title {
  color: white;
}
.cover-wrapper {
  position: relative;
}
.meta {
  position: absolute;
  bottom: 0.5vw; /* 2px */
  left: 1.3vw; /* 5px */
  right: 2.1vw; /* 8px */
  display: flex;
  justify-content: space-between;
  font-size: 2.9vw; /* 11px */
  color: #fff;
  text-shadow: 0 0 1.1vw rgba(0,0,0,0.7);
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
.group-icon {
  margin-right: 1vw;
  display: flex;
  align-items: center;
}
.icon-img {
  width: 4vw;
  height: 4vw;
  object-fit: contain;
  vertical-align: middle;
}
</style>
