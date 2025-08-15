<template>
  <div class="search-page-wrapper">
    <div class="search-page">
      <!-- 搜索头部 -->
      <div class="search-header">
        <div class="search-bar">
          <button class="back-btn" @click="goBack">
            <span class="back-text">‹</span>
          </button>
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input 
              ref="searchInput"
              v-model="searchQuery" 
              type="text" 
              placeholder="请输入关键词搜索"
              class="search-input"
              @input="handleInputChange"
              @keyup.enter="handleSearch"
            />
            <button 
              v-if="searchQuery" 
              class="clear-btn" 
              @click="clearSearch"
            >
              ×
            </button>
          </div>
          <button class="search-btn" @click="handleSearch">搜索</button>
        </div>
      </div>

      <!-- 搜索历史（在搜索框下面） -->
      <div v-if="searchHistory.length > 0 && !hasSearched" class="search-history-section-top">
        <div class="section-header">
          <h3 class="section-title">搜索记录</h3>
          <button class="clear-history-btn" @click="clearHistory">
            <span class="delete-text">清空全部记录</span>
          </button>
        </div>
        <div class="history-tags">
          <span 
            v-for="keyword in searchHistory" 
            :key="keyword"
            class="history-tag"
            @click="handleTagClick(keyword)"
          >
            {{ keyword }}
          </span>
        </div>
      </div>

      <!-- 搜索内容区域 -->
      <div class="search-content">
        <!-- 搜索结果视频列表 -->
        <div v-if="hasSearched && searchResults.length > 0" class="search-results-section">
          <div class="results-header">
            <h3 class="results-title">搜索结果</h3>
            <span class="results-count">共 {{ searchResults.length }} 个视频</span>
          </div>
          
          <div class="video-grid">
            <div 
              v-for="video in searchResults" 
              :key="video.id"
              class="video-card"
              @click="playVideo(video)"
            >
              <div class="video-thumbnail">
                <img :src="video.cover" :alt="video.title" />
                <!-- 使用 CardCornerIcon 组件替代原有的 VIP 标签 -->
                <CardCornerIcon 
                  :isVip="video.isVip" 
                  :coinAmount="video.coinAmount"
                  @vipClick="handleVipClick(video)"
                  @coinClick="handleCoinClick(video)"
                />
                <div class="meta">
                  <span class="views">
                    <img src="/icons/play4.svg" style="width:14px;height:14px;vertical-align:middle;margin-right:2px;" />
                    {{ formatPlayCount(video.views) }}
                  </span>
                  <span class="duration">{{ video.duration }}</span>
                </div>
              </div>
              <div class="video-info">
                <h4 class="video-title">{{ video.title }}</h4>
              </div>
            </div>
          </div>
          
          <!-- 加载更多指示器 -->
          <div v-if="loading && searchResults.length > 0" class="loading-tip">
            <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
            <div class="loading-text">客官别走，妾身马上就好~</div>
          </div>
          
          <!-- 没有更多数据提示 -->
          <div v-else-if="!hasMore && searchResults.length > 0" class="no-more-text">
            客官，妾身被你看光了，扛不住了~
          </div>
        </div>

        <!-- 未搜索时显示的内容 -->
        <div v-if="!hasSearched">
          <!-- 广告卡片区域 -->
          <div class="ad-cards-section">
            <Banner />
          </div>

          <!-- 热门搜索 -->
          <div class="hot-search-section">
            <div class="section-header">
              <h3 class="section-title">热门搜索</h3>
            </div>
            <div class="hot-search-list">
              <div 
                v-for="(item, index) in hotSearchList" 
                :key="index"
                class="hot-search-item"
                @click="handleHotSearchClick(item)"
              >
                <div class="hot-rank" :class="getRankClass(index)">
                  {{ index + 1 }}
                </div>
                <div class="hot-keyword">{{ item.keyword }}</div>
                <div class="hot-count">{{ formatCount(item.count) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 搜索无结果 -->
        <div v-if="hasSearched && searchResults.length === 0 && !loading" class="no-results">
          <div class="no-results-icon">🔍</div>
          <div class="no-results-text">没有找到相关视频</div>
          <div class="no-results-tip">试试其他关键词吧</div>
        </div>
        
        <!-- 首次搜索加载中 -->
        <div v-if="hasSearched && searchResults.length === 0 && loading" class="loading-container">
          <div class="loading-spinner large"></div>
          <div class="loading-text">搜索中...</div>
        </div>
      </div>

      <!-- Toast提示 -->
      <div 
        v-if="toastVisible" 
        class="toast-tip"
        :class="{ show: toastVisible }"
      >
        {{ toastText }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Banner from '@/components/Banner.vue'
import CardCornerIcon from '@/components/CardCornerIcon.vue'
import { fetchHotKeywords } from '@/api/searchHotKeyword.api'
import { searchDouyinVideos } from '@/api/douyin.api'

interface HotSearchItem {
  id: number
  keyword: string
  type: string
  status: number
  sort: number
  heat: number
  count?: number // 兼容旧数据格式
  isNew?: boolean
  isHot?: boolean
}

interface VideoItem {
  id: number
  title: string
  cover: string
  duration: string
  views: number
  likes: number
  author: string
  videoUrl: string
  createTime: string
  isVip?: boolean // 是否需要VIP
  coinAmount?: number // 金币数量
  isFree?: boolean // 是否免费
}

const router = useRouter()
const searchInput = ref<HTMLInputElement>()
const searchQuery = ref('')
const toastVisible = ref(false)
const toastText = ref('')
const hasSearched = ref(false) // 添加搜索状态标记

// 热门搜索数据
const hotSearchList = ref<HotSearchItem[]>([])

// 搜索结果数据
const searchResults = ref<VideoItem[]>([])

// 当前搜索关键词
const currentSearchKeyword = ref('')

// 懒加载相关状态
const loading = ref(false)
const hasMore = ref(true)
const currentPage = ref(1)
const pageSize = 10

// 防抖定时器
let scrollTimer: number | null = null

// 当前真实滚动位置记录
let lastKnownScrollPosition = 0

// 获取热门搜索数据
async function loadHotKeywords() {
  try {
    const response = await fetchHotKeywords('douyin', 10)
    
    if (Array.isArray(response)) {
      const mappedData = response.map((item: any) => ({
        ...item,
        count: item.heat || item.count || Math.floor(Math.random() * 900000) + 100000
      }))
      
      hotSearchList.value = mappedData.sort((a, b) => (b.heat || 0) - (a.heat || 0))
    } else {
      throw new Error('API返回数据格式错误: 不是数组格式')
    }
  } catch (error) {
    // 降级数据
    hotSearchList.value = [
      { id: 1, keyword: '乱伦', heat: 955000, type: 'douyin', status: 1, sort: 10, count: 955000 },
      { id: 2, keyword: '迷奸', heat: 875000, type: 'douyin', status: 1, sort: 9, count: 875000 },
      { id: 3, keyword: '黑料', heat: 854000, type: 'douyin', status: 1, sort: 8, count: 854000 },
      { id: 4, keyword: '人妻出轨', heat: 755000, type: 'douyin', status: 1, sort: 7, count: 755000 },
      { id: 5, keyword: '母子乱伦', heat: 715000, type: 'douyin', status: 1, sort: 6, count: 715000 },
      { id: 6, keyword: '玩弄姐姐', heat: 675000, type: 'douyin', status: 1, sort: 5, count: 675000 },
      { id: 7, keyword: '内射学妹', heat: 652000, type: 'douyin', status: 1, sort: 4, count: 652000 },
      { id: 8, keyword: '制服诱惑', heat: 624000, type: 'douyin', status: 1, sort: 3, count: 624000 },
      { id: 9, keyword: '萝莉天使', heat: 565000, type: 'douyin', status: 1, sort: 2, count: 565000 },
      { id: 10, keyword: '熟女风情', heat: 538000, type: 'douyin', status: 1, sort: 1, count: 538000 }
    ].sort((a, b) => b.heat - a.heat)
  }
}

// 搜索历史
const searchHistory = ref<string[]>([])

// 数字格式化（仿抖音显示）
function formatCount(count: number): string {
  if (count >= 10000) {
    const wan = count / 10000
    // 如果是整万，不显示小数点
    if (wan % 1 === 0) {
      return wan + '万'
    }
    // 显示一位小数，去掉末尾的0
    return wan.toFixed(1).replace(/\.0$/, '') + '万'
  }
  return count.toString()
}

// 播放数量格式化
function formatPlayCount(count: number): string {
  if (count >= 100000) {
    return (count / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  } else {
    return count.toString()
  }
}

// 显示Toast提示
function showToast(message: string, duration = 1500) {
  toastText.value = message
  toastVisible.value = true
  setTimeout(() => {
    toastVisible.value = false
  }, duration)
}

// 返回上一页
function goBack() {
  router.back()
}

// 清空搜索框
function clearSearch() {
  searchQuery.value = ''
  searchInput.value?.focus()
  // 如果已经搜索过，清空时回到热门搜索页面
  if (hasSearched.value) {
    hasSearched.value = false
    searchResults.value = []
    // 重新加载热门搜索数据（如果当前没有数据）
    if (hotSearchList.value.length === 0) {
      loadHotKeywords()
    }
  }
}

// 处理输入变化
function handleInputChange() {
  // 如果输入框为空，并且之前已经搜索过，则回到热门搜索页面
  if (!searchQuery.value.trim() && hasSearched.value) {
    hasSearched.value = false
    searchResults.value = []
    // 重新加载热门搜索数据（如果当前没有数据）
    if (hotSearchList.value.length === 0) {
      loadHotKeywords()
    }
  }
}

// 处理搜索
function handleSearch() {
  if (!searchQuery.value.trim()) {
    showToast('请输入搜索关键词')
    return
  }
  
  // 清理防抖定时器
  if (scrollTimer) {
    clearTimeout(scrollTimer)
  }
  
  // 标记用户已搜索
  hasSearched.value = true
  
  // 记录当前搜索关键词
  currentSearchKeyword.value = searchQuery.value.trim()
  
  // 添加到搜索历史
  addToHistory(searchQuery.value)
  
  // 重置分页状态
  searchResults.value = []
  currentPage.value = 1
  hasMore.value = true
  loading.value = false
  
  // 执行搜索
  performSearch(currentSearchKeyword.value, 1)
}

// 执行搜索（使用真实API，支持模糊搜索）
async function performSearch(keyword: string, page: number = 1) {
  if (loading.value) {
    return
  }
  
  loading.value = true
  
  try {
    // 调用真实的搜索API，支持模糊搜索
    const response = await searchDouyinVideos({
      keyword: keyword,
      page: page,
      limit: pageSize
    })
    
    let newResults: VideoItem[] = []
    
    if (Array.isArray(response)) {
      // 响应拦截器已解包，直接是数组
      newResults = response.map((item: any) => ({
        id: item.id,
        title: item.title,
        cover: item.cover_url,
        duration: item.duration || '00:00',
        views: item.views || 0,
        likes: 0,
        author: item.author,
        videoUrl: '',
        createTime: '',
        isVip: item.vip || item.is_vip || item.isVip || false,
        coinAmount: item.coin || item.coin_amount || item.coinAmount || 0,
        isFree: item.is_free || item.isFree || (!item.vip && !item.coin)
      }))
    } else if (response && (response as any).list && Array.isArray((response as any).list)) {
      // 如果响应是对象格式，数据在list字段中
      newResults = (response as any).list.map((item: any) => ({
        id: item.id,
        title: item.title,
        cover: item.cover_url || item.cover,
        duration: item.duration || '00:00',
        views: item.views || 0,
        likes: 0,
        author: item.author,
        videoUrl: '',
        createTime: '',
        isVip: item.vip || item.is_vip || item.isVip || false,
        coinAmount: item.coin || item.coin_amount || item.coinAmount || 0,
        isFree: item.is_free || item.isFree || (!item.vip && !item.coin)
      }))
    }
    
    // 如果是第一页，直接替换；否则追加
    if (page === 1) {
      searchResults.value = newResults
    } else {
      searchResults.value.push(...newResults)
    }
    
    // 判断是否还有更多数据
    hasMore.value = newResults.length === pageSize
    currentPage.value = page
    
  } catch (error) {
    if (page === 1) {
      // 降级到假数据（用于演示模糊搜索效果）
      const mockResults: VideoItem[] = [
        {
          id: 1,
          title: `${keyword} - 精彩视频1`,
          cover: '/api/placeholder/300/400',
          duration: '05:24',
          views: 12500,
          likes: 856,
          author: '热门分类',
          videoUrl: '',
          createTime: '2025-01-01',
          isVip: true,
          coinAmount: 0,
          isFree: false
        },
        {
          id: 2,
          title: `关于${keyword}的超棒内容`,
          cover: '/api/placeholder/300/400',
          duration: '03:15',
          views: 89600,
          likes: 2341,
          author: '精选分类',
          videoUrl: '',
          createTime: '2025-01-02',
          isVip: false,
          coinAmount: 50,
          isFree: false
        },
        {
          id: 3,
          title: `${keyword}相关推荐视频`,
          cover: '/api/placeholder/300/400',
          duration: '02:48',
          views: 45200,
          likes: 1256,
          author: '推荐分类',
          videoUrl: '',
          createTime: '2025-01-03',
          isVip: false,
          coinAmount: 0,
          isFree: true
        },
        {
          id: 4,
          title: `${keyword}最新视频4`,
          cover: '/api/placeholder/300/400',
          duration: '04:12',
          views: 33800,
          likes: 892,
          author: '推荐分类',
          videoUrl: '',
          createTime: '2025-01-04',
          isVip: false,
          coinAmount: 100,
          isFree: false
        },
        {
          id: 5,
          title: `${keyword}热门视频5`,
          cover: '/api/placeholder/300/400',
          duration: '06:30',
          views: 67200,
          likes: 1678,
          author: '热门分类',
          videoUrl: '',
          createTime: '2025-01-05',
          isVip: true,
          coinAmount: 0,
          isFree: false
        },
        {
          id: 6,
          title: `${keyword}精选内容6`,
          cover: '/api/placeholder/300/400',
          duration: '03:45',
          views: 28900,
          likes: 534,
          author: '精选分类',
          videoUrl: '',
          createTime: '2025-01-06',
          isVip: false,
          coinAmount: 25,
          isFree: false
        }
      ]
      
      searchResults.value = mockResults
      hasMore.value = true
      currentPage.value = 1
    } else {
      // 第二页及以后的请求失败，生成一些假数据用于测试分页
      const mockPageResults: VideoItem[] = []
      for (let i = 1; i <= pageSize; i++) {
        mockPageResults.push({
          id: (page - 1) * pageSize + i + 100,
          title: `${keyword} - 第${page}页视频${i}`,
          cover: '/api/placeholder/300/400',
          duration: `0${Math.floor(Math.random() * 5) + 2}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
          views: Math.floor(Math.random() * 100000) + 1000,
          likes: Math.floor(Math.random() * 5000) + 100,
          author: ['热门分类', '精选分类', '推荐分类'][Math.floor(Math.random() * 3)],
          videoUrl: '',
          createTime: '2025-01-07',
          isVip: Math.random() < 0.3,
          coinAmount: Math.random() < 0.5 ? Math.floor(Math.random() * 100) + 10 : 0,
          isFree: Math.random() < 0.2
        })
      }
      
      // 追加到现有结果
      searchResults.value.push(...mockPageResults)
      
      // 模拟分页逻辑：假设总共有5页数据
      hasMore.value = page < 5
      currentPage.value = page
    }
  } finally {
    loading.value = false
  }
}

// 保存当前搜索状态（包含滚动位置和可见视频索引）
function saveCurrentState() {
  const scrollTop = getCurrentScrollPosition()
  
  // 计算当前可见的第一个视频卡片索引
  const videoCards = document.querySelectorAll('.video-card')
  let visibleVideoIndex = 0
  
  if (videoCards.length > 0) {
    const viewportTop = scrollTop
    const viewportBottom = scrollTop + window.innerHeight
    
    // 找到第一个在视口中可见的视频卡片
    for (let i = 0; i < videoCards.length; i++) {
      const card = videoCards[i]
      const rect = card.getBoundingClientRect()
      const cardTop = rect.top + scrollTop
      const cardBottom = cardTop + rect.height
      
      // 如果卡片与视口有交集，记录这个索引
      if (cardBottom > viewportTop && cardTop < viewportBottom) {
        visibleVideoIndex = i
        break
      }
    }
  }
  
  const searchState = {
    searchQuery: searchQuery.value,
    hasSearched: hasSearched.value,
    searchResults: searchResults.value,
    currentSearchKeyword: currentSearchKeyword.value,
    currentPage: currentPage.value,
    hasMore: hasMore.value,
    scrollPosition: scrollTop,
    visibleVideoIndex: visibleVideoIndex,
    timestamp: Date.now()
  }
  
  sessionStorage.setItem('searchPageState', JSON.stringify(searchState))
}

// 获取当前准确的滚动位置
function getCurrentScrollPosition() {
  // 优先从搜索页面包装器获取滚动位置
  const wrapper = document.querySelector('.search-page-wrapper')
  if (wrapper) {
    return wrapper.scrollTop
  }
  
  // 降级到全局滚动位置
  return Math.max(
    window.pageYOffset || 0,
    document.documentElement.scrollTop || 0,
    document.body.scrollTop || 0
  )
}

// 播放视频
function playVideo(video: VideoItem) {
  // 获取当前滚动位置和可见视频索引
  const currentScroll = getCurrentScrollPosition()
  
  // 计算当前点击的视频在列表中的索引
  const clickedVideoIndex = searchResults.value.findIndex(v => v.id === video.id)
  
  // 获取滚动容器的高度信息用于调试
  const wrapper = document.querySelector('.search-page-wrapper')
  const documentHeight = wrapper ? wrapper.scrollHeight : document.documentElement.scrollHeight
  const windowHeight = wrapper ? wrapper.clientHeight : window.innerHeight
  
  // 立即保存状态，包含视频索引信息
  const searchState = {
    searchQuery: searchQuery.value,
    hasSearched: hasSearched.value,
    searchResults: searchResults.value,
    currentSearchKeyword: currentSearchKeyword.value,
    currentPage: currentPage.value,
    hasMore: hasMore.value,
    scrollPosition: currentScroll,
    visibleVideoIndex: clickedVideoIndex >= 0 ? clickedVideoIndex : 0,
    timestamp: Date.now()
  }
  
  sessionStorage.setItem('searchPageState', JSON.stringify(searchState))
  
  // 然后跳转
  router.push({
    path: '/play-tiktok',
    query: {
      id: video.id,
      from: 'search'
    }
  })
}

// 处理VIP点击
function handleVipClick(video: VideoItem) {
  showToast(`需要开通VIP观看: ${video.title}`)
}

// 处理金币点击
function handleCoinClick(video: VideoItem) {
  showToast(`需要支付${video.coinAmount}金币观看: ${video.title}`)
}

// 处理标签点击
function handleTagClick(keyword: string) {
  searchQuery.value = keyword
  handleSearch()
}

// 热门搜索点击
function handleHotSearchClick(item: HotSearchItem) {
  // 清理防抖定时器
  if (scrollTimer) {
    clearTimeout(scrollTimer)
  }
  
  searchQuery.value = item.keyword
  hasSearched.value = true // 标记用户已搜索
  currentSearchKeyword.value = item.keyword
  addToHistory(item.keyword)
  
  // 重置分页状态
  searchResults.value = []
  currentPage.value = 1
  hasMore.value = true
  
  performSearch(item.keyword, 1)
}

// 加载更多数据
function loadMore() {
  if (!hasMore.value || loading.value || !hasSearched.value) return
  
  const nextPage = currentPage.value + 1
  performSearch(currentSearchKeyword.value, nextPage)
}

// 滚动监听，实现懒加载（带防抖）
function handleScroll() {
  // 清理之前的定时器
  if (scrollTimer) {
    clearTimeout(scrollTimer)
  }
  
  // 设置防抖定时器
  scrollTimer = window.setTimeout(() => {
    const scrollTop = getCurrentScrollPosition()
    
    // 获取滚动容器的高度信息
    const wrapper = document.querySelector('.search-page-wrapper')
    const windowHeight = wrapper ? wrapper.clientHeight : window.innerHeight
    const documentHeight = wrapper ? wrapper.scrollHeight : document.documentElement.scrollHeight
    const distanceToBottom = documentHeight - (scrollTop + windowHeight)
    
    // 更新最后已知的滚动位置
    lastKnownScrollPosition = scrollTop
    
    // 当滚动到距离底部300px时触发加载更多
    if (distanceToBottom <= 300 && hasMore.value && !loading.value && hasSearched.value && searchResults.value.length > 0) {
      loadMore()
    }
  }, 100)
}

// 移动端触摸滚动监听（备用）
function handleTouchScroll() {
  handleScroll()
}

// 添加到搜索历史
function addToHistory(keyword: string) {
  const trimmed = keyword.trim()
  if (!trimmed) return
  
  // 移除已存在的相同关键词
  const index = searchHistory.value.indexOf(trimmed)
  if (index > -1) {
    searchHistory.value.splice(index, 1)
  }
  
  // 添加到最前面
  searchHistory.value.unshift(trimmed)
  
  // 最多保留10条历史记录
  if (searchHistory.value.length > 10) {
    searchHistory.value = searchHistory.value.slice(0, 10)
  }
  
  // 保存到本地存储
  localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value))
}

// 清空搜索历史
function clearHistory() {
  searchHistory.value = []
  localStorage.removeItem('searchHistory')
  showToast('已清空搜索历史')
}

// 获取排名样式类名
function getRankClass(index: number) {
  if (index === 0) return 'rank-first'
  if (index === 1) return 'rank-second' 
  if (index === 2) return 'rank-third'
  return 'rank-normal'
}
function loadSearchHistory() {
  const saved = localStorage.getItem('searchHistory')
  if (saved) {
    try {
      searchHistory.value = JSON.parse(saved)
    } catch (e) {
      // 忽略解析错误，使用空数组
    }
  }
}

// 恢复搜索状态
function restoreSearchState() {
  const savedState = sessionStorage.getItem('searchPageState')
  if (savedState) {
    try {
      const state = JSON.parse(savedState)
      
      // 检查状态是否过期（超过30分钟则认为无效）
      const now = Date.now()
      const stateAge = now - (state.timestamp || 0)
      const maxAge = 30 * 60 * 1000 // 30分钟
      
      if (stateAge > maxAge) {
        sessionStorage.removeItem('searchPageState')
        return false
      }
      
      // 恢复状态
      searchQuery.value = state.searchQuery || ''
      hasSearched.value = state.hasSearched || false
      searchResults.value = state.searchResults || []
      currentSearchKeyword.value = state.currentSearchKeyword || ''
      currentPage.value = state.currentPage || 1
      hasMore.value = state.hasMore !== undefined ? state.hasMore : true
      
      // 如果有保存的状态，等待DOM完全渲染后恢复滚动位置
      if ((state.scrollPosition !== undefined && state.scrollPosition > 0) || 
          (state.visibleVideoIndex !== undefined && state.visibleVideoIndex > 0)) {
        
        // 等待Vue完全渲染
        nextTick(() => {
          // 等待浏览器完成渲染
          requestAnimationFrame(() => {
            // 再次等待确保所有内容加载完成
            setTimeout(() => {
              // 检查DOM中的视频卡片数量是否与数据匹配
              const expectedCards = state.searchResults?.length || 0
              let actualCards = document.querySelectorAll('.video-card').length
              
              // 等待DOM完全渲染
              const waitForDOM = () => {
                actualCards = document.querySelectorAll('.video-card').length
                
                if (actualCards < expectedCards) {
                  setTimeout(waitForDOM, 200)
                  return
                }
                
                // DOM已渲染完成，开始滚动恢复
                setTimeout(() => {
                  const wrapper = document.querySelector('.search-page-wrapper')
                  const actualHeight = wrapper ? wrapper.scrollHeight : document.documentElement.scrollHeight
                  const viewHeight = wrapper ? wrapper.clientHeight : window.innerHeight
                  const canScroll = actualHeight > viewHeight
                  
                  if (canScroll) {
                    let targetScrollPosition = state.scrollPosition || 0
                    
                    // 如果有保存的可见视频索引，优先使用它来计算滚动位置
                    if (state.visibleVideoIndex !== undefined && state.visibleVideoIndex > 0) {
                      const videoCards = document.querySelectorAll('.video-card')
                      if (videoCards.length > state.visibleVideoIndex) {
                        const targetCard = videoCards[state.visibleVideoIndex]
                        if (targetCard) {
                          const rect = targetCard.getBoundingClientRect()
                          const cardTopPosition = rect.top + getCurrentScrollPosition()
                          targetScrollPosition = Math.max(targetScrollPosition, cardTopPosition - 100) // 留出一些缓冲空间
                        }
                      }
                    }
                    
                    // 执行滚动到指定容器
                    if (targetScrollPosition > 0) {
                      if (wrapper) {
                        wrapper.scrollTo({
                          top: targetScrollPosition,
                          behavior: 'auto'
                        })
                      } else {
                        window.scrollTo({
                          top: targetScrollPosition,
                          behavior: 'auto'
                        })
                      }
                    }
                  }
                }, 100)
              }
              
              waitForDOM()
            }, 100)
          })
        })
      }
      
      // 清除保存的状态，避免影响其他入口
      sessionStorage.removeItem('searchPageState')
      return true
    } catch (e) {
      sessionStorage.removeItem('searchPageState')
    }
  }
  return false
}

onMounted(() => {
  loadSearchHistory()
  
  // 先尝试恢复搜索状态，如果没有保存的状态才加载热门关键词
  const hasRestoredState = restoreSearchState()
  if (!hasRestoredState) {
    loadHotKeywords()
  } else {
    // 即使恢复了搜索状态，也要确保热门搜索数据可用
    // 这样当用户清空搜索框时，热门标签能正常显示
    if (hotSearchList.value.length === 0) {
      loadHotKeywords()
    }
  }
  
  // 自动聚焦搜索框（只在没有恢复状态时聚焦，避免影响用户滚动体验）
  if (!hasRestoredState) {
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
  
  // 监听浏览器前进/后退事件
  const handlePopState = () => {
    // 当用户使用浏览器前进/后退按钮时，尝试恢复状态
    const hasState = restoreSearchState()
    if (!hasState) {
      loadHotKeywords()
    }
  }
  
  // 监听页面可见性变化，在页面隐藏时保存状态
  const handleVisibilityChange = () => {
    if (document.hidden && hasSearched.value && searchResults.value.length > 0) {
      saveCurrentState()
    }
  }
  
  // 监听页面卸载前事件
  const handleBeforeUnload = () => {
    if (hasSearched.value && searchResults.value.length > 0) {
      saveCurrentState()
    }
  }
  
  window.addEventListener('popstate', handlePopState)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('beforeunload', handleBeforeUnload)
  
  // 等待DOM渲染完成后添加滚动监听器
  nextTick(() => {
    const wrapper = document.querySelector('.search-page-wrapper')
    if (wrapper) {
      // 监听滚动容器的滚动事件
      wrapper.addEventListener('scroll', handleScroll, { passive: true })
    }
    // 保留原有的监听器作为兼容性后备
    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('touchmove', handleTouchScroll, { passive: true })
  })
  
  // 清理函数：在组件卸载时移除所有监听器
  onUnmounted(() => {
    window.removeEventListener('popstate', handlePopState)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })
})

// 在组件卸载时移除滚动监听
onUnmounted(() => {
  // 如果当前有搜索结果，保存最新状态以便下次进入时恢复
  if (hasSearched.value && searchResults.value.length > 0) {
    // 获取最准确的滚动位置
    const finalScrollTop = Math.max(lastKnownScrollPosition, getCurrentScrollPosition())
    
    // 直接更新已保存的状态中的滚动位置
    const existingState = sessionStorage.getItem('searchPageState')
    if (existingState) {
      try {
        const state = JSON.parse(existingState)
        state.scrollPosition = finalScrollTop
        state.timestamp = Date.now()
        sessionStorage.setItem('searchPageState', JSON.stringify(state))
      } catch (e) {
        // 如果解析失败，直接保存新状态
        saveCurrentState()
      }
    } else {
      // 如果没有已保存的状态，直接保存
      saveCurrentState()
    }
  }
  
  // 移除所有滚动监听器
  const wrapper = document.querySelector('.search-page-wrapper')
  if (wrapper) {
    wrapper.removeEventListener('scroll', handleScroll)
  }
  window.removeEventListener('scroll', handleScroll)
  document.removeEventListener('scroll', handleScroll)
  window.removeEventListener('touchmove', handleTouchScroll)
  
  // 清理防抖定时器
  if (scrollTimer) {
    clearTimeout(scrollTimer)
    scrollTimer = null
  }
})
</script>

<style scoped>
/* 搜索页面外层包装器 - 创建独立的滚动容器 */
.search-page-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: #000;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  /* 隐藏滚动条 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.search-page-wrapper::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.search-page {
  background: #000;
  color: #fff;
  min-height: 100vh;
  /* 确保内容可以根据需要扩展 */
}

.search-header {
  position: sticky;
  top: 0;
  background: #000;
  z-index: 100;
  padding: 2.5vw 3vw;
  border-bottom: 1px solid #333;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 2.5vw;
}

.back-btn {
  background: none;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 8vw;
  height: 8vw;
}

.back-text {
  font-size: 10vw;
  color: #fff;
  font-weight: normal;
  line-height: 1;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  background: #2a2a2a;
  border-radius: 1.5vw;
  display: flex;
  align-items: center;
  height: 9vw;
}

.search-icon {
  color: #666;
  font-size: 3.5vw;
  margin-left: 3vw;
  margin-right: 2vw;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  padding: 0 3vw 0 0;
  color: #fff;
  font-size: 3.5vw;
  outline: none;
  height: 100%;
}

.search-input::placeholder {
  color: #666;
}

.clear-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 5vw;
  padding: 0 3vw;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.search-btn {
  background: none;
  border: none;
  color: #fff;
  padding: 0;
  font-size: 3.8vw;
  font-weight: normal;
  cursor: pointer;
  white-space: nowrap;
}

/* 搜索历史顶部样式 */
.search-history-section-top {
  padding: 3vw 4vw;
  border-bottom: 1px solid #333;
  background: #000;
}

.search-history-section-top .section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5vw;
}

.search-history-section-top .section-title {
  font-size: 3.8vw;
  font-weight: 500;
  margin: 0;
  color: #ccc;
}

.search-history-section-top .clear-history-btn {
  background: none;
  border: none;
  padding: 2vw;
  cursor: pointer;
}

.search-history-section-top .delete-text {
  font-size: 3.2vw;
  color: #666;
}

.search-history-section-top .history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 2vw;
}

.search-history-section-top .history-tag {
  background: #1a1a1a;
  color: #ccc;
  padding: 2vw 3.5vw;
  border-radius: 1.5vw;
  font-size: 3vw;
  cursor: pointer;
  border: 1px solid #333;
  transition: all 0.3s;
}

.search-history-section-top .history-tag:hover {
  background: #333;
  color: #fff;
  border-color: #555;
}

.search-content {
  padding: 2vw 4vw;
  /* 移除固定高度限制，让内容自然增长 */
  padding-bottom: 20vw; /* 底部留出更多空间，确保滚动可以触发 */
}

/* 广告卡片区域样式 */
.ad-cards-section {
  margin-bottom: 4vw;
}

/* 覆盖Banner组件样式以适应搜索页面 */
.ad-cards-section :deep(.banner-wrapper) {
  padding: 0; /* 移除内边距，因为搜索页面已有padding */
}

.ad-cards-section :deep(.card) {
  width: 15vw; /* 减小卡片宽度 */
}

.ad-cards-section :deep(.banner-row) {
  gap: 2vw; /* 减小间距 */
  justify-content: space-between; /* 均匀分布，防止溢出 */
}

.ad-cards-section :deep(.title) {
  color: #fff; /* 搜索页面是黑色背景，文字改为白色 */
  font-size: 2.8vw; /* 稍微减小字体 */
}

/* 搜索结果样式 */
.search-results-section {
  margin-bottom: 5vw;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3vw;
  padding: 0 1vw;
}

.results-title {
  font-size: 3.8vw;
  font-weight: 500;
  margin: 0;
  color: #fff;
}

.results-count {
  font-size: 3vw;
  color: #999;
}

/* 视频网格布局 */
.video-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr); /* 改为2列布局 */
  gap: 3vw; /* 增大间距 */
  padding: 0 1vw;
}

.video-card {
  background: #1a1a1a;
  border-radius: 2.5vw; /* 稍微增大圆角 */
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid #333;
}

.video-card:hover {
  transform: translateY(-1vw);
  border-color: #555;
  box-shadow: 0 2vw 4vw rgba(0,0,0,0.3);
}

.video-thumbnail {
  position: relative;
  width: 100%;
  height: 48vw; /* 增大高度以适应2列布局 */
  overflow: hidden;
  background: #000;
}

.video-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.video-card:hover .video-thumbnail img {
  transform: scale(1.05);
}

.video-duration {
  position: absolute;
  bottom: 1.5vw;
  right: 1.5vw;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 2.8vw; /* 稍微增大字体 */
  padding: 0.8vw 2vw;
  border-radius: 1.2vw;
  backdrop-filter: blur(4px);
}

.meta {
  position: absolute;
  bottom: 0.5vw;
  left: 1vw;
  right: 1vw;
  display: flex;
  justify-content: space-between;
  font-size: 2.9vw;
  color: #fff;
  text-shadow: 0 0 4px rgba(0,0,0,0.7);
}

.views,
.duration {
  display: flex;
  align-items: center;
  gap: 0.5vw;
}

.views img {
  filter: drop-shadow(0 0 2px rgba(24, 24, 24, 0.8));
}

.video-views {
  position: absolute;
  top: 1.5vw;
  left: 1.5vw;
  background: rgba(255, 255, 255, 0.9);
  color: #000;
  font-size: 2.5vw; /* 稍微增大字体 */
  padding: 0.8vw 2vw;
  border-radius: 1.2vw;
  backdrop-filter: blur(4px);
  font-weight: 500;
}

.video-info {
  padding: 2.5vw; /* 减小内边距 */
}

.video-title {
  font-size: 3.5vw; /* 增大字体 */
  color: #fff;
  margin: 0;
  font-weight: 500;
  line-height: 1.3;
  /* 单行显示，超出用省略号 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 5vw; /* 减小高度 */
}

.video-meta {
  display: flex;
  align-items: center;
}

.video-author {
  font-size: 2.8vw;
  color: #999;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 加载动画样式 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8vw 4vw;
  text-align: center;
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4vw;
  gap: 2vw;
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

.loading-spinner {
  width: 5vw;
  height: 5vw;
  border: 0.5vw solid #333;
  border-top: 0.5vw solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-spinner.large {
  width: 8vw;
  height: 8vw;
  border-width: 0.8vw;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 3.2vw;
  color: #ff5f5f;
  font-weight: 500;
}

.no-more {
  text-align: center;
  padding: 4vw;
}

.no-more-text {
  font-size: 3.73vw;
  color: #999;
  text-align: center;
  font-weight: bold;
  margin: 5.3vw 0;
}
.no-results {
  text-align: center;
  padding: 8vw 4vw;
  color: #666;
}

.no-results-icon {
  font-size: 12vw;
  margin-bottom: 2vw;
}

.no-results-text {
  font-size: 4vw;
  margin-bottom: 1vw;
  color: #999;
}

.no-results-tip {
  font-size: 3.2vw;
  color: #666;
}

.hot-search-section,
.search-history-section {
  margin-bottom: 5vw;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3vw;
}

.section-title {
  font-size: 3.8vw;
  font-weight: 500;
  margin: 0;
  color: #ccc;
}

.clear-history-btn {
  background: none;
  border: none;
  padding: 2vw;
  cursor: pointer;
}

.delete-text {
  font-size: 5vw;
}

/* 热门搜索样式 */
.hot-search-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.hot-search-item {
  display: flex;
  align-items: center;
  padding: 2vw 0;
  cursor: pointer;
  border-bottom: 1px solid #1a1a1a;
  position: relative;
  min-height: 10vw;
}

.hot-search-item:last-child {
  border-bottom: none;
}

.hot-search-item:hover {
  background: #111;
}

.hot-rank {
  width: 6vw;
  height: 6vw;
  font-size: 3.5vw;
  font-weight: bold;
  margin-right: 3vw;
  flex-shrink: 0;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 6vw;
  border-radius: 50%;
}

.hot-rank.rank-first {
  background: #FFD700;
  color: #000;
  font-weight: bold;
  border: 2px solid #FFA500;
}

.hot-rank.rank-second {
  background: #C0C0C0;
  color: #000;
  font-weight: bold;
  border: 2px solid #A0A0A0;
}

.hot-rank.rank-third {
  background: #CD7F32;
  color: #fff;
  font-weight: bold;
  border: 2px solid #B8860B;
}

.hot-rank.rank-normal {
  background: transparent;
  color: #666;
  font-weight: normal;
  text-align: center;
  justify-content: center;
  border: none;
  border-radius: 0;
  width: 6vw;
  height: 6vw;
  min-width: 6vw;
}

.hot-keyword {
  flex: 1;
  font-size: 3.5vw;
  color: #fff;
  font-weight: 400;
  margin-right: 2.5vw;
  line-height: 1.2;
  display: flex;
  align-items: center;
}

.hot-count {
  font-size: 2.8vw;
  color: #999;
  font-weight: 300;
  line-height: 1.2;
  display: flex;
  align-items: center;
  min-width: 12vw;
  justify-content: flex-end;
}

.hot-search-tags,
.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 3vw;
}

.hot-tag {
  background: #1a1a1a;
  color: #fff;
  padding: 2.5vw 4vw;
  border-radius: 4vw;
  font-size: 3.5vw;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 1.5vw;
  border: 1px solid #333;
  transition: all 0.3s;
}

.hot-tag:hover {
  background: #333;
  border-color: #555;
}

.hot-tag.top-tag {
  background: linear-gradient(45deg, #ff6b6b, #ff8e53);
  border-color: #ff6b6b;
}

.hot-tag.top-tag .tag-rank {
  background: rgba(255, 255, 255, 0.2);
}

.tag-rank {
  background: #333;
  color: #fff;
  border-radius: 50%;
  width: 5vw;
  height: 5vw;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3vw;
  font-weight: bold;
  min-width: 5vw;
}

.tag-count {
  font-size: 3vw;
  color: #999;
  margin-left: auto;
}

.history-tag {
  background: #1a1a1a;
  color: #ccc;
  padding: 2vw 3.5vw;
  border-radius: 1.5vw;
  font-size: 3vw;
  cursor: pointer;
  border: 1px solid #333;
  transition: all 0.3s;
}

.history-tag:hover {
  background: #333;
  color: #fff;
  border-color: #555;
}

.toast-tip {
  position: fixed;
  left: 50%;
  bottom: 50vh;
  transform: translateX(-50%) translateY(0);
  background: rgba(32,32,32,0.92);
  color: #fff;
  font-size: 4vw;
  border-radius: 2vw;
  padding: 2.8vw 7vw;
  min-width: 36vw;
  max-width: 72vw;
  text-align: center;
  pointer-events: none;
  z-index: 10000;
  opacity: 0;
  transition: opacity 0.3s;
  backdrop-filter: blur(8px);
}

.toast-tip.show {
  opacity: 1;
}

/* 响应式调整 */
@media (max-width: 400px) {
  .search-bar {
    gap: 2vw;
  }
  
  .hot-tag,
  .history-tag {
    font-size: 3.2vw;
    padding: 2vw 3.5vw;
  }
  
  .section-title {
    font-size: 4.2vw;
  }
  
  /* 小屏幕视频卡片调整 - 保持2列 */
  .video-grid {
    gap: 2.5vw;
  }
  
  .video-thumbnail {
    height: 50vw; /* 小屏幕适当调整高度 */
  }
  
  .video-info {
    padding: 2.5vw;
  }
  
  .video-title {
    font-size: 3.2vw;
    min-height: 4.5vw; /* 减小高度 */
  }
  
  .video-duration {
    font-size: 2.5vw;
    padding: 0.6vw 1.5vw;
  }
  
  .video-views {
    font-size: 2.2vw;
    padding: 0.6vw 1.5vw;
  }
  
  .video-vip {
    font-size: 2vw;
    padding: 0.6vw 1.5vw;
  }
}

/* 中等屏幕优化 */
@media (min-width: 600px) {
  .video-grid {
    grid-template-columns: repeat(2, 1fr); /* 保持2列 */
    gap: 3.5vw;
  }
  
  .video-thumbnail {
    height: 42vw;
  }
  
  .video-title {
    font-size: 3.2vw;
  }
  
  .video-info {
    padding: 2.5vw;
  }
}

/* 大屏幕优化 */
@media (min-width: 900px) {
  .video-grid {
    grid-template-columns: repeat(3, 1fr); /* 大屏幕可以显示3列 */
    gap: 2.5vw;
  }
  
  .video-thumbnail {
    height: 28vw;
  }
  
  .video-title {
    font-size: 2.8vw;
    min-height: 4vw; /* 减小高度 */
  }
  
  .video-info {
    padding: 2.5vw;
  }
}
</style>
