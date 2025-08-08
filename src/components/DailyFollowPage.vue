<template>
  <div class="daily-follow-page">
    <!-- 吸顶：NavBar + Tabs -->
    <div class="sticky-header">
      <van-nav-bar
        title="每日追番"
        left-arrow
        @click-left="onBack"
      />
      <div class="tabs-wrapper">
        <div
          v-for="(day, index) in days"
          :key="index"
          class="tab-item"
          :class="{ active: index === activeTab }"
          @click="onTabChange(index)"
        >
          {{ day.label }}
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-container" v-loading="loading">
      <swiper
        class="content-swiper"
        :initial-slide="activeTab"
        @swiper="onSwiperReady"
        @slideChange="onSwiperChange"
      >
        <swiper-slide v-for="(day, index) in days" :key="index">
          <div class="slide-content" @scroll="e => onScroll(e, index)">
            <!-- 空状态 - 使用 close.png 图片 -->
            <div v-if="day.items.length === 0 && day.loaded && !day.isLoading" class="empty-state">
              <div class="empty-icon">
                <img src="/static/close.png" alt="暂无数据" class="empty-image" />
              </div>
              <p>{{ day.type === 'recent' ? '暂无更新内容' : '本日暂无固定更新' }}</p>
            </div>

            <!-- 未加载状态 - 也使用相同图片 -->
            <div v-else-if="!day.loaded && !day.isLoading" class="empty-state">
              <div class="empty-icon">
                <img src="/static/close.png" alt="点击加载" class="empty-image" />
              </div>
              <p>点击标签页加载数据</p>
            </div>

            <!-- 漫画卡片 - 修复为和 CompletedList 一样的调用方式 -->
            <div v-if="day.items.length > 0" class="grid-container">
              <div v-for="item in day.items" :key="item.id" class="grid-item">
                <AcgCard
                  :id="item.id"
                  :cover="item.cover"
                  :title="item.title"
                  :episodeCount="item.episodeCount"
                  :isSerializing="item.isSerializing"
                  :data="item"
                  @item-click="() => onItemClick(item)"
                />
              </div>
            </div>

            <!-- 🔥 懒加载提示 - 和ComicRankPage一样 -->
            <div v-if="day.isLoading" class="loading-tip">
              <img src="/icons/loading.svg" class="spinner" />
              <div class="loading-text">客官别走，妾身马上就好~</div>
            </div>
            
            <!-- 🔥 修复：完整的 class 属性 -->
            <div v-if="day.noMore && day.items.length > 0" class="no-more-text">
              客官，妾身被你弄高潮了，扛不住了~
            </div>
          </div>
        </swiper-slide>
      </swiper>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { Swiper as SwiperClass } from 'swiper/types'
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/css'
import { showToast } from 'vant'
import AcgCard from '@/components/AcgCard.vue'
import { useComicCategoryStore } from '@/store/comicCategoryStore'

// 🔥 修改类型定义，添加懒加载状态
interface Item {
  id: string
  title: string
  cover: string
  episodeCount: number
  isSerializing?: number
  views?: number
  [key: string]: any
}

interface Day {
  label: string
  type: 'weekday' | 'recent'
  dayIndex?: number
  items: Item[]
  loaded: boolean
  isLoading: boolean  // 🔥 新增：当前tab是否正在加载
  noMore: boolean     // 🔥 新增：是否没有更多数据
  currentPage: number // 🔥 新增：当前页码
}

const router = useRouter()
const comicStore = useComicCategoryStore()
const loading = ref(false)

// 🔥 修改：返回逻辑，参考 ComicRankPage 的做法
const onBack = (): void => {
  // 🔥 立即清理所有相关状态，防止循环
  const returnFrom = sessionStorage.getItem('daily-follow-return-from')
  
  if (returnFrom) {
    // 清理所有相关的 sessionStorage，防止循环
    sessionStorage.removeItem('daily-follow-return-from')
    sessionStorage.removeItem('daily-follow-state')
    // 如果还有其他相关的状态，也一起清理
    sessionStorage.removeItem('daily-follow-from-route')
  }
  
  // 🔥 使用 replace 返回到 ACG 主页，避免历史栈积累
  router.replace('/acg') // 直接使用路径，和 ComicRankPage 保持一致
}

const activeTab = ref<number>(6)
let swiperInstance: SwiperClass | null = null

// 🔥 新增：存储每个标签页的滚动位置
const scrollPositions = ref<Record<number, number>>({})

// 计算日期信息（移除数字）
const dateInfo = computed(() => {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  
  return {
    today: {
      dateStr: today.toISOString().split('T')[0]
    },
    yesterday: {
      dateStr: yesterday.toISOString().split('T')[0]
    }
  }
})

// 🔥 修改days定义，添加懒加载状态
const days = ref<Day[]>([
  { label: '周一', type: 'weekday', dayIndex: 1, items: [], loaded: false, isLoading: false, noMore: false, currentPage: 1 },
  { label: '周二', type: 'weekday', dayIndex: 2, items: [], loaded: false, isLoading: false, noMore: false, currentPage: 1 },
  { label: '周三', type: 'weekday', dayIndex: 3, items: [], loaded: false, isLoading: false, noMore: false, currentPage: 1 },
  { label: '周四', type: 'weekday', dayIndex: 4, items: [], loaded: false, isLoading: false, noMore: false, currentPage: 1 },
  { label: '周五', type: 'weekday', dayIndex: 5, items: [], loaded: false, isLoading: false, noMore: false, currentPage: 1 },
  { label: '本周', type: 'recent', items: [], loaded: false, isLoading: false, noMore: false, currentPage: 1 },
  { label: '最新', type: 'recent', items: [], loaded: false, isLoading: false, noMore: false, currentPage: 1 }
])

const loadingTabs = ref<Set<number>>(new Set())

// 🔥 新增：保存当前状态到 sessionStorage
function saveCurrentState() {
  const state = {
    activeTab: activeTab.value,
    scrollPositions: scrollPositions.value,
    days: days.value.map(day => ({
      ...day,
      // 只保存必要的状态信息
      items: day.items,
      loaded: day.loaded,
      currentPage: day.currentPage,
      noMore: day.noMore
    }))
  }
  
  sessionStorage.setItem('daily-follow-state', JSON.stringify(state))
  sessionStorage.setItem('daily-follow-return-from', 'DailyFollowPage')
}

// 🔥 新增：从 sessionStorage 恢复状态
function restoreState() {
  const savedState = sessionStorage.getItem('daily-follow-state')
  const returnFrom = sessionStorage.getItem('daily-follow-return-from')
  
  if (savedState && returnFrom === 'DailyFollowPage') {
    try {
      const state = JSON.parse(savedState)
      
      // 恢复标签页
      activeTab.value = state.activeTab || 6
      
      // 恢复滚动位置
      scrollPositions.value = state.scrollPositions || {}
      
      // 恢复数据状态
      if (state.days && Array.isArray(state.days)) {
        state.days.forEach((savedDay: any, index: number) => {
          if (days.value[index] && savedDay) {
            days.value[index].items = savedDay.items || []
            days.value[index].loaded = savedDay.loaded || false
            days.value[index].currentPage = savedDay.currentPage || 1
            days.value[index].noMore = savedDay.noMore || false
          }
        })
      }
      
      // 恢复滚动位置需要在下一帧执行
      nextTick(() => {
        restoreScrollPosition()
      })
      
      return true
    } catch (error) {
      // 静默处理错误
    }
  }
  
  return false
}

// 🔥 新增：恢复滚动位置
function restoreScrollPosition() {
  const savedScrollTop = scrollPositions.value[activeTab.value]
  if (savedScrollTop && typeof savedScrollTop === 'number') {
    // 🔥 修复：使用正确的选择器找到当前激活的滚动容器
    setTimeout(() => {
      // 方法1：通过 Swiper 实例获取当前激活的 slide
      if (swiperInstance) {
        const activeSlide = swiperInstance.slides[activeTab.value]
        if (activeSlide) {
          const slideContent = activeSlide.querySelector('.slide-content') as HTMLElement
          if (slideContent) {
            slideContent.scrollTop = savedScrollTop
            return
          }
        }
      }
      
      // 方法2：备用方案 - 直接查找
      const allSlideContents = document.querySelectorAll('.slide-content')
      const targetSlideContent = allSlideContents[activeTab.value] as HTMLElement
      if (targetSlideContent) {
        targetSlideContent.scrollTop = savedScrollTop
      }
    }, 100) // 增加延迟，确保 Swiper 渲染完成
  }
}

// 🔥 修改滚动监听，记录滚动位置
function onScroll(e: Event, tabIndex: number) {
  const target = e.target as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = target
  
  // 记录当前标签页的滚动位置
  scrollPositions.value[tabIndex] = scrollTop
  
  // 只有当前激活的标签页才触发懒加载
  if (activeTab.value !== tabIndex) return
  
  // 距离底部100px时触发加载更多
  if (scrollHeight - scrollTop - clientHeight < 100) {
    loadMore(tabIndex)
  }
}

// 🔥 新增：加载更多数据
async function loadMore(tabIndex: number) {
  const day = days.value[tabIndex]
  
  // 如果已经没有更多数据，或者正在加载中，则不执行
  if (day.noMore || day.isLoading) return
  
  day.isLoading = true
  day.currentPage += 1
  
  try {
    let data: any[] = []
    
    if (day.type === 'recent') {
      if (tabIndex === 6) { 
        const result = await comicStore.loadDailyUpdates({
          page: day.currentPage,
          pageSize: 15 // 🔥 修改为 15
        })
        data = result.list || []
      } else { 
        const result = await comicStore.loadWeeklyAllUpdates({
          page: day.currentPage,
          pageSize: 15 // 🔥 修改为 15
        })
        data = result.list || []
      }
    } else if (day.type === 'weekday' && day.dayIndex) {
      const result = await comicStore.loadWeeklyUpdates({
        updateDay: day.dayIndex,
        page: day.currentPage,
        pageSize: 15 // 🔥 修改为 15
      })
      data = result.list || []
    }
    
    if (data.length > 0) {
      const formattedItems = data.map(formatComicItem)
      day.items = [...day.items, ...formattedItems]
    } else {
      day.noMore = true
    }
    
  } catch (error) {
    console.error(`❌ 加载更多${day.label}数据失败:`, error)
    day.currentPage -= 1
  } finally {
    day.isLoading = false
  }
}

// 🔥 修改原有的loadTabData方法，优化初次加载逻辑
async function loadTabData(tabIndex: number) {
  const day = days.value[tabIndex]
  
  if (day.loaded || loadingTabs.value.has(tabIndex)) return
  
  loadingTabs.value.add(tabIndex)
  loading.value = true
  
  try {
    let data: any[] = []
    
    if (day.type === 'recent') {
      if (tabIndex === 6) { 
        const result = await comicStore.loadDailyUpdates({
          page: 1,
          pageSize: 15 // 🔥 修改为 15
        })
        data = result.list || []
      } else { 
        const result = await comicStore.loadWeeklyAllUpdates({
          page: 1,
          pageSize: 15 // 🔥 修改为 15
        })
        data = result.list || []
      }
    } else if (day.type === 'weekday' && day.dayIndex) {
      const result = await comicStore.loadWeeklyUpdates({
        updateDay: day.dayIndex,
        page: 1,
        pageSize: 15 // 🔥 修改为 15
      })
      data = result.list || []
    }
    
    const formattedItems = data.map(formatComicItem)
    
    // 🔥 更新数据和状态
    days.value[tabIndex].items = formattedItems
    days.value[tabIndex].loaded = true
    
    // 🔥 修改判断逻辑，统一使用 15
    if (data.length < 15) {
      day.noMore = true
    }
    
  } catch (error) {
    console.error(`❌ 加载${day.label}数据失败:`, error)
    showToast(`加载${day.label}数据失败，请稍后重试`)
  } finally {
    loadingTabs.value.delete(tabIndex)
    loading.value = false
  }
}

// 格式化漫画项目 - 修复字段映射，匹配 AcgCard 组件
function formatComicItem(comic: any): Item {
  return {
    id: comic.id?.toString() || '',
    title: comic.name || comic.title || '', // AcgCard 期望 title 字段
    cover: comic.cover || '',
    episodeCount: comic.chapter_count || 0, // AcgCard 期望 episodeCount 字段
    isSerializing: comic.is_serializing, // AcgCard 期望 isSerializing 字段
    views: comic.views || 0,
    // 保留所有原始数据
    ...comic
  }
}

// 🔥 修改组件挂载逻辑
onMounted(() => {
  // 先尝试恢复状态
  const restored = restoreState()
  
  if (restored) {
    // 🔥 增加延迟确保 Swiper 完全初始化
    setTimeout(() => {
      if (swiperInstance) {
        swiperInstance.slideTo(activeTab.value, 0)
      }
      // 再次尝试恢复滚动位置
      setTimeout(() => {
        restoreScrollPosition()
      }, 200)
    }, 100)
  } else {
    // 如果没有保存的状态，加载默认标签页
    loadTabData(activeTab.value)
  }
})

// 🔥 新增：组件销毁前清理
onBeforeUnmount(() => {
  // 清理 sessionStorage 中的状态（可选）
  // sessionStorage.removeItem('daily-follow-state')
  // sessionStorage.removeItem('daily-follow-return-from')
})

// 🔥 新增：路由离开前保存状态
onBeforeRouteLeave(() => {
  saveCurrentState()
})

const onTabChange = (index: number): void => {
  if (activeTab.value === index) return
  
  // 🔥 保存当前标签页的滚动位置 - 修复选择器
  if (swiperInstance && swiperInstance.slides[activeTab.value]) {
    const currentSlideContent = swiperInstance.slides[activeTab.value].querySelector('.slide-content') as HTMLElement
    if (currentSlideContent) {
      scrollPositions.value[activeTab.value] = currentSlideContent.scrollTop
    }
  }
  
  activeTab.value = index
  if (swiperInstance) {
    swiperInstance.slideTo(index, 300)
  }
  
  setTimeout(() => {
    loadTabData(index)
    // 🔥 恢复新标签页的滚动位置 - 修复选择器
    nextTick(() => {
      setTimeout(() => {
        if (swiperInstance && swiperInstance.slides[index]) {
          const newSlideContent = swiperInstance.slides[index].querySelector('.slide-content') as HTMLElement
          const savedScrollTop = scrollPositions.value[index]
          if (newSlideContent && savedScrollTop) {
            newSlideContent.scrollTop = savedScrollTop
          }
        }
      }, 100)
    })
  }, 50)
}

// 🔥 修改：Swiper 滑动切换时的滚动位置处理
const onSwiperChange = (swiper: SwiperClass): void => {
  const newIndex = swiper.activeIndex
  
  if (activeTab.value === newIndex) return
  
  // 🔥 保存旧标签页的滚动位置 - 修复选择器
  if (swiperInstance && swiperInstance.slides[activeTab.value]) {
    const oldSlideContent = swiperInstance.slides[activeTab.value].querySelector('.slide-content') as HTMLElement
    if (oldSlideContent) {
      scrollPositions.value[activeTab.value] = oldSlideContent.scrollTop
    }
  }
  
  activeTab.value = newIndex
  loadTabData(newIndex)
  
  // 🔥 恢复新标签页的滚动位置 - 修复选择器
  setTimeout(() => {
    if (swiperInstance && swiperInstance.slides[newIndex]) {
      const newSlideContent = swiperInstance.slides[newIndex].querySelector('.slide-content') as HTMLElement
      const savedScrollTop = scrollPositions.value[newIndex]
      if (newSlideContent && savedScrollTop) {
        newSlideContent.scrollTop = savedScrollTop
      }
    }
  }, 150)
}

// 🔥 修改：Swiper 准备就绪后恢复滚动位置
const onSwiperReady = (swiper: SwiperClass): void => {
  swiperInstance = swiper
  swiperInstance.slideTo(activeTab.value, 0)
  
  // 🔥 Swiper 准备完成后，尝试恢复滚动位置
  setTimeout(() => {
    const savedScrollTop = scrollPositions.value[activeTab.value]
    if (savedScrollTop) {
      restoreScrollPosition()
    }
  }, 150)
}

// 🔥 修改点击项目时保存状态
const onItemClick = (item: Item): void => {
  // 在跳转前保存当前状态
  saveCurrentState()
  
  router.push({
    name: 'ComicDetail',
    params: { 
      id: item.id,
      type: 'comic'
    }
  })
}
</script>

<style scoped>
.daily-follow-page {
  background: #f6f6f6;
  min-height: 100vh;
}

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
}

.tabs-wrapper {
  display: flex;
  justify-content: space-around;
  padding: 2.1vw 0;
  border-bottom: 0.27vw solid #eee;
}
.tab-item {
  font-size: 4vw;
  font-weight: 600;
  color: #a19b9b;
  padding: 1.6vw 2.1vw;
  cursor: pointer;
  flex: 1;
  text-align: center;
}
.tab-item.active {
  color: #000;
}

.content-swiper {
  height: calc(100vh - 25.6vw);
}

/* 🔥 修改：隐藏滚动条，和 ComicRankPage 一样 */
.slide-content {
  padding: 2.1vw;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  height: 100%;
  /* 🔥 隐藏滚动条的样式 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE 和 Edge */
}

/* 🔥 隐藏 WebKit 浏览器（Chrome、Safari）的滚动条 */
.slide-content::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2.5vw;
  margin-bottom: 6vw;
}

.grid-item {
  position: relative;
}

/* 空状态样式 */
.empty-state {
  text-align: center;
  padding: 8vw 4vw;
  color: #999;
}

.empty-icon {
  margin-bottom: 4vw;
  display: flex;
  justify-content: center;
  align-items: center;
}

.empty-image {
  width: 48vw;
  height: 48vw;
  object-fit: contain;
  opacity: 0.6;
}

.empty-state p {
  font-size: 4vw;
  margin: 0;
  margin-top: 3vw;
  line-height: 1.5;
}

/* 🔥 懒加载提示样式 - 和ComicRankPage一样 */
.loading-tip,
.no-more-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 3.7vw;
  padding: 5.3vw 0;
}

.spinner {
  width: 8vw;
  height: 8vw;
  animation: spin 1s linear infinite;
  margin-bottom: 2vw;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 2vw;
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

.content-container[v-loading] .slide-content {
  min-height: 50vh;
}
</style>
