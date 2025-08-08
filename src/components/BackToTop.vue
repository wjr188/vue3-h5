<template>
  <!-- 返回顶部按钮 -->
  <Transition name="back-to-top">
    <div 
      v-if="showBackToTop" 
      class="back-to-top-btn" 
      @click="scrollToTop"
    >
      <!-- 使用自定义SVG图标 -->
      <img src="/icons/up1.svg" alt="返回顶部" class="top-icon" />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

interface Props {
  scrollContainer?: HTMLElement | null
  threshold?: number
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  scrollContainer: null,
  threshold: 300,
  duration: 300
})

const showBackToTop = ref(false)


// 滚动事件处理
function handleScroll() {
  let scrollTop = 0
  
  if (props.scrollContainer) {
    scrollTop = props.scrollContainer.scrollTop
  } else {
    scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop
  }
  
  showBackToTop.value = scrollTop > props.threshold
}

// 返回顶部
function scrollToTop() {
  if (props.scrollContainer) {
    smoothScrollTo(props.scrollContainer, 0, props.duration)
  } else {
    smoothScrollTo(window, 0, props.duration)
  }
}

// 平滑滚动函数
function smoothScrollTo(element: HTMLElement | Window, target: number, duration: number) {
  const startTime = Date.now()
  const startPos = element instanceof Window 
    ? window.pageYOffset || document.documentElement.scrollTop
    : element.scrollTop
  
  const distance = target - startPos
  
  function animation() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    const easeProgress = progress < 0.5
      ? 4 * progress * progress * progress
      : (progress - 1) * (2 * progress - 2) * (2 * progress - 2) + 1
    
    const currentPos = startPos + distance * easeProgress
    
    if (element instanceof Window) {
      window.scrollTo(0, currentPos)
    } else {
      element.scrollTop = currentPos
    }
    
    if (progress < 1) {
      requestAnimationFrame(animation)
    }
  }
  
  requestAnimationFrame(animation)
}

onMounted(() => { 
  const target = props.scrollContainer || window
  target.addEventListener('scroll', handleScroll, { passive: true })
  
  // ✅ 立即检查一次滚动位置
  handleScroll()
})

onBeforeUnmount(() => {
  const target = props.scrollContainer || window
  target.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.back-to-top-btn {
  position: fixed;
  right: 4vw;
  bottom: 20vw;
  width: 14vw;
  height: 14vw;
  background: rgba(79,140,255,0.18); /* 蓝色半透明背景 */
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 9999;
  box-shadow: 0 0 16px 4px rgba(79,140,255,0.25), 0 0 0 6px rgba(110,223,255,0.18);
  border: 2px solid #4f8cff; /* 蓝色边框 */
  backdrop-filter: blur(12px);
  transition: all 0.3s cubic-bezier(.4,0,.2,1);
}

.top-icon {
  width: 60%;
  height: 60%;
  object-fit: contain;
  pointer-events: none;
}

.back-to-top-btn:hover {
  box-shadow: 0 0 32px 8px #6edfff, 0 0 0 10px #4f8cff;
  background: rgba(79,140,255,0.28);
  border-color: #6edfff;
  transform: scale(1.12);
}

.back-to-top-btn:active {
  transform: scale(0.96);
}

/* 过渡动画 */
.back-to-top-enter-active,
.back-to-top-leave-active {
  transition: all 0.3s cubic-bezier(.4,0,.2,1);
}

.back-to-top-enter-from,
.back-to-top-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}

/* 响应式调整 */
@media (max-width: 375px) {
  .back-to-top-btn {
    right: 5vw;
    bottom: 25vw;
    width: 16vw;
    height: 16vw;
  }
}

@media (min-width: 768px) {
  .back-to-top-btn {
    right: 30px;
    bottom: 100px;
    width: 56px;
    height: 56px;
  }
}
</style>