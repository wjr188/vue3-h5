<template>
  <div class="completed-wrapper">
    <!-- 固定顶部 -->
    <div class="fixed-header">
      <div class="header-content">
        <div class="back-btn" @click="goBack">
          <van-icon name="arrow-left" size="20" color="#333" />
        </div>
        <div class="header-title">完结</div>
      </div>
    </div>

    <!-- 滚动容器 -->
    <div class="scroll-content" ref="scrollContent">
      <div class="content-area">
        <!-- 只有在非恢复状态且有数据时才显示网格 -->
        <div v-if="!isRestoring && visibleList.length > 0" class="grid-container">
          <div v-for="item in visibleList" :key="item.id" class="grid-item">
            <AcgCard
              :id="item.id"
              :cover="item.cover"
              :title="item.name || item.title"
              :episodeCount="item.chapter_count"
              :isSerializing="item.is_serializing"
              :data="item"
              @item-click="() => handleItemClick(item)"
            />
          </div>
        </div>

        <!-- 懒加载触发器 -->
        <div 
          ref="loadMoreTrigger" 
          class="load-more-trigger"
          v-if="!noMore && !isRestoring"
        ></div>

        <!-- 修改加载提示 - 包含恢复状态 -->
        <div v-if="isLoading || isRestoring" class="loading-tip">
          <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
          <div class="loading-text">
            {{ isRestoring ? '正在恢复页面状态...' : '客官别走，妾身马上就好~' }}
          </div>
        </div>

        <!-- 无更多数据 -->
        <div v-if="noMore && visibleList.length > 0 && !isRestoring" class="no-more-text">
          客官，妾身被你看光了，扛不住了~
        </div>

        <!-- 修改空状态 - 只有在非恢复状态且非加载状态时才显示 -->
        <div v-if="!visibleList.length && !isLoading && !isRestoring" class="empty-data-message">
          <p>暂无完结内容或数据加载失败...</p>
        </div>
      </div>
    </div>

    <!-- 返回顶部组件 -->
    <BackToTop 
      v-if="isComponentMounted"
      :scroll-container="scrollContent" 
      :threshold="200"
      :duration="500"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import AcgCard from './AcgCard.vue'
import BackToTop from './BackToTop.vue'
import { useComicCategoryStore } from '@/store/comicCategoryStore'

interface ComicItem {
  id: string | number
  title?: string
  name?: string
  cover: string
  is_serializing?: number 
  views?: number
  chapter_count?: number
  description?: string
  intro?: string
  coin?: number
  is_vip?: number
  [key: string]: any
}

// Data - 专门用于完结漫画列表
const allComics = ref<ComicItem[]>([])
const visibleList = ref<ComicItem[]>([])
const isLoading = ref(false)
const noMore = ref(false)
const page = ref(1)
const pageSize = 15
const loadMoreTrigger = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

// Router
const router = useRouter()

// Store
const comicStore = useComicCategoryStore()

// Methods
function goBack() {
  // 清理完结相关的状态
  sessionStorage.removeItem('completed-return-from')
  sessionStorage.removeItem('completed-scroll-top')
  sessionStorage.removeItem('completed-page')
  sessionStorage.removeItem('completed-visible-count')
  
  // 返回到 ACG 页面
  router.replace('/acg')
}

// 组件挂载状态标识
const isComponentMounted = ref(false)

// 滚动容器引用
const scrollContent = ref<HTMLElement | null>(null)

// 滚动位置跟踪
const currentRealScrollTop = ref(0)

function updateScrollPosition() {
  const scrollTop = scrollContent.value?.scrollTop || 0
  currentRealScrollTop.value = scrollTop
}

// 点击事件中的位置保存
function handleItemClick(item: ComicItem) {
  const scrollPosition = scrollContent.value?.scrollTop || 0
  
  if (scrollPosition > 0) {
    sessionStorage.setItem('completed-return-from', '/completed-list')
    sessionStorage.setItem('completed-scroll-top', scrollPosition.toString())
    sessionStorage.setItem('completed-page', page.value.toString())
    sessionStorage.setItem('completed-visible-count', visibleList.value.length.toString())
  }
  
  // 跳转到漫画详情页
  router.push({
    name: 'ComicDetail',
    params: { 
      id: item.id,
      type: 'comic'
    }
  })
}

// 加载完结漫画
async function loadCompletedComics(isLoadMore = false) {
  if (isLoading.value) return
  
  isLoading.value = true
  
  try {
    // ✅ 使用正确的方法名
    const response = await comicStore.loadCompletedComics({
      page: page.value,
      pageSize,
      category_id: undefined
    })
    
    const newData = response.list || []
    
    // 过滤完结漫画 - 必须是 is_serializing === 0
    const filteredData = newData.filter(item => {
      return item.is_serializing === 0
    })
    
    if (isLoadMore) {
      allComics.value.push(...filteredData)
    } else {
      allComics.value = filteredData
    }
    
    // 更新可见列表
    updateVisibleList()
    
    // 判断是否还有更多数据
    if (newData.length < pageSize) {
      noMore.value = true
    }
    
  } catch (error) {
    console.error('加载完结漫画失败:', error)
    noMore.value = true
  } finally {
    isLoading.value = false
  }
}

// 状态恢复标识
const isRestoring = ref(false)

// 状态恢复函数
async function restoreState() {
  const savedScrollTop = sessionStorage.getItem('completed-scroll-top')
  const savedPage = sessionStorage.getItem('completed-page')
  const savedVisibleCount = sessionStorage.getItem('completed-visible-count')
  
  if (savedScrollTop && savedPage && savedVisibleCount) {
    isRestoring.value = true
    
    const targetPage = Number(savedPage)
    const targetVisibleCount = Number(savedVisibleCount)
    const targetScrollTop = Number(savedScrollTop)
    
    // 重置状态
    allComics.value = []
    visibleList.value = []
    noMore.value = false
    
    // 逐页加载数据
    for (let i = 1; i <= targetPage; i++) {
      try {
        // ✅ 修改：使用正确的方法名
        const response = await comicStore.loadCompletedComics({ 
          page: i, 
          pageSize,
          category_id: undefined
        })
        
        const newData = response.list || []
        
        const filteredData = newData.filter(item => {
          return item.is_serializing === 0
        })
        
        allComics.value.push(...filteredData)
        
        if (newData.length < pageSize) {
          noMore.value = true
          break
        }
      } catch (error) {
        console.error(`加载第${i}页数据失败:`, error)
        break
      }
    }
    
    // 设置正确的页码
    page.value = targetPage
    
    // 恢复可见数量
    const actualTargetCount = Math.min(targetVisibleCount, allComics.value.length)
    visibleList.value = allComics.value.slice(0, actualTargetCount)
    
    // 数据加载完成，取消恢复状态
    isRestoring.value = false
    
    // 恢复滚动位置
    await nextTick()
    
    setTimeout(() => {
      if (scrollContent.value) {
        scrollContent.value.scrollTop = targetScrollTop
      }
      
      // 清理状态
      setTimeout(() => {
        sessionStorage.removeItem('completed-return-from')
        sessionStorage.removeItem('completed-scroll-top')
        sessionStorage.removeItem('completed-page')
        sessionStorage.removeItem('completed-visible-count')
      }, 500)
      
    }, 200)
    
  } else {
    await loadCompletedComics()
  }
}

// 更新可见列表（懒加载显示）
function updateVisibleList() {
  const batchSize = 15
  const currentVisible = visibleList.value.length
  const newItems = allComics.value.slice(currentVisible, currentVisible + batchSize)
  visibleList.value.push(...newItems)
}

// 加载更多
async function loadMore() {
  if (noMore.value || isLoading.value) return
  
  // 如果还有本地数据未显示，先显示本地数据
  if (visibleList.value.length < allComics.value.length) {
    updateVisibleList()
    return
  }
  
  // 本地数据显示完了，加载下一页
  page.value++
  await loadCompletedComics(true)
}

// 初始化懒加载观察器
function initLazyLoad() {
  if (observer) observer.disconnect()
  
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !isLoading.value && !noMore.value) {
        loadMore()
      }
    })
  }, {
    root: scrollContent.value,
    rootMargin: '100px'
  })
  
  if (loadMoreTrigger.value) {
    observer.observe(loadMoreTrigger.value)
  }
}

onMounted(async () => {
  await nextTick()
  
  if (scrollContent.value) {
    scrollContent.value.addEventListener('scroll', updateScrollPosition, { passive: true })
    isComponentMounted.value = true
  }
  
  // 检查是否从详情页返回
  const isReturning = sessionStorage.getItem('completed-return-from')
  const savedScrollTop = sessionStorage.getItem('completed-scroll-top')
  
  if (isReturning && savedScrollTop && Number(savedScrollTop) > 0) {
    await restoreState()
  } else {
    await loadCompletedComics()
  }
  
  await nextTick()
  initLazyLoad()
})

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  
  if (scrollContent.value) {
    scrollContent.value.removeEventListener('scroll', updateScrollPosition)
  }
})
</script>

<style scoped>
.completed-wrapper {
  position: relative;
  height: 100vh;
  background: #f8f8f8;
  display: flex;
  flex-direction: column;
}

.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: #fff;
  border-bottom: 1px solid #eee;
}

.header-content {
  display: flex;
  align-items: center;
  height: 12vw;
  padding: 0 4vw;
  position: relative;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 8vw;
  height: 8vw;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: background-color 0.2s;
}

.back-btn:active {
  background: rgba(0, 0, 0, 0.1);
}

.header-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 4.5vw;
  font-weight: bold; /* ✅ 修改：从 500 改为 bold */
  color: #333;
}

.scroll-content {
  flex: 1;
  margin-top: 12vw;
  width: 100%;
  overflow-y: scroll;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.scroll-content::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
  background: transparent;
}

.content-area {
  padding: 4vw;
  padding-bottom: 20px;
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

.load-more-trigger {
  height: 10px;
  width: 100%;
  margin: 20px 0;
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

@media (max-width: 375px) {
  .grid-container {
    grid-template-columns: repeat(2, 1fr);
    gap: 3vw;
  }
}

@media (min-width: 768px) {
  .grid-container {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>