<template>
  <div class="video-card" @click="goToPlay">
    <div class="cover-wrapper">
      <img v-lazy="cover" class="cover" />
      <!-- 新增：VIP/金币角标 -->
      <CardCornerIcon :isVip="vip" :coinAmount="coin" />
      <div class="info-bar">
        <div class="views">
          <img src="/icons/play4.svg" class="play-icon" alt="播放" />
          {{ views }}
        </div>
        <div class="duration">{{ duration }}</div>
      </div>
    </div>
    <div class="title">{{ title }}</div>
    <div class="tag" :style="{ background: tagColor }">{{ displayTag }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import CardCornerIcon from './CardCornerIcon.vue' // 新增

const router = useRouter()

interface Props {
  index: number
  category: string
  title: string
  cover: string
  views: string
  duration: string
  tag?: string
  tags?: string[]
  tagColor: string
}

const props = defineProps<{
  id?: number | string
  index: number
  category: string
  title: string
  cover: string
  views: string
  duration: string
  tag?: string
  tags?: string[]
  tagColor?: string
  vip?: boolean
  coin?: number
}>()


const displayTag = computed(() => props.tags?.[0] || props.tag || '')

const goToPlay = () => {
  // 触发发现页保存完整状态（包括最新滚动位置）
  window.dispatchEvent(new CustomEvent('saveDiscoverState'))
  
  // 保存基本跳转信息到sessionStorage  
  const discoverState = {
    currentTag: props.category,
    currentIndex: props.index,
    from: 'discover'
  }
  sessionStorage.setItem('fromDiscoverPage', JSON.stringify(discoverState))
  
  router.push({
    path: '/play-tiktok',
    query: {
      id: props.id,         // 视频id
      tag: props.tag || (props.tags?.[0] ?? ''), // ✅ 这里用标签
      index: props.index,
      from: 'discover'
    }
  })
}
</script>

<style scoped>
.video-card {
  background: transparent;
  cursor: pointer;
}

/* 封面区域 */
.cover-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 9 / 16;
  max-height: 66.66vw; /* 250px -> ~66.66vw */
  overflow: visible; /* 改为 visible 让角标能够显示 */
  border-radius: 2.13vw; /* 8px -> ~2.13vw */
}

.cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 2.13vw; /* 保持图片圆角 */
}

/* 播放图标 + 播放量 + 时长 */
.info-bar {
  position: absolute;
  bottom: 1.6vw; /* 6px */
  left: 1.6vw;
  right: 1.6vw;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 3.2vw; /* 12px */
  color: #fff;
  padding: 0 0.53vw; /* 2px */
  background: none;
}

.views {
  display: flex;
  align-items: center;
}

.play-icon {
  width: 4.26vw; /* 16px */
  height: 4.26vw;
  margin-right: 1.06vw; /* 4px */
  object-fit: contain;
  filter: drop-shadow(0 0 0.53vw #fff); /* 2px */
}

.duration {
  font-size: 3.2vw;
}

/* 标题样式 */
.title {
  font-size: 3.46vw; /* 13px */
  padding-top: 1.6vw; /* 6px */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 标签样式 */
.tag {
  display: inline-block;
  margin-top: 1.06vw; /* 4px */
  font-size: 3.2vw; /* 12px */
  padding: 0.53vw 1.6vw; /* 2px 6px */
  border-radius: 3.2vw; /* 12px */
  color: #fff;
  background-color: #ff2c55;
}
</style>
