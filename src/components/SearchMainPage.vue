<template>
  <div class="search-main-page">
    <!-- 吸顶头部（返回+Tab+筛选） -->
    <div class="fixed-header">
      <div class="top-bar">
        <div class="back-btn" @click="goBack">
          <img src="/icons/back3.svg" alt="返回" />
        </div>
        <div class="tabs">
          <div class="tab-item" :class="{ active: currentTab === 'search' }" @click="switchTab('search')">搜一搜</div>
          <div class="tab-item" :class="{ active: currentTab === 'library' }" @click="switchTab('library')">
            {{ tabNameMap[activeTab] ? tabNameMap[activeTab] + '库' : '漫画库' }}
          </div>
        </div>
      </div>
      <template v-if="currentTab === 'library'">
        <div class="filter-wrapper">
          <div class="filter-row">
            <div class="filter-tags">
              <div
                v-for="cat in categoryList"
                :key="cat.key"
                class="filter-tag"
                :class="{ active: selectedCategory.key === cat.key }"
                @click="selectedCategory = cat"
              >
                {{ cat.label }}
              </div>
            </div>
          </div>
          <!-- 标签筛选 -->
<div class="filter-row">
  <div class="filter-tags">
    <div
      v-for="tag in tagList"
      :key="tag.id"
      class="filter-tag"
      :class="{ active: selectedTag === tag.id }"
      @click="selectedTag = tag.id"
    >
      {{ tag.name }}
    </div>
  </div>
</div>

          <div class="filter-row">
            <div class="filter-tags">
              <div v-for="sort in sortList" :key="sort" class="filter-tag" :class="{ active: selectedSort === sort }" @click="selectedSort = sort">
                {{ sort }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
    <!-- 滚动内容区 -->
    <div class="scroll-content" ref="scrollContent">
      <template v-if="currentTab === 'search'">
        <div class="search-bar">
          <div class="search-input">
            <img src="/icons/eye.svg" class="search-icon" />
            <input
              type="text"
              v-model="keyword"
              @input="onKeywordChange"
              placeholder="请输入要搜索的内容"
            />
          </div>
          <div class="search-btn" @click="handleSearch">搜索</div>
        </div>

        <template v-if="searching">
          <div v-if="searchList.length > 0">
            <AcgSection
              layoutType="type5"
              :data="searchList"
              @item-click="goToDetail"
            />
            <div v-if="searchLoading" class="loading-tip">
              <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
              <div class="loading-text">客官别走，妾身马上就好~</div>
            </div>
            <div v-if="searchNoMore && searchList.length > 0" class="no-more-text">
              客官，妾身被你弄高潮了，扛不住了 ~
            </div>
            <div ref="searchSentinel" class="load-more-trigger"></div>
          </div>
          <div v-else class="empty-box" @click="handleSearch">
            <img src="/icons/empty.webp" class="empty-img" />
            <div class="empty-text">什么都木有，点击重试～</div>
          </div>
        </template>
        <template v-else>
          <div v-if="historyList.length > 0" class="history-wrapper">
            <div class="history-header">
              <div class="history-title">历史搜索</div>
              <div class="clear-btn" @click="clearHistory">
                <img src="/icons/delete.svg" class="delete-icon" /> 清除全部记录
              </div>
            </div>
            <div class="history-tags">
              <div class="history-tag" v-for="(item, index) in historyList" :key="index" @click="handleHistoryClick(item)">{{ item }}</div>
            </div>
          </div>
          <div class="hot-tags-wrapper">
            <div class="hot-tags-box">
              <div class="hot-title">
                <img src="/icons/hot1.svg" class="hot-icon" /> 热门标签
              </div>
              <div class="tag-list">
                <div
  v-for="(tag, idx) in hotKeywordStore.list"
  :key="tag.id || tag.keyword"
  class="tag-item"
  @click="handleHotTagClick(tag.keyword)"
>
  <span class="tag-num" :class="'num-' + (idx + 1)">{{ idx + 1 }}</span>
  <span class="tag-text">{{ tag.keyword }}</span>
</div>


              </div>
            </div>
          </div>
        </template>
      </template>
      <template v-if="currentTab === 'library'">
        <AcgSection
          layoutType="type5"
          :data="lazyList"
          @item-click="goToDetail"
        />
        <div v-if="isApiLoading" class="loading-tip">
          <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
          <div class="loading-text">客官别走，妾身马上就好~</div>
        </div>
        <div v-if="isNoMore && lazyList.length > 0" class="no-more-text">
          客官，妾身被你弄高潮了，扛不住了 ~
        </div>
        <div ref="lazySentinel" class="load-more-trigger"></div>
      </template>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed, onActivated } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AcgSection from '@/components/AcgSection.vue'
import { useComicCategoryStore } from '@/store/comicCategoryStore'
import { useHotKeywordStore } from '@/store/h5HotKeyword.store'
import { useNovelCategoryStore } from '@/store/novelStore'
import { useAudioNovelCategoryStore } from '@/store/audio-novel.store'

const hotKeywordStore = useHotKeywordStore()
const comicStore = useComicCategoryStore()
const novelStore = useNovelCategoryStore()
const audioNovelStore = useAudioNovelCategoryStore()

const tabTypeMap: Record<string, string> = {
  漫画: 'comic',
  动漫: 'anime',
  小说: 'novel',
  有声: 'audio',
}

const route = useRoute()
const router = useRouter()
const activeTab = ref<string>((route.query.activeTab as string) || '漫画')
const currentTab = ref<'search' | 'library'>('search')
const scrollContent = ref<HTMLElement | null>(null)
const tabNameMap: Record<string, string> = {
  漫画: '漫画',
  动漫: '动漫',
  小说: '小说',
  有声: '有声',
}

// 热门关键词自动加载
const fetchHotKeywords = (tab: string) => {
  const type = tabTypeMap[tab] || 'all'
  hotKeywordStore.load(type)
}
watch(
  () => activeTab.value,
  (tab) => {
    fetchHotKeywords(tab)
  },
  { immediate: true }
)

// =============== 搜一搜 ===================
const keyword = ref('')
const searching = ref(false)
const searchList = ref<any[]>([])
const searchTotal = ref(0)
const searchPage = ref(1)
const searchLoading = ref(false)
const searchNoMore = ref(false)
const searchSentinel = ref<HTMLElement | null>(null)
let observerSearch: IntersectionObserver | null = null

const historyKey = computed(() => `searchHistory_${activeTab.value}`)
const historyList = ref<string[]>([])

watch(
  () => historyKey.value,
  () => {
    historyList.value = JSON.parse(localStorage.getItem(historyKey.value) || '[]')
  },
  { immediate: true }
)

function resetSearchState() {
  searchList.value = []
  searchTotal.value = 0
  searchPage.value = 1
  searchLoading.value = false
  searchNoMore.value = false
  searching.value = false
  if (observerSearch) observerSearch.disconnect()
}

const onKeywordChange = () => {
  if (!keyword.value) resetSearchState()
}
const clearHistory = () => {
  historyList.value = []
  localStorage.removeItem(historyKey.value)
}
const handleHistoryClick = (val: string) => {
  keyword.value = val
  handleSearch()
}
const handleHotTagClick = (tag: string) => {
  keyword.value = tag
  handleSearch()
}

async function handleSearch() {
  if (!keyword.value.trim()) return
  resetSearchState()
  await nextTick()
  searching.value = true
  if (!historyList.value.includes(keyword.value)) {
    historyList.value.unshift(keyword.value)
    if (historyList.value.length > 10) historyList.value.pop()
    localStorage.setItem(historyKey.value, JSON.stringify(historyList.value))
  }
  await fetchSearchPage()
}

async function fetchSearchPage() {
  if (searchLoading.value || searchNoMore.value) return
  searchLoading.value = true

  const params = {
    page: searchPage.value,
    pageSize: 15,
    keyword: keyword.value.trim()
  }

  try {
    let res
    if (activeTab.value === '小说') {
      res = await novelStore.searchNovels({
        keyword: keyword.value.trim(),
        page: searchPage.value,
        pageSize: 15,
        categoryId: selectedCategory.value.key || '',
      })
    } else if (activeTab.value === '有声') {
      res = await audioNovelStore.searchAudioNovels({
        keyword: keyword.value.trim(),
        page: searchPage.value,
        pageSize: 15,
        categoryId: selectedCategory.value.key || '',
      })
    } else {
      // 漫画和动漫都走这里
      res = await comicStore.loadAllComics(params)
    }

    const listArr = res?.list || []
    const newList = listArr.map(item => ({
      ...item,
      title: item.name || item.title,
      tag: item.tags || [],
      cover: item.cover || item.cover_url || '',
    }))

    if (searchPage.value === 1) {
      searchList.value = newList
    } else {
      searchList.value = searchList.value.concat(newList)
    }

    searchTotal.value = res?.total || 0
    if (searchList.value.length >= searchTotal.value || newList.length < 15) {
      searchNoMore.value = true
    }

    searchPage.value++
    await nextTick()
    initSearchObserver()
  } catch (err) {
    console.error(err)
  }

  searchLoading.value = false
}

function initSearchObserver() {
  if (!searching.value) return
  if (observerSearch) observerSearch.disconnect()
  nextTick(() => {
    if (!searchSentinel.value) return
    observerSearch = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !searchLoading.value && !searchNoMore.value) {
        fetchSearchPage()
      }
    }, {
      root: document.querySelector('.scroll-content') || undefined,
      threshold: 0.1,
    })
    observerSearch.observe(searchSentinel.value)
  })
}

// =============== 分类/标签/排序 统一逻辑 ===================
const categoryList = ref<{ key: number, label: string }[]>([])
const tagList = ref<{ id: number, name: string }[]>([{ id: 0, name: '全部标签' }])
const sortList = ref(['综合排序', '观看最多', '最新上架', '收藏最多'])
const sortMap: Record<string, string> = {
  '综合排序': 'default',
  '观看最多': 'views',
  '最新上架': 'newest',
  '收藏最多': 'collects'
}
const selectedCategory = ref<{ key: number, label: string }>({ key: 0, label: '全部分类' })
const selectedTag = ref<number>(0)
const selectedSort = ref<string>('综合排序')

let categoryLoaded = false
let tagsLoaded = false

const loadCategories = async () => {
  if (categoryLoaded) return
  if (activeTab.value === '漫画') {
    await comicStore.loadMainCategories()
    categoryList.value = [
      { key: 0, label: '全部分类' },
      ...comicStore.mainCategories.map(c => ({ key: c.id, label: c.name }))
    ]
  } else if (activeTab.value === '小说') {
    await novelStore.fetchCategoryList()
    categoryList.value = [
      { key: 0, label: '全部分类' },
      ...novelStore.mainCategories.map(c => ({ key: c.id, label: c.name }))
    ]
  } else if (activeTab.value === '有声') {
    await audioNovelStore.loadCategoryList()
    categoryList.value = [
      { key: 0, label: '全部分类' },
      ...audioNovelStore.mainCategories.map(c => ({ key: c.id, label: c.name }))
    ]
  }
  categoryLoaded = true
}

const loadTags = async () => {
  if (tagsLoaded) return
  if (activeTab.value === '漫画') {
    await comicStore.loadComicTags({ status: 1, page: 1, page_size: 50 })
    tagList.value = [{ id: 0, name: '全部标签' }, ...comicStore.comicTags.map(tag => ({ id: tag.id, name: tag.name }))]
  } else if (activeTab.value === '小说') {
    await novelStore.fetchTagList()
    tagList.value = [{ id: 0, name: '全部标签' }, ...novelStore.tagList.map(tag => ({ id: tag.id, name: tag.name }))]
  } else if (activeTab.value === '有声') {
    await audioNovelStore.loadTagList()
    tagList.value = [{ id: 0, name: '全部标签' }, ...audioNovelStore.tagList.map(tag => ({ id: tag.id, name: tag.name }))]
  }
  tagsLoaded = true
}

function resetAllData() {
  page.value = 1
  lazyList.value = []
  isNoMore.value = false
  if (observer) observer.disconnect()
}

// ============== 懒加载与数据拉取 ================
const lazyList = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const isApiLoading = ref(false)
const isNoMore = ref(false)
const lazySentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

async function fetchFirstPage(force = false) {
  resetAllData()
  isApiLoading.value = true

  let res
  if (activeTab.value === '漫画') {
    res = await comicStore.loadLibraryComicsWithCache({
      categoryId: selectedCategory.value.key,
      tagId: selectedTag.value,
      sort: sortMap[selectedSort.value] || 'default',
      page: 1,
      pageSize: 15,
      force
    })
  } else if (activeTab.value === '小说') {
    res = await novelStore.loadLibraryNovelsWithCache({
      categoryId: selectedCategory.value.key,
      tagId: selectedTag.value,
      sort: sortMap[selectedSort.value] || 'default',
      page: 1,
      pageSize: 15,
      force
    })
  } else if (activeTab.value === '有声') {
    res = await audioNovelStore.loadLibraryAudioNovelsWithCache({
      categoryId: selectedCategory.value.key,
      tagId: selectedTag.value,
      sort: sortMap[selectedSort.value] || 'default',
      page: 1,
      pageSize: 15,
      force
    })
  }
  const newList = (res?.list || []).map(item => ({
    ...item,
    title: item.name || item.title,
    tag: item.tags || [],
    cover: item.cover || item.cover_url || '',
  }))
  lazyList.value = newList
  total.value = res?.total || 0
  isNoMore.value = res?.noMore
  isApiLoading.value = false
  page.value = 2
  await nextTick()
  initObserver()
}

async function fetchNextPage() {
  if (isApiLoading.value || isNoMore.value) return
  isApiLoading.value = true
  let res
  if (activeTab.value === '漫画') {
    res = await comicStore.loadLibraryComicsWithCache({
      categoryId: selectedCategory.value.key,
      tagId: selectedTag.value,
      sort: sortMap[selectedSort.value] || 'default',
      page: page.value,
      pageSize: 15
    })
  } else if (activeTab.value === '小说') {
    res = await novelStore.loadLibraryNovelsWithCache({
      categoryId: selectedCategory.value.key,
      tagId: selectedTag.value,
      sort: sortMap[selectedSort.value] || 'default',
      page: page.value,
      pageSize: 15
    })
  } else if (activeTab.value === '有声') {
    res = await audioNovelStore.loadLibraryAudioNovelsWithCache({
      categoryId: selectedCategory.value.key,
      tagId: selectedTag.value,
      sort: sortMap[selectedSort.value] || 'default',
      page: page.value,
      pageSize: 15
    })
  }
  const newList = (res?.list || []).map(item => ({
    ...item,
    title: item.name || item.title,
    tag: item.tags || [],
    cover: item.cover || item.cover_url || '', 
  }))
  lazyList.value = lazyList.value.concat(newList)
  total.value = res?.total || 0
  isNoMore.value = res?.noMore
  isApiLoading.value = false
  page.value++
}

function initObserver() {
  if (observer) observer.disconnect()
  nextTick(() => {
    if (!lazySentinel.value) return
    observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isApiLoading.value && !isNoMore.value) {
        fetchNextPage()
      }
    }, {
      root: document.querySelector('.scroll-content') || undefined,
      threshold: 0.1,
    })
    observer.observe(lazySentinel.value)
  })
}

// =============== 来源信息保存&还原 ================
function saveCurrentSearchState() {
  sessionStorage.setItem('search-main-return-path', window.location.pathname + window.location.search)
  sessionStorage.setItem('search-main-return-tab', activeTab.value)
  sessionStorage.setItem('search-main-return-type', currentTab.value)
  sessionStorage.setItem('search-main-keyword', keyword.value)
  sessionStorage.setItem('search-main-category', selectedCategory.value.key + '')
  sessionStorage.setItem('search-main-tag', selectedTag.value + '')
  sessionStorage.setItem('search-main-sort', selectedSort.value)
  sessionStorage.setItem('search-main-page', page.value + '')
  if (scrollContent.value) {
    sessionStorage.setItem('search-main-scroll-top', scrollContent.value.scrollTop + '')
  }
  // -------- 新增 for 搜一搜 ----------
  if (currentTab.value === 'search' && searching.value) {
    sessionStorage.setItem('search-main-searching', '1')
    sessionStorage.setItem('search-main-search-list', JSON.stringify(searchList.value))
    sessionStorage.setItem('search-main-search-page', searchPage.value + '')
    sessionStorage.setItem('search-main-search-total', searchTotal.value + '')
    sessionStorage.setItem('search-main-search-keyword', keyword.value)
  }
}

function goToDetail(item) {
  saveCurrentSearchState()
  sessionStorage.setItem('search-main-is-return', '1')
  if (activeTab.value === '小说') {
    router.push({
      name: 'NovelDetail',
      params: { id: item.id },
      query: { title: item.title }
    })
  } else if (activeTab.value === '漫画') {
    router.push({
      name: 'ComicDetail',
      params: { id: item.id },
      query: { title: item.title }
    })
  } else if (activeTab.value === '有声') {
    router.push({ name: 'AudioPlayer', params: { id: item.id }, query: { title: item.title } })
  }
  // 你如果还有动漫/有声，按需补充 else if
}

function goBack() {
  const entryPath = sessionStorage.getItem('search-entry-path')
  const entryScroll = sessionStorage.getItem('search-entry-scroll')
  // 清理，避免反复
  sessionStorage.removeItem('search-entry-path')
  sessionStorage.removeItem('search-entry-scroll')
  if (entryPath) {
    router.replace(entryPath).then(() => {
      setTimeout(() => {
        window.scrollTo(0, parseInt(entryScroll || '0', 10))
      }, 0)
    })
  } else {
    router.replace('/') // 兜底
  }
}

// 页面初始化
async function restoreFromQuery(q: any) {
  let restoreCategoryId = q.category
  let restoreTagId = q.tag
  let restorePage = Number(sessionStorage.getItem('search-main-page') || '1')
  let restoreScroll = sessionStorage.getItem('search-main-scroll-top')

  if (q.activeTab) activeTab.value = q.activeTab as string
  if (q.tabType) currentTab.value = q.tabType as 'search' | 'library'
  await nextTick()

  if (q.keyword !== undefined) keyword.value = q.keyword as string
  if (q.sort) selectedSort.value = q.sort as string

  // 只用一套 categoryList/selectedCategory/tagList/selectedTag
  if (currentTab.value === 'library') {
    await loadCategories()
    if (restoreCategoryId) {
      const catItem = categoryList.value.find(c => c.key == restoreCategoryId)
      if (catItem) selectedCategory.value = catItem
    }
    await loadTags()
    if (restoreTagId) {
      selectedTag.value = Number(restoreTagId)
    }
    await fetchFirstPage()
    for (let i = 2; i <= restorePage; i++) {
      page.value = i
      await fetchNextPage()
    }
  } else {
    // ========================== 搜一搜tab专用还原 ==========================
    const searchingFlag = sessionStorage.getItem('search-main-searching')
    if (searchingFlag === '1') {
      // 有保存的搜索结果，全部还原
      searching.value = true
      keyword.value = sessionStorage.getItem('search-main-search-keyword') || ''
      try {
        searchList.value = JSON.parse(sessionStorage.getItem('search-main-search-list') || '[]')
      } catch {
        searchList.value = []
      }
      searchPage.value = Number(sessionStorage.getItem('search-main-search-page') || '1')
      searchTotal.value = Number(sessionStorage.getItem('search-main-search-total') || '0')
      searchLoading.value = false
      searchNoMore.value = searchList.value.length >= searchTotal.value
      await nextTick()
      initSearchObserver()
    } else {
      // 没有保存状态才初始化
      resetSearchState()
    }
  }

  // 【保证数据加载后再滚动】
  await nextTick()
  setTimeout(() => {
    if (restoreScroll && scrollContent.value) {
      scrollContent.value.scrollTop = parseInt(restoreScroll, 10) || 0
    }
  }, 0)
}

// 第一次加载/onMounted
onMounted(() => {
  if (!sessionStorage.getItem('search-entry-path')) {
    sessionStorage.setItem('search-entry-path', window.location.pathname + window.location.search)
    sessionStorage.setItem('search-entry-scroll', (scrollContent.value?.scrollTop ?? window.scrollY ?? 0) + '')
  }
  restoreFromQuery(route.query)
})

// keep-alive
onActivated(() => {
  restoreFromQuery(route.query)
})

// 分类/标签/排序变化拉第一页
watch([selectedCategory, selectedTag, selectedSort, activeTab], async () => {
  // 变化都自动切库，不分类型
  if (currentTab.value === 'library') {
    await fetchFirstPage()
  }
})

// tab 切换时控制标签与数据请求
async function switchTab(tab: 'search' | 'library') {
  if (currentTab.value === tab) return
  currentTab.value = tab

  resetAllData()

  if (tab === 'library') {
    categoryLoaded = false
    tagsLoaded = false
    await loadCategories()
    await loadTags()
    await fetchFirstPage()
  }

  await nextTick()
  initObserver()
}
</script>

<style scoped>
.search-main-page {
  background: #fff;
  height: 100vh;
  display: flex;
  flex-direction: column;
  /* 这里不要overflow-y: auto 让内容区自己滚动 */
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-mask-image: linear-gradient(black 100%, black 100%);
  mask-image: linear-gradient(black 100%, black 100%);
}
.search-main-page::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
}

/* 新增顶部吸顶区样式 */
.fixed-header {
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 20;
}

/* 内容滚动区，独立滚动 */
.scroll-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  /* 可选底部留白 */
  padding-bottom: 8vw;
}

/* 以下全部是你原有的css，无删减！ */
.top-bar {
  display: flex;
  align-items: center;
  padding: 2.67vw 3.2vw;
}
.back-btn {
  width: 14.67vw;
  height: 11.73vw;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -2.67vw;
  cursor: pointer;
}
.back-btn img {
  width: 6.4vw;
  height: 6.4vw;
}
.tabs {
  display: flex;
  justify-content: center;
  flex: 1;
  gap: 13.34vw;
  margin-left: -5.34vw;
}
.tab-item {
  font-size: 5.34vw;
  font-weight: 500;
  color: #666;
  position: relative;
}
.tab-item.active { color: #ff4b4b; font-weight: 600; }
.tab-item.active::after {
  content: "";
  position: absolute;
  bottom: -1.07vw;
  left: 50%;
  transform: translateX(-50%);
  width: 6.94vw;
  height: 0.8vw;
  background: #ff4b4b;
  border-radius: 0.53vw;
}
.search-bar {
  display: flex;
  align-items: center;
  padding: 4vw 3.2vw 2.67vw;
  gap: 2.67vw;
}
.search-input {
  flex: 1;
  display: flex;
  align-items: center;
  background: #f2f2f2;
  padding: 2.13vw 3.2vw;
  border-radius: 5.34vw;
}
.search-input input {
  border: none;
  outline: none;
  flex: 1;
  background: transparent;
}
.search-icon { width: 5.34vw; height: 5.34vw; margin-right: 2.13vw; }
.search-btn {
  padding: 2.13vw 4.27vw;
  background: #ff4b4b;
  color: #fff;
  border-radius: 5.34vw;
  font-weight: 500;
  font-size: 4vw;
}
.history-wrapper {
  padding: 4vw 3.2vw 0;
}
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.67vw;
}
.history-title {
  font-size: 4.27vw;
  font-weight: 600;
  color: #333;
}
.clear-btn {
  font-size: 3.73vw;
  color: #666;
  display: flex;
  align-items: center;
}
.delete-icon {
  width: 4.8vw;
  height: 4.8vw;
  margin-right: 1.07vw;
}
.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 2.67vw 3.2vw;
}
.history-tag {
  padding: 1.6vw 4.27vw;
  border: 0.27vw solid #ccc;
  border-radius: 5.34vw;
  font-size: 3.73vw;
  color: #333;
}
.hot-tags-wrapper {
  flex: 1;
  padding: 5.34vw 3.2vw 5.34vw;
  display: flex;
  flex-direction: column;
}
.hot-tags-box {
  flex: 1;
  background: linear-gradient(180deg, #fff 0%, #f9f9f9 100%);
  border-radius: 4vw;
  padding: 5.34vw 4vw;
  box-shadow: 0 1.07vw 2.67vw rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
}
.hot-title {
  font-size: 4.27vw;
  font-weight: 600;
  margin-bottom: 5.34vw;
  color: #f12c2c;
  display: flex;
  align-items: center;
}
.hot-icon { width: 5.87vw; height: 5.87vw; margin-right: 1.6vw; }
.tag-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  row-gap: 4.8vw;
}
.tag-item {
  display: flex;
  align-items: center;
  font-size: 4.27vw;
  color: #333;
  width: 45%;
}
.tag-num {
  display: inline-block;
  width: 8vw;
  height: 8vw;
  line-height: 8vw;
  text-align: center;
  border-radius: 1.6vw;
  margin-right: 3.2vw;
  font-weight: 600;
  font-size: 4vw;
}
.num-1 { background: #e74c3c; color: #fff; }
.num-2 { background: #f39c12; color: #fff; }
.num-3 { background: #3498db; color: #fff; }
.num-4, .num-5, .num-6, .num-7, .num-8, .num-9, .num-10 {
  background: #bec4b7;
  color: #fff;
}
.filter-wrapper {
  padding: 4vw 3.2vw;
  display: flex;
  flex-direction: column;
  gap: 5.34vw;
}
.filter-row {
  display: flex;
  align-items: flex-start;
}
.filter-title {
  width: 16vw;
  font-weight: 600;
  color: #333;
  font-size: 4vw;
  flex-shrink: 0;
}
.filter-tags {
  overflow-x: auto;
  white-space: nowrap;
  padding-bottom: 0.53vw;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.filter-tags::-webkit-scrollbar {
  display: none;
}
.filter-tag {
  display: inline-block;
  margin-right: 2.67vw;
  padding: 1.6vw 3.73vw;
  border: 0.27vw solid #ccc;
  border-radius: 1.6vw;
  font-size: 3.73vw;
  color: #666;
  background: #fff;
  white-space: nowrap;
  transition: 0.2s;
}
.filter-tag.active {
  border-color: #ff4b4b;
  color: #ff4b4b;
  background: #fff0f5;
}
.empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 26.67vw 0 10.67vw;
  cursor: pointer;
}
.empty-img {
  width: 42.7vw;
  height: 42.7vw;
  margin-bottom: 4.27vw;
  border-radius: 3.2vw;
}
.empty-text {
  font-size: 4.53vw;
  color: #888;
}
.loading-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5.34vw 0;
  font-size: 3.73vw;
}
.custom-spinner {
  width: 9.34vw;
  height: 9.34vw;
  margin-bottom: 2.13vw;
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
  margin: 5.33vw 0;
}
.load-more-trigger {
  height: 13.34vw;
  margin-top: 5.34vw;
}
</style>