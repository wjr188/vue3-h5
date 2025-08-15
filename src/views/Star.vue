<template>
  <div class="star-wrapper">
    <!-- 搜索栏 -->
    <div class="search-wrapper">
      <div class="search-bar">
        <img src="/icons/eye.svg" class="search-icon" />
        <input
          v-model="inputKeyword"
          type="text"
          placeholder="搜索博主/关键词"
          @keyup.enter="onSearch"
          @input="handleInputChange"
        />
        <img
          src="/icons/close.svg"
          class="clear-icon"
          @click="onClear"
          alt="清除"
          v-show="inputKeyword"
        />
      </div>
      <div class="search-button" @click="onSearch">搜索</div>
    </div>

    <!-- 分类 tabs -->
    <div class="category-tabs">
      <div
        v-for="category in categories"
        :key="category.id"
        class="tab"
        :class="{ active: currentCategoryId === category.id }"
        @click="onCategoryChange(category)"
      >
        {{ category.name }}
        <span class="count" v-if="category.creator_count > 0">
          ({{ category.creator_count }})
        </span>
      </div>
    </div>

    <!-- Banner -->
    <div class="banner-container">
      <Banner />
    </div>

    <!-- Swiper 分类切换 -->
    <swiper
      :initial-slide="currentIndex"
      @swiper="onSwiper"
      @slideChange="onSlideChange"
      :resistance-ratio="0.2"
      :speed="300"
      :threshold="30"
      :slides-per-view="1"
      class="swiper-container"
    >
      <swiper-slide v-for="cat in categories" :key="cat.id">
        <div
          class="slide-content"
          :ref="setScrollRef(cat.id)"
          @scroll.passive="onScroll(cat.id)"
        >
          <!-- 首屏加载 -->
          <div v-if="isLoading(cat.id) && !getCreators(cat.id).length" class="loading-container">
            <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
            <div class="loading-text">正在加载博主数据...</div>
          </div>

          <!-- 空状态 -->
          <div v-else-if="!getCreators(cat.id).length" class="empty-state">
            <div class="empty-text">该分类暂无博主</div>
          </div>

          <!-- 列表 -->
          <div v-else class="grid">
            <div
              v-for="item in getCreators(cat.id)"
              :key="item.id"
              class="card"
              @click="goToDetail(item)"
            >
              <img v-lazy="item.avatar || '/static/default-avatar.png'" class="avatar" :alt="item.name" />
              <div class="info">
                <div class="name">{{ item.name }}</div>
              </div>
            </div>
          </div>

          <!-- 加载更多 -->
          <div class="loading-tip" v-if="isLoading(cat.id) && getCreators(cat.id).length">
            <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
            <div class="loading-text">客官别走，妾身马上就好~</div>
          </div>

          <!-- 没有更多 -->
          <div class="no-more-text" v-else-if="hasNoMore(cat.id) && getCreators(cat.id).length">
            客官，妾身被你弄高潮了，扛不住了 ~
          </div>

          <div class="bottom-spacer" aria-hidden="true"></div>
        </div>
      </swiper-slide>
    </swiper>

    <!-- 返回顶部（跟随当前激活分类的滚动容器） -->
    <BackToTop
      :key="currentCategoryId"
      :scroll-container="activeScrollEl"
      :threshold="300"
      :duration="300"
    />

    <!-- 底部导航 -->
    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/css'
import TabBar from '@/components/TabBar.vue'
import Banner from '@/components/Banner.vue'
import BackToTop from '@/components/BackToTop.vue'
import { useOnlyfansH5Store } from '@/store/onlyfansH5'

const router = useRouter()
const onlyfansStore = useOnlyfansH5Store()

/** 分类列表 */
const categories = computed(() => onlyfansStore.categories)

/** 当前分类 ID / 索引 */
const currentCategoryId = ref<number>(Number(sessionStorage.getItem('star-category-id') || 0))
const currentIndex = ref<number>(0)

/** Swiper 实例 */
const swiperIns = ref<any>(null)
function onSwiper(swiper: any) { swiperIns.value = swiper }

/** 搜索关键字（仅在当前分类生效） */
const inputKeyword = ref('')
const activeKeyword = () => inputKeyword.value.trim()

/** 每个 slide 的滚动容器 */
const scrollRefs = ref<Record<number, HTMLElement>>({})
const setScrollRef = (catId: number) => (el: HTMLElement | null) => {
  if (el) scrollRefs.value[catId] = el
}

/** 获取某分类下要展示的 creators：
 * - 有关键字且是当前分类 => 用实时列表（onlyfansStore.creators）
 * - 否则 => 先用缓存，再用当前实时列表兜底
 */
function getCreators(catId: number) {
  if (currentCategoryId.value === catId && activeKeyword()) {
    return onlyfansStore.creators
  }
  const cached = onlyfansStore.creatorCache[catId]?.list
  if (cached && cached.length) return cached
  if (currentCategoryId.value === catId) return onlyfansStore.creators
  return []
}

/** 是否在加载中 */
function isLoading(catId: number) {
  return currentCategoryId.value === catId && onlyfansStore.loading.creators
}

/** 是否没有更多：
 * - 有关键字且是当前分类 => 看实时分页
 * - 否则 => 看缓存或当前分页
 */
function hasNoMore(catId: number) {
  if (currentCategoryId.value === catId && activeKeyword()) {
    return onlyfansStore.creatorPagination ? !onlyfansStore.creatorPagination.has_more : false
  }
  const pag = currentCategoryId.value === catId
    ? onlyfansStore.creatorPagination
    : onlyfansStore.creatorCache[catId]?.pagination
  return pag ? !pag.has_more : false
}

/** 首次拉分类 + 定位当前分类 + 拉首屏 creators */
async function boot() {
  await onlyfansStore.fetchCategories()

  const list = categories.value
  if (!list.length) return

  const fallbackId = list[0].id
  if (!list.find(c => c.id === currentCategoryId.value)) {
    currentCategoryId.value = fallbackId
  }
  currentIndex.value = list.findIndex(c => c.id === currentCategoryId.value)

  onlyfansStore.setCurrentCategory(list[currentIndex.value])

  const kw = activeKeyword()
  if (kw) {
    // 有关键字：直接拉实时第一页（不走缓存）
    await onlyfansStore.fetchCreators(currentCategoryId.value, { keyword: kw })
  } else if (!onlyfansStore.creatorCache[currentCategoryId.value]) {
    // 无关键字且没缓存：拉全量
    await onlyfansStore.fetchCreators(currentCategoryId.value, { keyword: undefined })
  }
}

/** 滚动加载更多（仅当前激活分类触发） */
async function onScroll(catId: number) {
  const el = scrollRefs.value[catId]
  if (!el || catId !== currentCategoryId.value) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
    await onlyfansStore.loadMoreCreators(catId, activeKeyword() || undefined)
  }
}

/** 顶部 tab 点击切换 */
async function onCategoryChange(cat: any) {
  const newIndex = categories.value.findIndex((c: any) => c.id === cat.id)
  if (newIndex === -1 || currentIndex.value === newIndex) return

  saveScroll(currentCategoryId.value)
  currentCategoryId.value = cat.id
  currentIndex.value = newIndex
  sessionStorage.setItem('star-category-id', String(cat.id))

  onlyfansStore.setCurrentCategory(cat)
  await nextTick()
  swiperIns.value?.slideTo(newIndex, 300)
  restoreScroll(cat.id)

  const kw = activeKeyword()
  if (kw) {
    // 有关键字：新分类也按关键字拉数据
    await onlyfansStore.fetchCreators(cat.id, { keyword: kw })
  } else if (!onlyfansStore.creatorCache[cat.id]) {
    // 无关键字且没缓存：拉全量
    await onlyfansStore.fetchCreators(cat.id, { keyword: undefined })
  }
}

/** Swiper 滑动切换 */
async function onSlideChange(swiper: any) {
  saveScroll(currentCategoryId.value)

  currentIndex.value = swiper.activeIndex
  const cat = categories.value[currentIndex.value]
  if (!cat) return

  currentCategoryId.value = cat.id
  sessionStorage.setItem('star-category-id', String(cat.id))
  onlyfansStore.setCurrentCategory(cat)
  restoreScroll(cat.id)

  const kw = activeKeyword()
  if (kw) {
    await onlyfansStore.fetchCreators(cat.id, { keyword: kw })
  } else if (!onlyfansStore.creatorCache[cat.id]) {
    await onlyfansStore.fetchCreators(cat.id, { keyword: undefined })
  }
}

/** 搜索（只影响当前分类） */
function handleInputChange() {
  if (!inputKeyword.value) onClear()
}
async function onSearch() {
  const kw = activeKeyword()
  if (!kw) return
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  await onlyfansStore.fetchCreators(currentCategoryId.value, { keyword: kw })
}
async function onClear() {
  inputKeyword.value = ''
  await onlyfansStore.fetchCreators(currentCategoryId.value, { keyword: undefined })
}

/** 进入挂载与激活时机 */
onMounted(async () => {
  await boot()

  nextTick(() => {
    const lastId = Number(sessionStorage.getItem('star-list-category-id') || 0)
    const idx = categories.value.findIndex(c => c.id === lastId)
    if (lastId && idx >= 0) {
      currentCategoryId.value = lastId
      currentIndex.value = idx
      swiperIns.value?.slideTo(idx, 0)
      nextTick(() => restoreScroll(currentCategoryId.value))
    } else {
      swiperIns.value?.slideTo(currentIndex.value, 0)
      nextTick(() => restoreScroll(currentCategoryId.value))
    }
  })
})

onActivated(() => {
  restoreScroll(currentCategoryId.value)
  nextTick(() => swiperIns.value?.slideTo(currentIndex.value, 0))
})

/** 详情页 */
function goToDetail(item: any) {
  saveScroll(currentCategoryId.value)
  sessionStorage.setItem('star-list-category-id', String(currentCategoryId.value))
  sessionStorage.setItem('star-list-index', String(currentIndex.value))
  sessionStorage.setItem('star-detail-data', JSON.stringify(item))
  sessionStorage.setItem('star-list-from', '1')
  router.push({ name: 'StarDetail', params: { id: item.id } })
}

/** 滚动位置记忆 */
function saveScroll(catId: number) {
  const top = scrollRefs.value[catId]?.scrollTop || 0
  sessionStorage.setItem(`star-scroll-${catId}`, String(top))
}
function restoreScroll(catId: number) {
  const saved = sessionStorage.getItem(`star-scroll-${catId}`)
  if (!saved) return
  let retry = 0
  const tryRestore = () => {
    const el = scrollRefs.value[catId]
    if (el && el.scrollHeight > 0) el.scrollTop = parseInt(saved)
    else if (retry++ < 20) setTimeout(tryRestore, 30)
  }
  tryRestore()
}

/** 返回顶部的容器（当前分类的滚动元素） */
const activeScrollEl = computed<HTMLElement | null>(() => {
  return scrollRefs.value[currentCategoryId.value] || null
})
</script>

<style scoped>
.star-wrapper {
  background: #fff;
  min-height: 100vh;
  box-sizing: border-box;
  padding-bottom: 10vw; /* 70px */
  padding-top: 12vw;    /* 60px */
}

.search-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  background: #fff;
  padding: 2vw;
  border-bottom: none;
  box-shadow: none;
}
.search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  background: rgba(240, 240, 240, 0.9);
  border-radius: 2vw;
  padding: 2.13vw 3.73vw;
}
.search-icon {
  width: 4.27vw;
  height: 4.27vw;
  margin-right: 2.13vw;
  opacity: 0.5;
}
.search-bar input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: #333;
  font-size: 4.27vw;
  touch-action: manipulation;
}
.banner-container {
  margin: 3.2vw 0;
}
.clear-icon {
  width: 5.86vw;
  height: 5.86vw;
  margin-left: 2.13vw;
  cursor: pointer;
  opacity: 0.8;
}
.search-button {
  margin-left: 2.13vw;
  padding: 1.6vw 3.73vw;
  background: #f12c2c;
  color: white;
  border-radius: 5.33vw;
  font-size: 3.73vw;
  font-weight: bold;
  white-space: nowrap;
}

.category-tabs {
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  overflow-x: auto;
  gap: 3.2vw;
  padding: 0 3vw;
  background: #fcfbfb;
  position: sticky;
  top: calc(10vw + 2vw * 2);
  z-index: 9;
  border-bottom: 5px solid #fcfbfb;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.category-tabs::-webkit-scrollbar { display: none; }
.tab {
  white-space: nowrap;
  flex: 0 0 auto;
  padding: 1.6vw 3.73vw;
  font-size: 3.73vw;
  border-radius: 2vw;
  background: #f0f0f0;
  color: #333;
}
.tab.active { background: #f12c2c; color: #fff; }

.swiper-container {
  height: calc(100vh - 42.66vw); /* 根据你的头部高度适配 */
}
.slide-content {
  overflow-y: auto;
  height: 100%;
  background: #fff;
  padding: 0 3.2vw;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
  -webkit-mask-image: linear-gradient(black 100%, black 100%);
  mask-image: linear-gradient(black 100%, black 100%);
}
.slide-content::-webkit-scrollbar { display: none !important; }

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3.2vw;
  margin-top: 1vw;
}
.card {
  background: rgba(235, 233, 233, 0.9);
  border-radius: 2vw;
  overflow: hidden;
  text-align: center;
  padding: 0.5vw 1.6vw;
}
.avatar {
  width: 100%;
  aspect-ratio: 1/1;
  object-fit: cover;
  border-radius: 2.13vw;
}
.info { margin-top: 1.6vw; }
.name { font-size: 3.46vw; font-weight: bold; color: #333; }

/* 首屏加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 13.33vw 0;
  color: #999;
}
.loading-container .custom-spinner {
  width: 9.33vw;
  height: 9.33vw;
  margin-bottom: 2.66vw;
  animation: spin 0.8s linear infinite;
}
.loading-container .loading-text {
  color: #f12c2c;
  font-weight: 500;
  font-size: 4.26vw;
}

/* 加载更多状态 */
.loading-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5.33vw 0;
  font-size: 3.73vw;
}
.custom-spinner {
  width: 9.33vw;
  height: 9.33vw;
  margin-bottom: 2.13vw;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { color: #f12c2c; font-weight: 500; }

/* 没有更多状态 */
.no-more-text {
  text-align: center;
  color: #999;
  font-weight: bold;
  font-size: 3.73vw;
  margin: 5.33vw 0;
}

/* 空状态 */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 13.33vw 0;
}
.empty-text { color: #999; font-size: 4.26vw; }

.bottom-spacer {
  height: calc(14vw + env(safe-area-inset-bottom));
}
</style>
