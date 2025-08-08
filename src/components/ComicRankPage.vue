<template>
  <div class="video-rank-page">
    <!-- 顶部区域 吸顶 -->
    <div class="header-container">
      <div class="top-banner">
        <img src="/static/1234.png" class="bg-img" />
        <img src="/static/manhuabandan.png" class="center-img" />
        <div class="back-btn" @click="goBack">
          <van-icon name="arrow-left" size="25" color="#333" />
        </div>
        <div class="main-tab-row">
          <div
            v-for="(tab, i) in mainTabs"
            :key="tab"
            :class="['main-tab', { active: mainTab === i }]"
            @click="onMainTabClick(i)"
          >
            {{ tab }}
            <div v-if="mainTab === i" class="main-tab-indicator"></div>
          </div>
        </div>
      </div>
      <div class="sub-tab-container">
        <div
          v-for="(sub, i) in subTabs"
          :key="sub"
          :class="['sub-tab', { active: subTab === i }]"
          @click="onSubTabClick(i)"
        >
          {{ sub }}
        </div>
      </div>
    </div>

    <!-- 横滑区域，每个tab独立scroll容器 -->
    <van-swipe
      :key="mainTab"
      ref="swiperRef"
      v-model:active="subTab"
      :loop="false"
      :show-indicators="false"
      class="swipe-content"
      @change="onSwipeChange"
    >
      <van-swipe-item v-for="(sub, idx) in subTabs" :key="sub">
        <div
          class="tab-scroll-content"
          :ref="el => setTabScrollRef(idx, el)"
          @scroll="e => onTabScroll(e, idx)"
        >
          <div
            v-for="(item, index) in tabStates[mainTab][idx].visibleList"
            :key="item.id"
            class="video-item"
            @click="() => goToDetail(item)"
          >
            <div class="thumb">
              <img v-lazy="item.cover" />
              <van-tag
                :type="getRankType(index)"
                :style="getRankStyle(index)"
                class="rank-tag"
              >
                {{ index + 1 }}
              </van-tag>
            </div>
            <div class="info">
              <div class="title">{{ item.title }}</div>
              <div class="tags">
                <van-tag
                  v-for="tag in item.tags"
                  :key="tag"
                  color="#FF5BA5"
                  :style="{ fontSize: '3.2vw' }"
                >
                  {{ tag }}
                </van-tag>
              </div>
              <div class="meta-bar">
                <span>阅读: {{ formatViews(item.views) }}</span>
                <span>点赞: {{ formatViews(item.likes) }}</span>
              </div>
            </div>
          </div>
          <!-- 懒加载/无数据提示 -->
          <div
            v-if="tabStates[mainTab][idx].isLoading"
            class="loading-tip"
          >
            <img src="/icons/loading.svg" class="spinner" />
            <div class="loading-text">客官别走，妾身马上就好~</div>
          </div>
          <div
            v-if="tabStates[mainTab][idx].noMore && tabStates[mainTab][idx].visibleList.length"
            class="no-more-text"
          >
            客官，妾身被你弄高潮了，扛不住了~
          </div>
          <div
            v-if="!tabStates[mainTab][idx].visibleList.length && !tabStates[mainTab][idx].isLoading"
            class="no-more-text"
          >
            暂无数据
          </div>
          <div
            :ref="el => setSentinelRef(idx, el)"
            class="load-more-trigger"
          ></div>
        </div>
      </van-swipe-item>
    </van-swipe>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount, onActivated, type ComponentPublicInstance } from 'vue'
import { useRouter } from 'vue-router'
import { useComicCategoryStore } from '@/store/comicCategoryStore'

// 1. tab配置
interface VideoItem {
  id: number
  title: string
  cover: string
  tags: string[]
  views: number
  likes: number
}
const mainTabs = ['人气榜', '点赞榜', '收藏榜']
const subTabs = ['日榜', '周榜', '月榜', '年榜']
const mainTab = ref(0)
const subTab = ref(0)
const isRestoring = ref(false)
const restoringScroll = ref(0)
const scrollSaveTimer = ref<number | null>(null)
const comicStore = useComicCategoryStore()
const { loadComicRankList } = comicStore
const actionArr = ['view', 'like', 'collect'] as const
const rangeArr = ['day', 'week', 'month', 'year'] as const

// 2. 独立tab数据和滚动
interface TabState {
  allVideos: VideoItem[]
  visibleList: VideoItem[]
  isLoading: boolean
  noMore: boolean
  hasLoaded: boolean
}

const tabStates = ref<TabState[][]>(
  Array.from({ length: mainTabs.length }, () =>
    Array.from({ length: subTabs.length }, () => ({
      allVideos: [],
      visibleList: [],
      isLoading: false,
      noMore: false,
      hasLoaded: false,
    }))
  )
)

// 4. tab切换
const swiperRef = ref()

function onMainTabClick(i: number) {
  if (mainTab.value !== i) {
    mainTab.value = i
    subTab.value = 0
    nextTick(() => {
      swiperRef.value?.swipeTo?.(0)
    })
  }
}

function onSubTabClick(i: number) {
  if (subTab.value !== i) {
    subTab.value = i
    swiperRef.value?.swipeTo?.(i)
  }
}

function onSwipeChange(i: number) {
  if (subTab.value !== i) {
    subTab.value = i
  }
}

// 数据加载监听
watch([mainTab, subTab], ([mainIdx, subIdx]) => {
  const state = tabStates.value[mainIdx][subIdx];
  if (!state.hasLoaded && !state.isLoading) {
    loadRankData(mainIdx, subIdx);
  }
}, { immediate: false });

// 5. 多tab独立滚动ref/记忆
const tabScrollRefs = ref<(HTMLElement | null)[]>([])

function setTabScrollRef(idx: number, el: Element | ComponentPublicInstance | null) {
  if (el && el instanceof HTMLElement) {
    tabScrollRefs.value[idx] = el
  } else {
    tabScrollRefs.value[idx] = null
  }
}

function onTabScroll(e: Event, idx: number) {
  // 实时保存当前tab的滚动位置
  const target = e.target as HTMLElement
  if (target && idx === subTab.value) {
    // 防抖保存，避免频繁写入
    if (scrollSaveTimer.value) {
      clearTimeout(scrollSaveTimer.value)
    }
    scrollSaveTimer.value = setTimeout(() => {
      sessionStorage.setItem('acg-rank-scroll', target.scrollTop.toString())
    }, 100)
  }
}

function restoreTabScroll(idx: number) {
  // 简化滚动恢复逻辑
}

// 6. 懒加载
const sentinels = ref<(HTMLElement|null)[]>([])
const observers = ref<(IntersectionObserver|null)[]>([])

function setSentinelRef(idx: number, el: Element | ComponentPublicInstance | null) {
  if (el && el instanceof HTMLElement) {
    sentinels.value[idx] = el
    nextTick(() => initObserver(idx))
  } else {
    sentinels.value[idx] = null
  }
}

function initObserver(idx: number) {
  if (observers.value[idx]) observers.value[idx]?.disconnect()
  const el = sentinels.value[idx]
  if (!el) return
  
  observers.value[idx] = new IntersectionObserver(
    (entries) => {
      const isCurrentTab = subTab.value === idx
      const isIntersecting = entries[0].isIntersecting
      
      if (isIntersecting && isCurrentTab) {
        loadMore(mainTab.value, idx)
      }
    },
    { root: tabScrollRefs.value[idx], rootMargin: '0px 0px 100px 0px', threshold: 0.1 }
  )
  observers.value[idx]?.observe(el)
}

onBeforeUnmount(() => {
  observers.value.forEach(o => o?.disconnect())
  if (scrollSaveTimer.value) {
    clearTimeout(scrollSaveTimer.value)
  }
})

// 懒加载
async function loadMore(mainIdx = mainTab.value, subIdx = subTab.value) {
  const state = tabStates.value[mainIdx][subIdx]
  if (state.noMore || state.isLoading) {
    return
  }
  
  state.isLoading = true
  const action = actionArr[mainIdx]
  const range = rangeArr[subIdx]
  
  try {
    const res = await comicStore.loadMoreComicRankList(action, range)
    
    if (res && res.list && res.list.length > 0) {
      const newList = res.list.map((item: any) => ({
        id: Number(item.id),
        title: String(item.name || item.title || ''),
        cover: String(item.cover || ''),
        tags: Array.isArray(item.tags) ? item.tags : [],
        views: Number(item.view_count ?? item.views ?? 0),
        likes: Number(item.like_count ?? item.likes ?? 0),
      }))
      
      state.visibleList = [...res.list]
      state.allVideos = [...state.visibleList]
    }
    
    state.noMore = !res || res.noMore || (res.list && res.list.length === 0)
    
  } catch (error) {
    console.error('💥 加载更多数据失败:', error)
    state.noMore = true
  } finally {
    state.isLoading = false
  }
}

// 7. 详情跳转
const router = useRouter()

function goBack() { 
  // 检查是否存在返回循环的情况
  const returnFrom = sessionStorage.getItem('acg-rank-return-from')
  
  // 如果存在从详情页返回的标记，清理并使用 replace 返回
  if (returnFrom) {
    // 清理所有相关的 sessionStorage，防止循环
    sessionStorage.removeItem('acg-rank-return-from')
    sessionStorage.removeItem('acg-rank-tab')
    sessionStorage.removeItem('acg-rank-sub')
    sessionStorage.removeItem('acg-rank-scroll')
  }
  
  // 榜单页面通常是从 ACG 页面进入的，直接返回 ACG 页面
  router.replace('/acg')
}

function goToDetail(item: VideoItem) {
  // 记录当前状态到sessionStorage
  sessionStorage.setItem('acg-rank-return-from', window.location.pathname + window.location.search)
  sessionStorage.setItem('acg-rank-tab', mainTab.value.toString())
  sessionStorage.setItem('acg-rank-sub', subTab.value.toString())
  
  // 获取当前tab的实时滚动位置
  const currentScrollTop = tabScrollRefs.value[subTab.value]?.scrollTop || 0
  sessionStorage.setItem('acg-rank-scroll', currentScrollTop.toString())
  
  // 跳转到详情页
  router.push({
    name: 'ComicDetail',
    params: { id: item.id, source: 'rank' }
  })
}

// 8. 加载数据
async function loadRankData(mainIdx = mainTab.value, subIdx = subTab.value) {
  const state = tabStates.value[mainIdx][subIdx];
  if (state.hasLoaded) return;

  state.isLoading = true;
  try {
    const actionMap = ['view', 'like', 'collect'] as const;
    const rangeMap = ['day', 'week', 'month', 'year'] as const;
    const params = {
      action: actionMap[mainIdx],
      range: rangeMap[subIdx],
      page: 1,
      pageSize: 15,
    };
    
    const res = await loadComicRankList(params);

    state.allVideos = (res?.list || []).map((item: any) => ({
      id: Number(item.id),
      title: String(item.name || item.title || ''),
      cover: String(item.cover || ''),
      tags: Array.isArray(item.tags) ? item.tags : [],
      views: Number(item.view_count ?? item.views ?? 0),
      likes: Number(item.like_count ?? item.likes ?? 0),
    }));

    state.visibleList = state.allVideos.slice(0, 15);

    const apiReturnedLessThanPageSize = (res?.list?.length || 0) < 15;
    const localDataExhausted = state.visibleList.length >= state.allVideos.length;
    
    state.noMore = apiReturnedLessThanPageSize && localDataExhausted;
    state.hasLoaded = true;
    
  } catch (error) {
    state.allVideos = [];
    state.visibleList = [];
    state.noMore = true;
    console.error('💥 加载排行榜数据失败:', error);
  } finally {
    state.isLoading = false;
  }
}

// 等待数据加载完成和DOM准备就绪
async function waitForDataAndDomReady(mainIdx: number, subIdx: number) {
  return new Promise<void>((resolve) => {
    let attempts = 0
    const maxAttempts = 40 // 最多等待2秒
    
    const checkReady = () => {
      const state = tabStates.value[mainIdx][subIdx]
      const hasData = state.hasLoaded && state.visibleList.length > 0
      const hasDom = tabScrollRefs.value[subIdx] != null
      
      if (hasData && hasDom) {
        setTimeout(resolve, 100)
        return
      }
      
      attempts++
      if (attempts >= maxAttempts) {
        resolve()
        return
      }
      
      setTimeout(checkReady, 50)
    }
    
    checkReady()
  })
}

// 组件挂载时处理记忆恢复
onMounted(() => {
  const savedTab = sessionStorage.getItem('acg-rank-tab')
  const savedSub = sessionStorage.getItem('acg-rank-sub')
  const savedScroll = sessionStorage.getItem('acg-rank-scroll')
  
  if (savedTab && savedSub) {
    const tabIndex = Number(savedTab)
    const subIndex = Number(savedSub)
    
    // 恢复tab状态
    mainTab.value = tabIndex
    subTab.value = subIndex

    nextTick(async () => {
      // 恢复swiper位置
      swiperRef.value?.swipeTo?.(subIndex)

      // 等待数据加载完成和DOM渲染
      await waitForDataAndDomReady(tabIndex, subIndex)
      
      // 恢复滚动位置
      if (savedScroll && tabScrollRefs.value[subIndex]) {
        const scrollTop = parseInt(savedScroll, 10)
        tabScrollRefs.value[subIndex]!.scrollTop = scrollTop
      }
      
      // 状态恢复完成后，延迟清理sessionStorage，确保滚动位置已设置
      setTimeout(() => {
        sessionStorage.removeItem('acg-rank-return-from')
        sessionStorage.removeItem('acg-rank-tab')
        sessionStorage.removeItem('acg-rank-sub')
        sessionStorage.removeItem('acg-rank-scroll')
      }, 200)
    })
    
    // 不在这里立即清理，等待状态恢复完成后再清理
  } else {
    // 首次进入，加载默认tab的数据
    const state = tabStates.value[mainTab.value][subTab.value]
    if (!state.hasLoaded && !state.isLoading) {
      loadRankData(mainTab.value, subTab.value)
    }
  }
})

// 组件激活时处理记忆恢复（用于keep-alive场景）
onActivated(() => {
  const savedTab = sessionStorage.getItem('acg-rank-tab')
  const savedSub = sessionStorage.getItem('acg-rank-sub')
  const savedScroll = sessionStorage.getItem('acg-rank-scroll')
  const returnFrom = sessionStorage.getItem('acg-rank-return-from')
  
  // 只有从详情页返回时才执行恢复逻辑
  if (returnFrom && savedTab && savedSub) {
    const tabIndex = Number(savedTab)
    const subIndex = Number(savedSub)
    
    // 恢复tab状态
    if (mainTab.value !== tabIndex || subTab.value !== subIndex) {
      mainTab.value = tabIndex
      subTab.value = subIndex

      nextTick(async () => {
        // 恢复swiper位置
        swiperRef.value?.swipeTo?.(subIndex)

        // 等待数据加载完成和DOM渲染
        await waitForDataAndDomReady(tabIndex, subIndex)
        
        // 恢复滚动位置
        if (savedScroll && tabScrollRefs.value[subIndex]) {
          const scrollTop = parseInt(savedScroll, 10)
          tabScrollRefs.value[subIndex]!.scrollTop = scrollTop
        }
        
        // 状态恢复完成后清理
        setTimeout(() => {
          sessionStorage.removeItem('acg-rank-return-from')
          sessionStorage.removeItem('acg-rank-tab')
          sessionStorage.removeItem('acg-rank-sub')
          sessionStorage.removeItem('acg-rank-scroll')
        }, 200)
      })
    }
  }
})

// 工具函数
function getRankType(i: number) {
  if (i === 0) return 'primary'
  if (i === 1) return 'success'
  if (i === 2) return 'warning'
  return 'default'
}

function getRankStyle(i: number) {
  if (i === 0) {
    return {
      background: 'linear-gradient(45deg, #FFD700, #FFA500)',
      border: '1px solid #FF8C00',
      color: '#fff'
    }
  }
  if (i === 1) {
    return {
      background: 'linear-gradient(45deg, #C0C0C0, #A9A9A9)',
      border: '1px solid #999',
      color: '#fff'
    }
  }
  if (i === 2) {
    return {
      background: 'linear-gradient(45deg, #CD7F32, #A0522D)',
      border: '1px solid #A0522D',
      color: '#fff'
    }
  }
  return {}
}

function formatViews(val: number) {
  if (val >= 10000) return (val / 10000).toFixed(2) + 'w'
  if (val >= 1000) return (val / 1000).toFixed(2) + 'k'
  return val.toString()
}
</script>

<style scoped>
.video-rank-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #fff;
}
.header-container {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #fff;
}
.swipe-content {
  min-height: 133vw;
  height: calc(100vh - 100px);
}
.tab-scroll-content {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  height: 100%;
  background: #fff;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.tab-scroll-content::-webkit-scrollbar {
  display: none !important;
}
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
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.load-more-trigger {
  height: 13.3vw;
}
.top-banner {
  position: relative;
  width: 100%;
}
.bg-img {
  width: 100%;
  display: block;
  height: 20vw;
  object-fit: cover;
}
.center-img {
  position: absolute;
  bottom: 10.7vw;
  left: 50%;
  width: 26vw;
  transform: translateX(-50%);
}
.back-btn {
  position: absolute;
  top: 2.7vw;
  left: 2.7vw;
  background: rgba(255, 255, 255, 0.6);
  padding: 1.6vw;
  border-radius: 50%;
}
.main-tab-row {
  position: absolute;
  bottom: 1.6vw;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 8vw;
}
.main-tab {
  position: relative;
  font-size: 4vw;
  color: #0e0404;
  padding: 1vw 2vw;
}
.main-tab.active {
  font-weight: bold;
}
.main-tab-indicator {
  position: absolute;
  bottom: -0.5vw;
  left: 50%;
  transform: translateX(-50%);
  width: 4.2vw;
  height: 0.5vw;
  background: #333;
  border-radius: 0.27vw;
}
.sub-tab-container {
  display: flex;
  justify-content: space-around;
  padding: 2.1vw 0;
  background: #454140;
}
.sub-tab {
  font-size: 3.5vw;
  color: #fff;
  padding: 0.13vw 8vw;
  border-radius: 1.1vw;
  background: rgba(255, 255, 255, 0.1);
}
.sub-tab.active {
  background: #fff;
  color: #3a2a26;
}
.video-item {
  display: flex;
  padding: 1.1vw 2.1vw;
  align-items: flex-start;
  min-height: auto;
}
.thumb {
  position: relative;
  width: 25vw;
  height: calc(25vw * 1.4);
  flex-shrink: 0;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 1.1vw;
}
.rank-tag {
  position: absolute;
  top: 1.1vw;
  left: 1.1vw;
  font-size: 4vw;
  border-radius: 1.1vw;
  padding: 0 1.6vw;
  line-height: 4.8vw;
  font-weight: bold;
}
.info {
  flex: 1;
  margin-left: 2.7vw;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 34vw;
}
.title {
  font-size: 4vw;
  font-weight: bold;
  margin-bottom: 1.1vw;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 1.9vw;
  margin-top: 4vw;
  margin-bottom: 0.8vw;
}
.meta-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 3.5vw;
  color: #888;
  padding-top: 0.5vw;
  margin-top: auto;
}
</style>
