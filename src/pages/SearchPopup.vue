<template>
  <div class="search-popup">
    <!-- 固定顶部搜索栏 -->
    <van-sticky :offset-top="0" z-index="100">
      <div class="top-bar">
        <img src="/static/back.png" alt="返回" class="back-icon" @click="router.back()" />
        <div class="search-bar">
          <img src="/static/menu.png" alt="菜单" class="menu-icon" />
          <span class="menu-text">片库</span>
          <span class="divider">|</span>
          <input 
            v-model="keyword" 
            type="text" 
            placeholder="请输入关键词" 
            @input="onInputChange"
            @keyup.enter="onSearch" 
            class="search-input"
            ref="searchInput"
          />
          <span v-if="keyword" class="clear-icon" @click="clearKeyword">×</span>
        </div>
        <span class="search-btn" @click="onSearch">搜索</span>
      </div>
    </van-sticky>

    <!-- 单容器滚动区域 -->
    <div class="content-container" ref="scrollContainer" @scroll="handleScroll">
      <!-- 热门标签区 -->
      <div class="tags-section" ref="tagsSectionRef">
        <div v-if="history.length" class="section-row">
          <span class="section-title">历史记录</span>
          <img src="/static/delete.png" class="action-icon" @click="clearHistory" />
        </div>
        <div v-if="history.length" class="tag-list">
          <div class="tag" v-for="item in history" :key="item" @click="applyKeyword(item)">
            {{ item }}
          </div>
        </div>

        <div class="section-row">
          <span class="section-title">热门标签</span>
          <img src="/static/refresh.png" class="action-icon" @click="refreshTags" />
        </div>
        <div class="tag-list">
          <div v-if="tagsLoading" style="color:#999;">加载中...</div>
          <div
            v-else
            class="tag"
            v-for="tag in tags"
            :key="tag"
            :class="{ active: activeTag === tag }"
            @click="applyKeyword(tag)"
          >
            {{ tag }}
          </div>
        </div>
      </div>

      <!-- Tab栏，吸顶 -->
      <div class="sort-tab-sticky" :class="{ sticky: isTabSticky }">
        <div class="sort-tab">
          <span
            v-for="(tab, i) in tabs"
            :key="i"
            :class="{ active: currentTab === i }"
            @click="switchTab(i)"
          >
            {{ tab }}
          </span>
        </div>
      </div>

      <!-- 内容区 -->
      <div class="content-area">
        <!-- 内容区横滑切换 -->
        <van-swipe
          ref="swipeRef"
          class="swipe-content"
          :loop="false"
          :show-indicators="false"
          v-model:active="currentTab"
          @change="onSwipeChange"
        >
          <van-swipe-item v-for="(tab, tabIndex) in tabs" :key="tab">
            <div>
              <div class="tab-header" v-if="keyword || activeTag">
                <span class="search-indicator">
                  当前搜索: <strong>{{ activeTag || keyword }}</strong>
                </span>
                <span class="clear-search" @click="clearSearch">
                  <img src="/static/close.png" alt="清除搜索" class="clear-icon" />
                  清除搜索
                </span>
              </div>
              
              <div class="video-list">
                <div
                  class="video-item"
                  v-for="video in tabStates[tabIndex].list"
                  :key="video.id"
                  @click="goToPlay(video)"
                >
                  <div class="thumb-wrap">
                    <img :src="video.cover" class="thumb" />
                    <CardCornerIcon
                      :isVip="video.vip"
                      :coinAmount="video.vip ? 0 : video.coin"
                    />
                    <!-- 播放量和时长 -->
                    <div class="video-info-overlay">
                      <span class="views">
                        <img src="/icons/play4.svg" class="play-icon" />
                        {{ formatPlayCount(video.play) }}
                      </span>
                      <span class="duration">{{ formatDuration(video.duration) }}</span>
                    </div>
                  </div>
                  <div class="info">
                    <div class="title">{{ video.title }}</div>
                    <!-- 标签展示 -->
                    <div class="tag-row">
                      <span v-if="video.tags && video.tags.length" class="video-tag">{{ video.tags[0] }}</span>
                    </div>
                  </div>
                </div>
                <div
                  v-if="tabStates[tabIndex].hasMore && !tabStates[tabIndex].loading"
                  :ref="setSentinel(tabIndex)"
                  class="load-more-trigger"
                ></div>
              </div>
              <div v-if="tabStates[tabIndex].loading" class="loading-tip">
                <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
                <div class="loading-text">客官别走，妾身马上就好~</div>
              </div>
              <div v-if="!tabStates[tabIndex].hasMore && tabStates[tabIndex].list.length > 0" class="no-more-text">
                客官，妾身被你看光了，扛不住了~
              </div>
              <div v-if="tabStates[tabIndex].inited && tabStates[tabIndex].list.length === 0 && !tabStates[tabIndex].loading" class="empty-data-message">
                <p>该分类暂无视频数据或数据加载失败...</p>
                <button @click="onSearch(tabIndex)">重新加载</button>
              </div>
            </div>
          </van-swipe-item>
        </van-swipe>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch, computed, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { fetchH5AllLongVideos } from '@/api/longVideo.api'
import { Swipe as VanSwipe, SwipeItem as VanSwipeItem, Sticky as VanSticky } from 'vant'
import { useHotKeywordStore } from '@/store/h5HotKeyword.store'
import CardCornerIcon from '@/components/CardCornerIcon.vue'

const router = useRouter()
const keyword = ref('')
const history = ref<string[]>(JSON.parse(localStorage.getItem('search-history') || '[]'));
const hotKeywordStore = useHotKeywordStore()
const tags = ref<string[]>([])
const tagsLoading = ref(false)
const showTagsSection = ref(true)

// 标签区高度相关
const isTabSticky = ref(false)
const stickyTop = ref(56) // 默认搜索栏高度
const tagsSectionHeight = ref(0)
const lastScrollTop = ref(0)
const scrollContainer = ref<HTMLElement | null>(null)
const tagsSectionRef = ref<HTMLElement | null>(null)

onMounted(() => {
  nextTick(() => {
    // 动态获取搜索栏高度
    const topBar = document.querySelector('.top-bar') as HTMLElement
    if (topBar) stickyTop.value = topBar.offsetHeight

    if (tagsSectionRef.value) {
      tagsSectionHeight.value = tagsSectionRef.value.offsetHeight
    }
  })
})

// 滚动时判断是否吸顶
function handleScroll() {
  if (!scrollContainer.value) return
  tabScrollTops.value[currentTab.value] = scrollContainer.value.scrollTop
  const scrollTop = scrollContainer.value.scrollTop
  isTabSticky.value = scrollTop >= tagsSectionHeight.value
  lastScrollTop.value = scrollTop
}

// 如果标签区内容有变化（如标签刷新），记得调用：
function updateTagsSectionHeight() {
  if (tagsSectionRef.value) {
    tagsSectionHeight.value = tagsSectionRef.value.offsetHeight
  }
}

// 懒加载优化相关
const activeTag = ref('')
const currentTab = ref(0)
const tabs = ['最多收藏', '最多观看', '最新上架']
const tabStates = ref([
  { loading: false, hasMore: true, page: 1, list: [], inited: false },
  { loading: false, hasMore: true, page: 1, list: [], inited: false },
  { loading: false, hasMore: true, page: 1, list: [], inited: false }
])

const pageSize = 20
const searchInput = ref<HTMLInputElement | null>(null)
const swipeRef = ref<InstanceType<typeof VanSwipe> | null>(null)

// 懒加载优化 - 单例观察器
const observer = ref<IntersectionObserver | null>(null)
const currentSentinel = ref<HTMLElement | null>(null)
const tabScrollTops = ref([0, 0, 0])

// 计算标签区高度
onMounted(() => {
  nextTick(() => {
    const tagsSection = document.querySelector('.tags-section') as HTMLElement
    if (tagsSection) {
      tagsSectionHeight.value = tagsSection.offsetHeight
    }
    
    scrollContainer.value = document.querySelector('.content-container') as HTMLElement
  })
})

// 懒加载优化 - 设置当前标签页的触发器
function setSentinel(idx: number) {
  return (el: HTMLElement | null) => {
    // 只处理当前激活标签页的触发器
    if (el && idx === currentTab.value) {
      el.setAttribute('data-tab-index', idx.toString())
      if (!observer.value) {
        // 初始化IntersectionObserver
        observer.value = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const tabIndex = parseInt(entry.target.getAttribute('data-tab-index') || '0')
              const state = tabStates.value[tabIndex]
              if (state.hasMore && !state.loading && state.inited) {
                loadMore(tabIndex)
              }
            }
          })
        }, { rootMargin: '100px' })
      }
      observer.value.observe(el)
    }
  }
}

// 标签切换逻辑优化
function switchTab(i: number) {
  if (currentTab.value === i) return;

  // 解绑上一个tab的observer
  if (currentSentinel.value) {
    observer.value?.unobserve(currentSentinel.value);
    currentSentinel.value = null;
  }

  currentTab.value = i;
  swipeRef.value?.swipeTo?.(i);

  // 只在未初始化时加载第一页
  if (!tabStates.value[i].inited) {
    loadTabContent(i);
  }
}

function onSwipeChange(i: number) {
  if (currentSentinel.value) {
    observer.value?.unobserve(currentSentinel.value)
    currentSentinel.value = null
  }
  currentTab.value = i
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = tabScrollTops.value[i] || 0
    }
  })
  // 只在未初始化时加载
  if (!tabStates.value[i].inited) {
    loadTabContent(i)
  }
}

onBeforeUnmount(() => {
  if (observer.value) {
    observer.value.disconnect()
  }
})

// 格式化播放量
function formatPlayCount(count: number | undefined | null): string {
  count = typeof count === 'number' && !isNaN(count) ? count : 0
  if (count >= 10000) {
    return (count / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  }
  return count.toString()
}

// 格式化时长
function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}:${sec < 10 ? '0' + sec : sec}`
}

// 历史记录
function addHistory(word: string) {
  if (!word) return
  if (!history.value.includes(word)) {
    history.value.unshift(word)
    if (history.value.length > 10) history.value.pop()
    localStorage.setItem('search-history', JSON.stringify(history.value))
  }
}

function clearHistory() {
  history.value = []
  localStorage.removeItem('search-history')
}

// 热门标签加载
async function loadHotTags() {
  tagsLoading.value = true
  try {
    await hotKeywordStore.load('video')
    tags.value = hotKeywordStore.list.map(item => item.keyword)
  } finally {
    tagsLoading.value = false
  }
}

// 标签刷新
async function refreshTags() {
  await loadHotTags()
}

// 标签点击
function applyKeyword(item: string) {
  keyword.value = item
  activeTag.value = item
  showTagsSection.value = false
  onSearch()
}

// 加载当前标签页内容
async function loadTabContent(tabIdx: number) {
  const state = tabStates.value[tabIdx]
  state.page = 1
  state.hasMore = true
  state.loading = true

  try {
    const sort = getSortByTab(tabIdx)
    const searchWord = activeTag.value || keyword.value
    const params: any = {
      sort,
      page: state.page,
      pageSize,
      keyword: searchWord
    }
    
    const res = await fetchH5AllLongVideos(params)
    
    state.list = (res.list || []).map(item => ({
      id: item.id,
      title: item.title,
      cover: item.cover_url,
      tags: item.tags || [],
      vip: !!item.vip,
      coin: item.coin || 0,
      play: item.play || 0,
      duration: item.duration
    }))
    
    state.hasMore = (res.list || []).length >= pageSize
    state.inited = true
  } catch (error) {
    console.error('加载失败:', error)
    state.inited = true
  } finally {
    state.loading = false
  }
}

// 搜索功能
async function onSearch(tabIdx = currentTab.value) {
  if (keyword.value) {
    addHistory(keyword.value)
    showTagsSection.value = false
  }
  
  // 重置所有标签页的状态
  resetTabStates()
  
  // 加载当前标签页内容
  await loadTabContent(tabIdx)
}

// 重置所有标签页的状态
function resetTabStates() {
  tabStates.value.forEach((state, index) => {
    state.page = 1
    state.hasMore = true
    state.list = []
    state.inited = false
  })
}

// 加载更多 - 确保只加载当前标签页
async function loadMore(tabIdx = currentTab.value) {
  // 确保只加载当前激活的标签页
  if (tabIdx !== currentTab.value) return
  
  const state = tabStates.value[tabIdx]
  if (state.loading || !state.hasMore) return

  state.page += 1
  state.loading = true

  try {
    const sort = getSortByTab(tabIdx)
    const searchWord = activeTag.value || keyword.value
    const params: any = {
      sort,
      page: state.page,
      pageSize
    }
    if (searchWord) {
      params.keyword = searchWord
    }

    const res = await fetchH5AllLongVideos(params)
    const newList = (res.list || []).map(item => ({
      id: item.id,
      title: item.title,
      cover: item.cover_url,
      tags: item.tags || [],
      vip: !!item.vip,
      coin: item.coin || 0,
      play: item.play || 0,
      duration: item.duration
    }))
    if (newList.length) {
      state.list = [...state.list, ...newList]
      state.hasMore = newList.length >= pageSize
    } else {
      state.hasMore = false
    }
  } catch (e) {
    state.page -= 1
  } finally {
    state.loading = false
  }
}

function getSortByTab(tab: number) {
  if (tab === 0) return 'collect'
  if (tab === 1) return 'play'
  if (tab === 2) return 'new'
  return ''
}

// 跳转播放（进入详情页前保存滚动高度）
function goToPlay(video: any) {
  // 保存当前tab的滚动高度
  tabScrollTops.value[currentTab.value] = scrollContainer.value?.scrollTop || 0
  router.push({
    path: `/play/${video.id}`,
  })
}

// 返回时恢复滚动高度（keep-alive激活时自动恢复）
onActivated(() => {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = tabScrollTops.value[currentTab.value] || 0
    }
  })
})

// 输入变化处理
function onInputChange(e: Event) {
  const value = (e.target as HTMLInputElement).value
  if (!value) {
    activeTag.value = ''
    // 当关键词清空时，显示当前分类的全部内容
    showTagsSection.value = true
    loadTabContent(currentTab.value)
  }
}

// 清除关键词
function clearKeyword() {
  keyword.value = ''
  activeTag.value = ''
  showTagsSection.value = true
  // 当关键词清空时，显示当前分类的全部内容
  loadTabContent(currentTab.value)
  nextTick(() => {
    if (searchInput.value) {
      searchInput.value.focus()
    }
  })
}

// 清除搜索
function clearSearch() {
  keyword.value = ''
  activeTag.value = ''
  showTagsSection.value = true
  // 当关键词清空时，显示当前分类的全部内容
  loadTabContent(currentTab.value)
}

// 防抖函数
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null
  return ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

// 初始化
onMounted(() => {
  refreshTags()
  // 初始加载当前标签页内容
  loadTabContent(currentTab.value)
})

// 修复关键词和标签变化处理
watch([keyword, activeTag], debounce(() => {
  const hasKeyword = !!keyword.value.trim()
  const hasTag = !!activeTag.value.trim()
  
  if (hasKeyword || hasTag) {
    // 有搜索条件时重置所有标签页并加载当前标签页
    resetTabStates()
    loadTabContent(currentTab.value)
  }
}, 300))
</script>

<style scoped>
.search-popup {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.content-container {
  flex: 1;
  overflow-y: auto;
  position: relative;
  -webkit-overflow-scrolling: touch;
}

/* 顶部搜索栏优化 */
.top-bar {
  display: flex;
  align-items: center;
  padding: 2.66vw 4.26vw;
  border-bottom: 0.27vw solid #eee;
  gap: 2.13vw;
  flex-wrap: nowrap;
  overflow: hidden;
  background: white;
}

.back-icon {
  width: 5.86vw;
  height: 5.86vw;
  cursor: pointer;
  flex-shrink: 0;
  margin-right: 0;
}

.search-bar {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 24px;
  padding: 0 16px;
  flex: 1;
  height: 40px;
  min-width: 0;
  position: relative;
}

.menu-icon {
  width: 20px;
  height: 20px;
  margin-right: 6px;
}

.menu-text {
  font-weight: 600;
  color: #333;
  margin-right: 6px;
  white-space: nowrap;
}

.divider {
  color: #ccc;
  margin: 0 8px;
  font-size: 16px;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 16px;
  outline: none;
  padding: 0;
  margin: 0;
  height: 40px;
  padding-right: 20px;
}

.clear-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  cursor: pointer;
  color: #999;
  font-size: 18px;
  line-height: 1;
}

.search-btn {
  font-size: 4vw;
  color: #333;
  flex-shrink: 0;
  white-space: nowrap;
  min-width: max-content;
}

/* 标签区样式微调 */
.tags-section {
  padding: 4.26vw;
}

.section-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3.2vw;
  padding: 0 1.06vw;
}

.section-title {
  font-weight: bold;
  font-size: 4vw;
  color: #333;
  padding-left: 1.06vw;
}

.action-icon {
  width: 4.8vw;
  height: 4.8vw;
  opacity: 0.6;
  cursor: pointer;
  margin-right: 1.06vw;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 2.66vw;
  margin-bottom: 4.8vw;
  padding: 0 1.06vw;
}

.tag {
  background: #f0f0f0;
  padding: 1vw 2vw;
  border-radius: 2vw;
  font-size: 3.73vw;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag.active, .tag:hover {
  background: #f12c2c;
  color: #fff;
  transform: translateY(-2px);
}

/* Tab栏样式微调 */
.sort-tab {
  display: flex;
  justify-content: space-between;
  padding: 3.2vw 4.26vw;
  background: #fff;
  border-top: 0.27vw solid #eee;
  border-bottom: 0.27vw solid #eee;
  color: #333;
  font-size: 4vw;
  font-weight: 500;
  margin: 0;
}

.sort-tab span {
  flex: 1;
  text-align: center;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
}

.sort-tab span:hover {
  color: #f55;
}

.sort-tab .active {
  color: #f12c2c;
  font-weight: bold;
}

.sort-tab .active::after {
  content: '';
  position: absolute;
  bottom: -1.6vw;
  left: 50%;
  transform: translateX(-50%);
  width: 16vw;
  height: 0.8vw;
  background-color: #f12c2c;
  border-radius: 0.53vw;
}

/* Tab栏吸顶样式 */
.sort-tab-sticky {
  background: #fff;
  z-index: 99;
  transition: box-shadow 0.2s;
}

.sort-tab-sticky.sticky {
  position: sticky;
  top: -3px;
  z-index: 99;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* 内容区调整 */
.van-swipe {
  position: relative;
  z-index: 97;
  min-height: 60vh; /* 确保有足够高度 */
}

/* 搜索指示器 */
.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2.66vw 4.26vw;
  background: #f9f9f9;
  border-bottom: 1px solid #eee;
}

.search-indicator {
  font-size: 3.73vw;
  color: #666;
}

.search-indicator strong {
  color: #f12c2c;
  font-weight: bold;
}

.clear-search {
  display: flex;
  align-items: center;
  font-size: 3.73vw;
  color: #999;
  cursor: pointer;
  transition: color 0.2s;
}

.clear-search:hover {
  color: #f12c2c;
}

.clear-search img {
  width: 3.73vw;
  height: 3.73vw;
  margin-right: 1.06vw;
}

/* 视频列表优化 */
.video-list {
  display: flex;
  flex-wrap: wrap;
  gap: 3.2vw;
  padding: 0 4.26vw;
}

.video-item {
  width: calc(50% - 1.6vw);
  background: #f5f4f4;
  cursor: pointer;
  border-radius: 2.13vw;
  overflow: hidden;
  box-shadow: 0 0.4vw 2vw rgba(160,160,160,0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.video-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.thumb {
  width: 100%;
  height: 30vw;
  object-fit: cover;
  display: block;
}

.info {
  padding: 2.13vw 1.06vw;
}

.title {
  font-size: 3.73vw;
  font-weight: 500;
  color: #333;
  margin-bottom: 1.6vw;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 10.66vw;
  line-height: 5.33vw;
}

.meta {
  display: flex;
  justify-content: space-between;
  font-size: 3.2vw;
  color: #999;
  padding: 0 1.06vw;
}

/* 加载状态优化 */
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

.empty-data-message button {
  margin-top: 4vw;
  padding: 2.5vw 6vw;
  background: #f12c2c;
  color: white;
  border: none;
  border-radius: 2vw;
  font-size: 3.73vw;
  cursor: pointer;
  transition: all 0.2s;
}

.empty-data-message button:hover {
  background: #e11c1c;
  transform: translateY(-2px);
}

.load-more-trigger {
  height: 0;
  width: 100%;
}

.van-sticky {
  background: #fff !important;
  z-index: 200 !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.swipe-content {
  width: 100vw;
  background: #fff;
}

.video-tag {
  background: #f12c2c;
  color: #fff;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  display: inline-block;
}
.thumb-wrap {
  position: relative;
}
.video-info-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0.8vw 1.6vw;
  font-size: 3vw;
  color: #fff;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0));
}

.play-icon {
  width: 4.3vw;
  height: 4.3vw;
  vertical-align: middle;
  margin-right: 2px;
  filter: drop-shadow(0 0 2px rgba(24, 24, 24, 0.8));
}

.views {
  display: flex;
  align-items: center;
  gap: 1.1vw;
}

.duration {
  display: flex;
  align-items: center;
}

/* 确保内容区域有足够空间 */
.content-area {
  padding-bottom: 20px;
}
</style>