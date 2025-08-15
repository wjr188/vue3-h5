<template>
  <div class="discover-wrapper" v-if="pageReady">
    <!-- 顶部吸顶标签栏 -->
    <div class="category-bar">
      <div class="category-list">
        <div
          v-for="(tag, i) in tags"
          :key="tag"
          :class="['category-item', { active: currentTag === tag }]"
          @click="onTabClick(i)"
        >{{ tag }}</div>
      </div>
    </div>

    <!-- 横向滑动 Swiper，每个slide一个分类 -->
    <swiper
      ref="swiperRef"
      class="discover-swiper"
      :initial-slide="currentIndex"
      :slides-per-view="1"
      :resistance-ratio="0.2"
      :threshold="20"
      :speed="300"
      :space-between="0"
      @swiper="onSwiperReady"
      @slideChange="onSwiperChange"
    >
      <swiper-slide v-for="(tag, i) in tags" :key="tag">
        <div class="slide-content" :ref="el => setSlideRef(el, i)" @scroll="onSlideScroll(i)">
          <!-- 分类内容 -->
          <div class="video-grid">
            <template v-if="videoMap[tag] && videoMap[tag].length">
              <VideoCardTiktok
                v-for="(item, idx) in videoMap[tag]"
                :key="item.id"
                :id="item.id"
                :index="idx"
                :category="tag"
                :cover="item.cover"
                :views="formatPlayCount(item.views)"
                :duration="item.duration"
                :title="item.title"
                :tag="item.tag"
                :tags="item.tags"
                :tagColor="item.tagColor"
                :vip="item.vip"
                :coin="item.coin"
              />
            </template>
            
            <!-- 加载更多提示 -->
            <div v-if="loadingMap[tag]" class="loading-tip">
              <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
              <div class="loading-text">客官别走，妾身马上就好~</div>
            </div>
            
            <!-- 没有更多了提示 -->
            <div v-else-if="videoMap[tag] && videoMap[tag].length > 0 && noMoreMap[tag]" class="no-more-tip">
              客官，妾身被你看光了，扛不住了~
            </div>
            
            <!-- 暂无数据 -->
            <div v-else-if="!videoMap[tag] || videoMap[tag].length === 0" class="empty-tip">暂无数据</div>
          </div>
        </div>
      </swiper-slide>
    </swiper>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onActivated, watch } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import type { Swiper as SwiperType } from 'swiper'
import type { ComponentPublicInstance } from 'vue'
import 'swiper/css'
import VideoCardTiktok from '../components/VideoCardTiktok.vue'
import { useDouyinTagsStore } from '@/store/douyinTags.store'
import { useDouyinVideosStore } from '@/store/douyin.store'

// 定义组件名，确保 keep-alive 能正确识别
defineOptions({
  name: 'TiktokDiscover'
})

// 接收父组件传递的分类参数
interface Props {
  category?: string
}
const props = withDefaults(defineProps<Props>(), {
  category: '最新'
})

interface VideoItem {
  id: string | number
  cover: string
  views: number
  duration: string
  title: string
  tag?: string
  tags?: string[]
  tagColor?: string
  vip?: boolean
  coin?: number
}

const tagStore = useDouyinTagsStore()
const douyinStore = useDouyinVideosStore()

const tags = ref<string[]>([])
const currentTag = ref<string>('')
const currentIndex = ref(0)
const swiperRef = ref<InstanceType<typeof Swiper> | null>(null)
let swiperInstance: SwiperType | null = null
const videoMap = ref<Record<string, VideoItem[]>>({})
const loadingMap = ref<Record<string, boolean>>({})
const noMoreMap = ref<Record<string, boolean>>({})
const slideRefs = ref<(HTMLElement|null)[]>([])
const pageReady = ref(false)

const pageMap = ref<Record<string, number>>({})
const isProgrammaticSlide = ref(false) // 标记是否为程序化切换，防止触发多余的请求

// 简化的状态管理 - 直接使用一个对象存储所有状态
const discoverState = ref({
  scrollPositions: {} as Record<string, number>,
  currentTag: '',
  currentIndex: 0,
  videoData: {} as Record<string, VideoItem[]>,
  loadingStates: {} as Record<string, boolean>,
  noMoreStates: {} as Record<string, boolean>
})

// 简化的状态保存和恢复
function saveState() {
  discoverState.value.currentTag = currentTag.value
  discoverState.value.currentIndex = currentIndex.value
  sessionStorage.setItem('tiktokDiscoverState', JSON.stringify(discoverState.value))
}

function restoreState() {
  const saved = sessionStorage.getItem('tiktokDiscoverState')
  if (saved) {
    try {
      const savedState = JSON.parse(saved)
      discoverState.value = { ...discoverState.value, ...savedState }
      
      // 恢复当前标签和索引
      if (savedState.currentTag && tags.value.includes(savedState.currentTag)) {
        const correctIndex = tags.value.indexOf(savedState.currentTag)
        currentTag.value = savedState.currentTag
        currentIndex.value = correctIndex
        
        // 恢复视频数据
        videoMap.value = { ...videoMap.value, ...savedState.videoData }
        loadingMap.value = { ...loadingMap.value, ...savedState.loadingStates }
        noMoreMap.value = { ...noMoreMap.value, ...savedState.noMoreStates }
        
        return true
      }
    } catch (error) {
      console.error('恢复状态失败:', error)
    }
  }
  return false
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

// 时长格式化函数
function formatDuration(seconds: number): string {
  if (!seconds) return '00:00'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

// 设置 slide ref 便于滚动等
function setSlideRef(el: Element | ComponentPublicInstance | null, i: number) {
  const element = el as HTMLElement | null
  slideRefs.value[i] = element
  // 移除在这里的滚动恢复，避免多次触发
}

// 滚动事件处理
function onSlideScroll(i: number) {
  const tag = tags.value[i]
  const el = slideRefs.value[i]
  if (el && tag === currentTag.value) {
    // 保存滚动位置
    discoverState.value.scrollPositions[tag] = el.scrollTop
    
    // 简单的节流保存
    clearTimeout(saveStateTimer)
    saveStateTimer = setTimeout(saveState, 300)
    
    const bottomOffset = el.scrollHeight - el.scrollTop - el.clientHeight
    
    if (bottomOffset < 200 && !loadingMap.value[tag] && !noMoreMap.value[tag]) {
      loadTagData(tag)
    }
  }
}

let saveStateTimer: ReturnType<typeof setTimeout>

// Swiper 初始化
function onSwiperReady(swiper: SwiperType) {
  swiperInstance = swiper
}

// 顶部 tab 点击
function onTabClick(i: number) {
  if (currentIndex.value === i) return

  // 保存当前状态
  saveCurrentScroll()

  currentIndex.value = i
  currentTag.value = tags.value[i]
  
  // 标记为程序化切换
  isProgrammaticSlide.value = true
  swiperInstance?.slideTo(i, 300)
  
  setTimeout(() => {
    isProgrammaticSlide.value = false
  }, 400)

  // 懒加载数据
  if (!videoMap.value[currentTag.value] && !loadingMap.value[currentTag.value]) {
    loadTagData(currentTag.value)
  } else {
    nextTick(() => restoreCurrentScroll())
  }

  scrollNavToActive(i)
  saveState()
}

// Swiper 滑动切换
function onSwiperChange(swiper: SwiperType) {
  // 如果是程序化切换，不执行任何操作
  if (isProgrammaticSlide.value) return
  
  // 保存当前滚动位置
  saveCurrentScroll()
  
  const idx = swiper.activeIndex
  if (idx < 0 || idx >= tags.value.length) return
  
  currentIndex.value = idx
  currentTag.value = tags.value[idx]
  
  // 懒加载
  if (!videoMap.value[currentTag.value] && !loadingMap.value[currentTag.value]) {
    loadTagData(currentTag.value)
  }
  
  scrollNavToActive(idx)
  saveState()
  
  // 恢复新标签滚动位置
  nextTick(() => restoreCurrentScroll())
}

// 滚动标签到激活可视区域
function scrollNavToActive(index: number) {
  nextTick(() => {
    const tabEl = document.querySelectorAll<HTMLDivElement>('.category-item')[index]
    const navEl = document.querySelector<HTMLDivElement>('.category-bar')
    if (tabEl && navEl) {
      const left = tabEl.offsetLeft - navEl.offsetWidth / 2 + tabEl.offsetWidth / 2
      navEl.scrollTo({ left, behavior: 'smooth' })
    }
  })
}

// 简化的滚动位置管理
function saveCurrentScroll() {
  const idx = tags.value.indexOf(currentTag.value)
  const el = slideRefs.value[idx]
  if (el) {
    discoverState.value.scrollPositions[currentTag.value] = el.scrollTop
  }
}

function restoreCurrentScroll() {
  const idx = tags.value.indexOf(currentTag.value)
  const el = slideRefs.value[idx]
  const scrollTo = discoverState.value.scrollPositions[currentTag.value] || 0
  
  if (el && scrollTo > 0) {
    setTimeout(() => {
      el.scrollTop = scrollTo
    }, 100)
  }
}

const PAGE_SIZE = 20

// 懒加载分类视频
async function loadTagData(tag: string) {
  if (loadingMap.value[tag] || noMoreMap.value[tag]) return
  loadingMap.value[tag] = true
  const page = pageMap.value[tag] || 1

  try {
    const res = await douyinStore.loadDiscoverVideos(tag, page)
    const newList = (res || []).map((item: any) => ({
      id: item.id ?? item.cover ?? Math.random(),
      cover: item.cover || '',
      views: item.views || 0,
      duration: item.duration && typeof item.duration === 'number' 
        ? formatDuration(item.duration) 
        : item.duration || '00:00',
      title: item.title || '',
      tags: item.tags || [],
      tag: item.tags?.[0] || '',
      tagColor: '#ff2c55',
      vip: item.vip || false,
      coin: item.coin || 0
    }))
    if (!videoMap.value[tag]) {
      videoMap.value[tag] = []
    }
    // 去重
    const oldIds = new Set(videoMap.value[tag].map(v => v.id))
    const filteredList = newList.filter(v => !oldIds.has(v.id))
    videoMap.value[tag] = [...videoMap.value[tag], ...filteredList]
    pageMap.value[tag] = page + 1
    noMoreMap.value[tag] = newList.length < PAGE_SIZE
    
    // 更新状态到本地存储
    discoverState.value.videoData[tag] = videoMap.value[tag]
    discoverState.value.loadingStates[tag] = false
    discoverState.value.noMoreStates[tag] = noMoreMap.value[tag]
    
    await nextTick()
    
  } catch (error) {
    console.error(`加载标签 ${tag} 数据失败:`, error)
  } finally {
    setTimeout(() => {
      loadingMap.value[tag] = false
    }, 300)
  }
}

// 监听 category 参数变化
watch(
  () => props.category,
  (newCategory) => {
    if (newCategory && tags.value.length > 0) {
      const targetIndex = tags.value.indexOf(newCategory)
      if (targetIndex >= 0 && targetIndex !== currentIndex.value) {
        // 保存当前滚动位置
        saveCurrentScroll()
        
        // 切换到新标签
        currentTag.value = newCategory
        currentIndex.value = targetIndex
        
        // 标记为程序化切换，防止触发多余请求
        isProgrammaticSlide.value = true
        
        // 直接跳转到目标位置，不使用动画
        if (swiperInstance) {
          swiperInstance.slideTo(targetIndex, 0) // 0ms，立即跳转
        }
        
        // 延迟取消标记
        setTimeout(() => {
          isProgrammaticSlide.value = false
        }, 100)
        
        // 懒加载数据
        if (!videoMap.value[currentTag.value] && !loadingMap.value[currentTag.value]) {
          loadTagData(currentTag.value)
        } else {
          nextTick(() => restoreCurrentScroll())
        }
        
        scrollNavToActive(targetIndex)
        saveState()
      }
    }
  },
  { immediate: false }
)

// 初始化
onMounted(async () => {
  await tagStore.loadTags()
  tags.value = [...tagStore.tags]
  if (tags.value.length === 0) return
  
  // 初始化默认状态
  tags.value.forEach(tag => {
    discoverState.value.scrollPositions[tag] = 0
  })
  
  // 根据传入的category参数设置初始标签
  const targetIndex = tags.value.indexOf(props.category)
  if (targetIndex >= 0) {
    currentTag.value = props.category
    currentIndex.value = targetIndex
  } else {
    currentTag.value = tags.value[0]
    currentIndex.value = 0
  }
  
  pageReady.value = true
  
  // 加载当前标签数据
  await loadTagData(currentTag.value)
  
  // 如果需要切换到指定标签，等待页面渲染完成后进行切换
  if (targetIndex >= 0) {
    nextTick(() => {
      if (swiperInstance) {
        isProgrammaticSlide.value = true
        swiperInstance.slideTo(targetIndex, 0)
        setTimeout(() => {
          isProgrammaticSlide.value = false
        }, 100)
      }
      scrollNavToActive(targetIndex)
    })
  }
})

// keep-alive 激活时恢复状态
onActivated(() => {
  if (!pageReady.value && tags.value.length > 0) {
    pageReady.value = true
  }
  
  // 尝试恢复保存的状态
  const restored = restoreState()
  
  if (restored) {
    // 状态恢复成功，切换到保存的标签
    nextTick(() => {
      if (swiperInstance && currentIndex.value !== swiperInstance.activeIndex) {
        isProgrammaticSlide.value = true
        swiperInstance.slideTo(currentIndex.value, 0)
        setTimeout(() => {
          isProgrammaticSlide.value = false
        }, 100)
      }
      
      scrollNavToActive(currentIndex.value)
      
      // 恢复滚动位置
      setTimeout(() => {
        restoreCurrentScroll()
      }, 150)
    })
  }
})
</script>

<style scoped>
.discover-wrapper {
  background: #000;
  height: 100vh;
  color: #fff;
  box-sizing: border-box;
  overflow: hidden;
  padding-top: 10.66vw;
}
.category-bar {
  position: fixed;
  top: 13.33vw;
  width: 100%;
  z-index: 10; /* 降低z-index，避免影响角标 */
  background-color: #000;
  overflow-x: auto;
  white-space: nowrap;
  padding: 1.6vw 0;
  height: 10.66vw; /* 明确设置高度 */
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.category-bar::-webkit-scrollbar {
  display: none;
}
.category-list {
  display: inline-flex;
  gap: 2.66vw;
  padding: 0 1.6vw;
  min-width: max-content;
}
.category-item {
  font-size: 3.73vw;
  color: #ccc;
  padding: 1.06vw 3.2vw;
  border-radius: 1.33vw;
  background-color: #2c2c2e;
  white-space: nowrap;
  transition: all 0.2s;
  box-shadow: inset 0 0 0.26vw #3a3a3a;
  cursor: pointer;
}
.category-item.active {
  background-color: #ff2c55;
  color: #fff;
  font-weight: bold;
}
.discover-swiper {
  margin-top: 10.66vw;
  height: calc(100vh - 34.66vw); /* 精确计算：100vh - 顶部padding(10.66vw) - 分类栏高度和位置(24vw) */
}
.slide-content {
  height: 100%;
  overflow-y: auto;
  background: #000;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.slide-content::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
}
.video-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.66vw;
  padding: 2.66vw;
  padding-bottom: 24vw; /* 原来是16vw，建议调大 */
  box-sizing: border-box;
}
.empty-tip {
  color: #999;
  text-align: center;
  padding: 20px 0;
  grid-column: 1 / -1;
}
.loading-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5.3vw 0;
  font-size: 3.73vw;
  grid-column: 1 / -1;
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
  font-size: 3.2vw;
  color: #ff5f5f;
  font-weight: 500;
}
.no-more-tip {
  font-size: 3.73vw;
  color: #999;
  text-align: center;
  font-weight: bold;
  margin: 5.3vw 0;
  grid-column: 1 / -1;
}
</style>