<template>
  <SafeWrapper>
  <div class="home-wrapper" v-if="pageReady">
    <TopNavBar
      :activeCategory="currentCategory"
      :categories="categories"
      @categoryChange="onCategoryChange"
      @drawerOpen="drawerVisible = true"
    />
    <SideDrawer
      :visible="drawerVisible"
      :list="categories"
      :active="currentCategory"
      @close="drawerVisible = false"
      @select="onCategoryChange"
    />
    <swiper
      ref="swiperRef"
      :initial-slide="currentIndex"
      @swiper="onSwiperReady"
      :onSlideChange="onSlideChange"
      class="swiper-container"
      :resistance-ratio="0.1"
      :longSwipes="true"
      :longSwipesRatio="0.3"
      :threshold="30"
      :speed="300"
      :space-between="0"
      :slides-per-view="1"
    >
      <swiper-slide v-for="(cat, i) in categories" :key="cat.id">
        <div class="slide-content" :ref="el => setSlideRef(el, i)">
          <Banner :key="bannerKey + '-' + cat.name" />
          <NoticeBar />
          <!-- 推荐页/普通分类内容 -->
          <template v-if="cat.name === '推荐'">
            <div>
              <QuickEntryBar />
              <Recommend
                :groups="sortedGroups"
                @clickItem="goToPlay"
                @goToMore="goToListPage"
                @refreshGroup="onRefreshGroup"
              />
            </div>
          </template>
          <template v-else>
            <NormalCategory
              :categoryList="getCategoryState(cat.name).data"
              :videoBasicData="videoBasicData"
              :categoryName="cat.name"
              @clickItem="goToPlay"
              @goToMore="goToListPage"
              @refresh="refreshCategory"
            />
          </template>
          <!-- 统一懒加载提示，只渲染一套 -->
          <div
            v-if="currentIndex === i && hasMore && !loading"
            :ref="el => setSentinelRef(el, i)"
            class="load-more-trigger"
          ></div>
          <div v-if="currentIndex === i && loading" class="loading-tip">
            <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
            <div class="loading-text">客官别走，妾身马上就好~</div>
          </div>
          <div v-if="currentIndex === i && noMore" class="no-more-text">
            客官，妾身被你看光了，扛不住了~
          </div>
          <div v-if="currentIndex === i && !loading && !hasMore && !noMore" class="empty-data-message">
            <p>该分类暂无有声数据或数据加载失败...</p>
          </div>
        </div>
      </swiper-slide>
    </swiper>
    <TabBar />
  </div>
  </SafeWrapper>
</template>
<script setup lang="ts">
import { ref, onMounted, nextTick, watch, type Ref, type ComponentPublicInstance, computed, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Swiper, SwiperSlide } from 'swiper/vue'
import type { Swiper as SwiperCore } from 'swiper'
import 'swiper/css'
import SafeWrapper from '@/components/SafeWrapper.vue'
import TopNavBar from '../components/TopNavBar.vue'
import SideDrawer from '../components/SideDrawer.vue'
import Banner from '../components/Banner.vue'
import NoticeBar from '../components/NoticeBar.vue'
import QuickEntryBar from '../components/QuickEntryBar.vue'
import Recommend from '../components/Recommend.vue'
import NormalCategory from '../components/NormalCategory.vue'
import TabBar from '../components/TabBar.vue'
import { useLongCategoryStore } from "@/store/longCategoryStore";
import { useLongVideoStore } from "@/store/longVideoStore";
import { useH5LongVideoStore } from "@/store/h5LongVideo.store";
import { encode } from '@/utils/base62'
import { storeToRefs } from 'pinia'

// 类型定义
interface Category {
  name: string
  [key: string]: any
}

const router = useRouter()
const swiperRef = ref<InstanceType<typeof Swiper> | null>(null)
const swiperInstance = ref<SwiperCore | null>(null)
const longVideoStore = useLongVideoStore();
const h5LongVideoStore = useH5LongVideoStore();
const drawerVisible = ref(false)
const pageReady = ref(false)

const categoryStore = useLongCategoryStore();
const categories = ref<Category[]>([]);
const categoryNames = ref<string[]>([]);
const observerRef = ref(null)
const currentCategory = ref<string>('推荐')
const currentIndex = ref<number>(0)
const bannerKey = ref(0)
const slideRefs = ref<(HTMLElement | null)[]>([])
const sentinelRefs = ref<(HTMLElement | null)[]>([]);
const isRestoringScroll = ref(false)
const isSettingCategories = ref(false); // 添加保护锁

// 用 pinia store 的 categoryStates 和 videoBasicData
const { categoryStates, videoBasicData } = storeToRefs(longVideoStore)

function onRefreshGroup(groupId: number) {
  h5LongVideoStore.loadGroupVideos(groupId, true, 5);
}
function getCategoryState(name: string) {
  return longVideoStore.getCategoryState(name)
}

function setSlideRef(el: Element | ComponentPublicInstance | null, i: number) {
  if (el instanceof HTMLElement) {
    slideRefs.value[i] = el
  } else if (el && (el as any).$el instanceof HTMLElement) {
    slideRefs.value[i] = (el as any).$el
  } else {
    slideRefs.value[i] = null
  }
}
function setSentinelRef(el: HTMLElement | null, i: number) {
  sentinelRefs.value[i] = el;
}
function onSwiperReady(swiper: SwiperCore) {
  swiperInstance.value = swiper
}

function saveScroll(name: string) {
  const idx = categoryNames.value.indexOf(name)
  const el = slideRefs.value[idx]
  if (el) {
    sessionStorage.setItem(`scroll-${name}`, el.scrollTop.toString())
  }
}

function restoreScroll(name: string, targetScroll: number | null = null) {
  if (isRestoringScroll.value) return
  isRestoringScroll.value = true

  const idx = categoryNames.value.indexOf(name)
  const el = slideRefs.value[idx]
  const scrollTo = targetScroll !== null ? targetScroll : parseInt(sessionStorage.getItem(`scroll-${name}`) || '0')

  if (!el) {
    isRestoringScroll.value = false
    return
  }

  let attempts = 0
  const maxAttempts = 60
  const tolerance = 5

  const tryScroll = () => {
    if (el) {
      el.scrollTop = scrollTo
      if (Math.abs(el.scrollTop - scrollTo) < tolerance || attempts >= maxAttempts) {
        setTimeout(() => { isRestoringScroll.value = false }, 100)
        return
      }
    }
    attempts++
    requestAnimationFrame(tryScroll)
  }

  requestAnimationFrame(tryScroll)
  setTimeout(() => { isRestoringScroll.value = false }, 300)
}

function onCategoryChange(name: string) {
  const newIndex = categoryNames.value.indexOf(name)
  if (newIndex === -1) {
    console.error(`分类 ${name} 不存在于:`, categoryNames.value)
    return
  }

  saveScroll(currentCategory.value)
  currentCategory.value = name
  currentIndex.value = newIndex
  sessionStorage.setItem('home-last-category', name)

  nextTick(() => {
    swiperInstance.value?.slideTo(newIndex)
    setupScrollListener();
    if (name === '推荐') {
      // 只在首次进入或缓存过期时才reset
      if (
        !h5LongVideoStore.groups.length ||
        Date.now() - h5LongVideoStore.lastFetchTime > h5LongVideoStore.cacheDuration
      ) {
        loadCategory('推荐', true)
      }
      // 否则不reset，保持已加载数据
    } else if (!getCategoryState(name).data.length) {
      loadCategory(name, true)
    }
  });
  drawerVisible.value = false
}

function onSlideChange(swiper: SwiperCore) {
  if (getCategoryState(currentCategory.value).isLoading) {
    swiper.slideTo(currentIndex.value);
    return;
  }

  saveScroll(currentCategory.value);

  currentIndex.value = swiper.activeIndex;
  currentCategory.value = categoryNames.value[currentIndex.value];

  if (!currentCategory.value) {
    currentCategory.value = '推荐'
    currentIndex.value = 0
    swiper.slideTo(0)
    return
  }

  sessionStorage.setItem('home-last-category', currentCategory.value);

  setTimeout(() => restoreScroll(currentCategory.value), 80);
  nextTick(() => {
    setupScrollListener();
    if (currentCategory.value === '推荐') {
      // 只在首次进入或缓存过期时才reset
      if (
        !h5LongVideoStore.groups.length ||
        Date.now() - h5LongVideoStore.lastFetchTime > h5LongVideoStore.cacheDuration
      ) {
        loadCategory('推荐', true)
      }
      // 否则不reset，保持已加载数据
    } else if (getCategoryState(currentCategory.value).data.length === 0) {
      loadCategory(currentCategory.value, true);
    }
  });
}

function goToPlay(item: any) {
  if (!item || !item.id) {
    console.error("goToPlay: 缺少 id!", item);
    return;
  }
  const idx = categoryNames.value.indexOf(currentCategory.value)
  const el = slideRefs.value[idx]
  const scrollTop = el?.scrollTop ?? 0

  saveScroll(currentCategory.value)
  sessionStorage.setItem('return-from', 'home-category')
  sessionStorage.setItem('return-category', currentCategory.value)
  sessionStorage.setItem('return-scroll', scrollTop.toString())

  // 👇 新增：分类数据缓存
  if (currentCategory.value !== '推荐') {
    const state = getCategoryState(currentCategory.value)
    sessionStorage.setItem(`cat-data-${currentCategory.value}`, JSON.stringify(state.data))
    sessionStorage.setItem(`cat-page-${currentCategory.value}`, state.page.toString())
    sessionStorage.setItem(`cat-hasMore-${currentCategory.value}`, state.hasMore ? '1' : '0')
    sessionStorage.setItem(`cat-video-${currentCategory.value}`, JSON.stringify(videoBasicData.value))
  }

  router.push({
    path: `/play/${item.id}`,
  })
}

function goToListPage(cat: string) {
  const idx = categoryNames.value.indexOf(currentCategory.value)
  const el = slideRefs.value[idx]
  const scrollTop = el?.scrollTop ?? 0

  saveScroll(currentCategory.value)
  sessionStorage.setItem('return-from', 'home-category')
  sessionStorage.setItem('return-category', currentCategory.value)
  sessionStorage.setItem('return-scroll', scrollTop.toString())

  // 👇 新增：分类数据缓存
  if (currentCategory.value !== '推荐') {
    const state = getCategoryState(currentCategory.value)
    sessionStorage.setItem(`cat-data-${currentCategory.value}`, JSON.stringify(state.data))
    sessionStorage.setItem(`cat-page-${currentCategory.value}`, state.page.toString())
    sessionStorage.setItem(`cat-hasMore-${currentCategory.value}`, state.hasMore ? '1' : '0')
    sessionStorage.setItem(`cat-video-${currentCategory.value}`, JSON.stringify(videoBasicData.value))
  }

  if (currentCategory.value === '推荐') {
    const group = (h5LongVideoStore.groups || []).find((g: any) => g.name === cat)
    const groupId = group?.id
    router.push({ name: 'ListPage', query: { cat, type: 'recommend', groupId } })
  } else {
    const group = getCategoryState(currentCategory.value).data.find((g: any) => g.name === cat)
    const categoryId = group?.id
    router.push({ name: 'ListPage', query: { cat, categoryId } })
  }
}

async function initPage() {
  const returnFrom = sessionStorage.getItem('return-from')
  const returnCategory = sessionStorage.getItem('return-category')
  const returnScroll = sessionStorage.getItem('return-scroll')
  const lastVisitedCategory = sessionStorage.getItem('home-last-category') || '推荐'

  let targetCategory = lastVisitedCategory
  let targetScroll = 0

  if (returnFrom === 'home-category' && returnCategory) {
    targetCategory = returnCategory
    targetScroll = parseInt(returnScroll || '0')
    sessionStorage.removeItem('return-from')
    sessionStorage.removeItem('return-category')
    sessionStorage.removeItem('return-scroll')
  }

  currentCategory.value = targetCategory
  currentIndex.value = categoryNames.value.indexOf(targetCategory)

  if (currentIndex.value === -1) {
    currentCategory.value = '推荐';
    currentIndex.value = categoryNames.value.indexOf('推荐') || 0;
  }

  sessionStorage.setItem('home-last-category', currentCategory.value)

  await nextTick()
  swiperInstance.value?.slideTo(currentIndex.value, 0)
  setTimeout(() => restoreScroll(currentCategory.value, targetScroll), 80)
  bannerKey.value++
  pageReady.value = true;

  // 👇 新增：分类数据恢复
  if (currentCategory.value !== '推荐') {
    const cacheData = sessionStorage.getItem(`cat-data-${currentCategory.value}`)
    const cachePage = sessionStorage.getItem(`cat-page-${currentCategory.value}`)
    const cacheHasMore = sessionStorage.getItem(`cat-hasMore-${currentCategory.value}`)
    const cacheVideo = sessionStorage.getItem(`cat-video-${currentCategory.value}`)
    if (cacheData && cachePage && cacheHasMore && cacheVideo) {
      const state = getCategoryState(currentCategory.value)
      state.data = JSON.parse(cacheData)
      state.page = parseInt(cachePage)
      state.hasMore = cacheHasMore === '1'
      videoBasicData.value = JSON.parse(cacheVideo)
      // 清理缓存
      sessionStorage.removeItem(`cat-data-${currentCategory.value}`)
      sessionStorage.removeItem(`cat-page-${currentCategory.value}`)
      sessionStorage.removeItem(`cat-hasMore-${currentCategory.value}`)
      sessionStorage.removeItem(`cat-video-${currentCategory.value}`)
    }
  }

  // 👇 加这一段，首次进入推荐页时自动拉数据
  if (currentCategory.value === '推荐' && h5LongVideoStore.groups.length === 0) {
    await loadCategory('推荐', true);
  }
}

onMounted(async () => {
  // 检查是否是刷新（页面首次加载）
  if (performance.navigation.type === 1 || performance.getEntriesByType('navigation')[0]?.type === 'reload') {
    // 清理所有分类缓存
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('cat-data-') || key.startsWith('cat-page-') || key.startsWith('cat-hasMore-') || key.startsWith('cat-video-')) {
        sessionStorage.removeItem(key)
      }
    })
  }

  await categoryStore.loadCategories();

  if (
    Array.isArray(categoryStore.categories) &&
    categoryStore.categories.length > 0 &&
    categoryStore.categories.some(c => c.name && c.name !== '推荐')
  ) {
    categories.value = [{ name: "推荐", id: 0 }, ...categoryStore.categories.filter(c => c.parent_id === 0)];
    categoryNames.value = categories.value.map(c => c.name);
  }

  await initPage();
});

function setupScrollListener() {
  const slideContainer = slideRefs.value[currentIndex.value];
  if (!slideContainer) return;
  slideContainer.removeEventListener('scroll', handleScroll);
  slideContainer.addEventListener('scroll', handleScroll);
}

function handleScroll(event: Event) {
  if (isRestoringScroll.value) return
  const state = getCategoryState(currentCategory.value);
  const el = event.target as HTMLElement;
  if (!el) return;
  const bottomOffset = el.scrollHeight - el.scrollTop - el.clientHeight;
  if (bottomOffset < 200 && !state.isLoading && state.hasMore) {
    loadMore();
  }
}

async function loadCategory(name: string, reset = false) {
  // 推荐分类分页
  if (name === '推荐') {
    const page = reset ? 1 : (h5LongVideoStore.currentPage || 1) + 1;
    await h5LongVideoStore.loadHome({ page, pageSize: 3 }, reset);
    return;
  }

  const state = getCategoryState(name);
  const parent = categories.value.find(c => c.name === name);
  if (!parent || state.isLoading) return;

  if (reset) {
    state.page = 1;
    state.hasMore = true;
    state.data = [];
  }

  state.isLoading = true;
  try {
    const res = await longVideoStore.loadH5CategoryBatch({
      parent_id: parent.id,
      page: state.page
    });

    // 合并数据防止重复
    const newData = res.categories
      .filter(newCat => !state.data.some(existing => existing.id === newCat.id))
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)); // 按 sort 字段升序排列
    state.data = [...state.data, ...newData];

    // 只要本次没数据，直接终止懒加载
    if (newData.length === 0) {
      state.hasMore = false;
    } else {
      state.hasMore = res.current_page < res.total_pages;
    }
    state.page++;

    // 视频数据合并
    const videoMap: Record<number, any[]> = {};
    res.categories.forEach(cat => {
      videoMap[cat.id] = cat.videos || [];
    });
    videoBasicData.value = { ...videoBasicData.value, ...videoMap };
  } catch (error) {
    console.error(`加载分类 ${name} 失败:`, error);
  } finally {
    state.isLoading = false;
  }
}

// 懒加载
async function loadMore() {
  const name = currentCategory.value;
  if (name === '推荐') {
    // 推荐页分组懒加载
    await loadCategory('推荐');
    return;
  }
  const state = getCategoryState(name);
  if (!state.hasMore || state.isLoading) return;
  await loadCategory(name); // 只追加
}

const { groups } = storeToRefs(h5LongVideoStore)

const sortedGroups = computed(() => {
  return groups.value.slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
})

const sentinel = ref<HTMLElement | null>(null)

watch([() => sentinelRefs.value[currentIndex.value], currentIndex], ([el, index]) => {
  if (!el || !(el instanceof HTMLElement)) return;
  if (observerRef.value) {
    observerRef.value.disconnect();
    observerRef.value = null;
  }
  const rootEl = slideRefs.value[index];
  if (!rootEl) return;
  observerRef.value = new IntersectionObserver((entries) => {
    if (
      entries[0].isIntersecting &&
      (
        (categories.value[index].name === '推荐' && recommendHasMore.value && !h5LongVideoStore.loading) ||
        (categories.value[index].name !== '推荐' && getCategoryState(categories.value[index].name).hasMore && !getCategoryState(categories.value[index].name).isLoading)
      )
    ) {
      loadMore();
    }
  }, {
    root: rootEl,
    rootMargin: '120px',
    threshold: 0.01
  });
  observerRef.value.observe(el);
}, { immediate: true });

onBeforeUnmount(() => {
  if (observerRef.value) observerRef.value.disconnect()
})

async function refreshCategory(categoryId: number) {
  await longVideoStore.loadH5CategoryVideos(categoryId, 1, 6);
  // 先赋值
  videoBasicData.value[categoryId] = [...longVideoStore.list];
  // 再整体替换，强制触发响应式
  videoBasicData.value = { ...videoBasicData.value };
}

const recommendHasMore = computed(() => {
  return h5LongVideoStore.currentPage < h5LongVideoStore.totalPages;
});

const isRecommend = computed(() => categories.value[currentIndex.value]?.name === '推荐');
const loading = computed(() => isRecommend.value ? h5LongVideoStore.loading : getCategoryState(currentCategory.value).isLoading);
const hasMore = computed(() => isRecommend.value ? recommendHasMore.value : getCategoryState(currentCategory.value).hasMore);
const noMore = computed(() => !hasMore.value && (isRecommend.value ? h5LongVideoStore.groups.length > 0 : getCategoryState(currentCategory.value).data.length > 0));
</script>
<style scoped>
.home-wrapper {
  background: #fff;
  width: 100vw;
  height: 100vh;
  overflow: hidden; /* Home 页面整体不滚动，由 Swiper 内部的 slide-content 滚动 */
  position: relative;
}

.swiper-container {
  /* 假设 TopNavBar 高度是 13vw (如iPhone 375px下约48px) */
  height: calc(100vh - 13vw);
}

.slide-content {
  height: 100%;
  overflow-y: auto;
  padding-bottom: 24vw; /* 底部TabBar和内容安全区适配，按设计稿自己微调 */
  background-color: #fff;
  -webkit-overflow-scrolling: touch;

  /* ✅ 跨平台隐藏滚动条 */
  scrollbar-width: none;            /* Firefox */
  -ms-overflow-style: none;         /* IE/Edge */
  -webkit-mask-image: linear-gradient(black 100%, black 100%);
  mask-image: linear-gradient(black 100%, black 100%);
}

/* ✅ 隐藏 Webkit 系滚动条 */
.slide-content::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
}

.loading-more, .no-more {
  text-align: center;
  padding: 10px 0;
  font-size: 14px;
  color: #999;
}
.spinner {
  width: 20px;
  height: 20px;
  margin-right: 8px;
  vertical-align: middle;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 新增样式 */
.loading-tip {
  width: 100%;
  background: rgba(255,255,255,0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0;
  font-size: 16px;
}

.custom-spinner {
  width: 9.3vw;
  height: 9.3vw;
  margin-bottom: 2.1vw;
  animation: spin 0.8s linear infinite;
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

.load-more-trigger {
  height: 13.3vw;
  margin-top: 5.3vw;
}

.empty-data-message {
  text-align: center;
  padding: 8vw;
  color: #999;
  font-size: 4.26vw;
}
</style>
