<template>
  <div class="entry-bar">
    <div
      class="entry-list"
      ref="scrollRef"
      @scroll="handleScroll"
    >
      <div
        class="entry-item"
        v-for="(item, index) in entries"
        :key="index"
        @click="handleClick(item)"
      >
        <img :src="item.icon" class="entry-icon" />
        <div class="entry-label">{{ item.label }}</div>
      </div>
    </div>
    <div class="scroll-track">
      <div
        class="scroll-thumb"
        :style="{ transform: `translateX(${thumbOffset}px)` }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

interface Entry {
  icon: string
  label: string
  route: string
}

const entries: Entry[] = [
  { icon: '/icons/paihangbang1.png', label: '排行榜', route: '/comic-rank' },
    { icon: '/icons/xianmian1.png', label: '限免', route: '/limited-free-list' }, // ✅ 修改为限免列表路由
  { icon: '/icons/meiri.png', label: '每日', route: '/daily-follow' },
  { icon: '/icons/wanjie.png', label: '完结', route: '/completed-list' },
  { icon: '/icons/qiandao2.png', label: '签到', route: '/benefit-page' },
  { icon: '/icons/vip1.png', label: '会员', route: '/vip?tab=vip' },
  { icon: '/icons/jinbi1.png', label: '金币', route: '/vip?tab=coin' }
]

const scrollRef = ref<HTMLDivElement | null>(null)
const thumbOffset = ref(0)

// vw版轨道和滑块尺寸
const trackWidth = 9.1   // 34px ≈ 9.1vw
const thumbWidth = 4     // 15px ≈ 4vw

function handleScroll() {
  const el = scrollRef.value
  if (!el) return

  const maxScroll = el.scrollWidth - el.clientWidth
  const percent = maxScroll > 0 ? el.scrollLeft / maxScroll : 0

  const maxThumbMove = (trackWidth * (window.innerWidth / 100)) - (thumbWidth * (window.innerWidth / 100))
  thumbOffset.value = percent * maxThumbMove
}

function handleClick(item: Entry) {
  if (item.route) {
    router.push(item.route)
  }
}

onMounted(() => {
  nextTick(() => {
    handleScroll()
  })
})
</script>

<style scoped>
.entry-bar {
  padding: 0 3.2vw;
  margin-bottom: 3.2vw;
  position: relative;
}

.entry-list {
  display: flex;
  overflow-x: auto;
  gap: 4.3vw;
  padding: 2.1vw 0;
  scroll-behavior: smooth;
}

.entry-list::-webkit-scrollbar {
  display: none;
}
.entry-item {
  flex-shrink: 0;
  width: 15vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start; /* 上下排列时对齐顶部, 一般不用 center, 要不然底部对不齐 */
  text-align: center;
  cursor: pointer;
  /* 可选：加一点 padding，让图标和文字更居中于每格 */
  /* padding-top: 1vw; padding-bottom: 1vw; */
}

.entry-icon {
  width: 12.8vw;
  height: 12.8vw;
  border-radius: 2.6vw;
  object-fit: cover;
  /* 图标和文字的距离适当拉开 */
  margin-bottom: 1.5vw;
  /* 修正 icon 原图没居中导致视觉偏移的情况 */
  display: block;
}

.entry-label {
  font-size: 3.5vw;   /* 字体稍大点 */
  color: #333;
  white-space: nowrap;
  font-weight: 500;
  line-height: 1.15;
  /* 用 transform 微调文字垂直位置，如果字体本身偏下可以 margin-top: -0.3vw; */
  /* margin-top: -0.3vw; */
}

/* 短短轨道 */
.scroll-track {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 9.1vw;   /* 原34px */
  height: 1vw;    /* 原4px */
  background: #dfdbdb;
  border-radius: 0.5vw;
  overflow: hidden;
}

/* 红色滑块 */
.scroll-thumb {
  width: 4vw;     /* 原15px */
  height: 1vw;    /* 原4px */
  background: #f36;
  border-radius: 0.5vw;
  transition: transform 0.2s;
}
</style>
