<template>
  <div class="limited-free-wrapper">
    <!-- 固定顶部 -->
    <div class="fixed-header">
      <div class="header-content">
        <div class="back-btn" @click="goBack">
          <van-icon name="arrow-left" size="20" color="#333" />
        </div>
        <div class="header-title">限免</div>
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
          <p>暂无限免内容或数据加载失败...</p>
        </div>
      </div>
    </div>

    <!-- ✅ 修改：只有在组件挂载完成后才显示 BackToTop -->
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

// Data - 专门用于漫画的限免列表
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

// Store - ✅ 使用漫画分类 store
const comicStore = useComicCategoryStore()

// Methods
function goBack() {
  // 清理限免相关的状态
  sessionStorage.removeItem('limited-free-return-from')
  sessionStorage.removeItem('limited-free-scroll-top')
  sessionStorage.removeItem('limited-free-page')
  sessionStorage.removeItem('limited-free-visible-count')
  
  // ✅ 返回到 ACG 页面，而不是首页
  router.replace('/acg')
}

// ✅ 添加组件挂载状态标识
const isComponentMounted = ref(false)

// ✅ 滚动容器引用
const scrollContent = ref<HTMLElement | null>(null)

// ✅ 修改滚动位置跟踪 - 使用滚动容器
const currentRealScrollTop = ref(0)

function updateScrollPosition() {
  // ✅ 从滚动容器获取滚动位置
  const scrollTop = scrollContent.value?.scrollTop || 0
  currentRealScrollTop.value = scrollTop
}

// ✅ 修改点击事件中的位置保存 - 使用滚动容器
function handleItemClick(item: ComicItem) {
  // ✅ 从滚动容器获取滚动位置
  const scrollPosition = scrollContent.value?.scrollTop || 0
  
  // ✅ 只有当位置大于 0 时才保存状态
  if (scrollPosition > 0) {
    sessionStorage.setItem('limited-free-return-from', '/limited-free-list')
    sessionStorage.setItem('limited-free-scroll-top', scrollPosition.toString())
    sessionStorage.setItem('limited-free-page', page.value.toString())
    sessionStorage.setItem('limited-free-visible-count', visibleList.value.length.toString())
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

// ✅ 使用 store 中的限免方法
async function loadLimitedFreeComics(isLoadMore = false) {
  if (isLoading.value) return
  
  isLoading.value = true
  
  try {
    const response = await comicStore.loadLimitedFreeComics({ 
      page: page.value, 
      pageSize
    })
    
    const newData = response.list || []
    
    // ✅ 严格的限免过滤条件 - 必须同时满足 is_vip === 0 和 coin === 0
    const filteredData = newData.filter(item => {
      return item.is_vip === 0 && item.coin === 0
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
    console.error('加载限免漫画失败:', error)
    noMore.value = true
  } finally {
    isLoading.value = false
  }
}

// ✅ 添加状态恢复标识
const isRestoring = ref(false)

// ✅ 修改恢复状态函数
async function restoreState() {
  const savedScrollTop = sessionStorage.getItem('limited-free-scroll-top')
  const savedPage = sessionStorage.getItem('limited-free-page')
  const savedVisibleCount = sessionStorage.getItem('limited-free-visible-count')
  
  if (savedScrollTop && savedPage && savedVisibleCount) {
    // ✅ 设置恢复状态，防止显示空状态
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
        const response = await comicStore.loadLimitedFreeComics({ 
          page: i, 
          pageSize
        })
        
        const newData = response.list || []
        
        const filteredData = newData.filter(item => {
          return item.is_vip === 0 && item.coin === 0
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
    
    // ✅ 数据加载完成，取消恢复状态
    isRestoring.value = false
    
    // ✅ 关键修复：恢复滚动容器的滚动位置
    await nextTick()
    
    setTimeout(() => {
      if (scrollContent.value) {
        scrollContent.value.scrollTop = targetScrollTop
      }
      
      // 清理状态
      setTimeout(() => {
        sessionStorage.removeItem('limited-free-return-from')
        sessionStorage.removeItem('limited-free-scroll-top')
        sessionStorage.removeItem('limited-free-page')
        sessionStorage.removeItem('limited-free-visible-count')
      }, 500)
      
    }, 200)
    
  } else {
    await loadLimitedFreeComics()
  }
}

// 更新可见列表（懒加载显示）
function updateVisibleList() {
  const batchSize = 15 // 每次显示15个
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
  await loadLimitedFreeComics(true)
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
    root: scrollContent.value, // ✅ 使用滚动容器作为根
    rootMargin: '100px'
  })
  
  if (loadMoreTrigger.value) {
    observer.observe(loadMoreTrigger.value)
  }
}

// ✅ 简化生命周期，移除复杂的滚动监听
onMounted(async () => {
  // ✅ 等待 DOM 渲染完成
  await nextTick()
  
  // ✅ 确保滚动容器已经准备好
  if (scrollContent.value) {
    scrollContent.value.addEventListener('scroll', updateScrollPosition, { passive: true })
    
    // ✅ 设置组件挂载完成标识
    isComponentMounted.value = true
  }
  
  // 检查是否从详情页返回
  const isReturning = sessionStorage.getItem('limited-free-return-from')
  const savedScrollTop = sessionStorage.getItem('limited-free-scroll-top')
  
  if (isReturning && savedScrollTop && Number(savedScrollTop) > 0) {
    await restoreState()
  } else {
    await loadLimitedFreeComics()
  }
  
  // ✅ 再等一次 nextTick 确保 BackToTop 组件能正确接收到滚动容器
  await nextTick()
  initLazyLoad()
})

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  
  // ✅ 清理滚动容器的事件监听
  if (scrollContent.value) {
    scrollContent.value.removeEventListener('scroll', updateScrollPosition)
  }
})
</script>

<style scoped>
.limited-free-wrapper {
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
  font-weight: bold;
  color: #333;
}

/* ✅ 关键样式：滚动容器 - 隐藏滚动条 */
.scroll-content {
  flex: 1;
  margin-top: 12vw;
  width: 100%;
  overflow-y: scroll; /* 必须保留scroll而非auto，否则部分浏览器不生效 */
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox隐藏滚动条 */
}

/* Chrome/Safari隐藏滚动条 */
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

/* 响应式调整 */
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
