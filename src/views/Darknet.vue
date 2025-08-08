<template>
  <div class="darknet-wrapper">
    <img class="darknet-bg" src="@/assets/darknet-bg3.webp" alt="背景" />

    <div v-if="!isVip" class="vip-overlay">
      <div class="vip-warning">
        <div class="vip-title">DANGER</div>
        <div class="vip-text">
          暗网有全球禁止流出的极其稀缺的资源<br />
          强奸迷奸、呦呦萝莉、萝莉岛、韩国N号房、人兽杂交、缅北禁地、真实破处、血腥战场、极重口味等等百万罕见稀缺的资源，仅对少量用户开放<br />
          内容过于真实，可能会引起极度不适<br />
          请谨慎进入！禁止分享传播！<br /><br />
          马上开通【暗网卡/至尊卡/帝王卡/王者卡】<br />
          即可获得无限观看暗网视频资格
        </div>
       <button class="vip-btn" @click="goToVipCenter">立即开通</button>
        <p class="vip-note">注意：内容会引起生理/心理双重不适 请谨慎观看</p>
      </div>
      <TabBar :darkMode="true" />
    </div>

    <TopNavBar
      v-if="isVip"
      :activeCategory="currentCategory"
      :categories="categories"
      :darkMode="true"
      @categoryChange="onCategoryChange"
      @drawerOpen="drawerVisible = true"
    />
    <SideDrawer
      v-if="isVip"
      :visible="drawerVisible"
      :list="categories"
      :active="currentCategory"
      @close="drawerVisible = false"
      @select="onCategoryChange"
    />

    <swiper
      v-if="isVip"
      ref="swiperRef"
      :initial-slide="currentIndex"
      @swiper="onSwiperReady"
      :onSlideChange="onSlideChange"
      class="swiper-container"
      :slides-per-view="1"
    >
      <swiper-slide v-for="(name, i) in categoryNames" :key="name" class="slide-wrapper">
        <div class="slide-content" :ref="el => setSlideRef(el, i)">
          <Banner :key="bannerKey + '-' + name" />
          <NoticeBar />
          <template v-if="name === '暗网推荐'">
            <DarknetRecommend
              :groups="recommendGroups || []"
              @clickItem="goToPlay"
              @goToMore="goToListPage"
              dark
            />
          </template>
          <template v-else>
            <NormalCategory
              :categoryList="categoryData[name] || []"
              :categoryName="name"
              :videoBasicData="videoBasicData.value"
              :dark="true"
              @clickItem="goToPlay"
              @goToMore="goToListPage"
              @refresh="onRefreshCategory"
            />
            <!-- 分类懒加载提示和触发器，只在分类页出现 -->
            <div
              v-if="currentIndex === i && categoryHasMore && !categoryLoading"
              :ref="el => setSentinelRef(el, i)"
              class="load-more-trigger"
            ></div>
            <div v-if="currentIndex === i && categoryLoading" class="loading-tip">
              <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
              <div class="loading-text">客官别走，妾身马上就好~</div>
            </div>
            <div v-if="currentIndex === i && categoryNoMore" class="no-more-text">
              客官，妾身被你看光了，扛不住了~
            </div>
            <div v-if="currentIndex === i && !categoryLoading && !categoryHasMore && !categoryNoMore" class="empty-data-message">
              <p>该分类暂无有声数据或数据加载失败...</p>
            </div>
          </template>
        </div>
      </swiper-slide>
    </swiper>

    <TabBar :darkMode="true" class="tabbar-fixed-bottom"/>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick, type Ref, type ComponentPublicInstance, onActivated, computed, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/css'
import { fetchDarknetGroupVideos, fetchDarknetCategoryVideos } from '@/api/darknet.api'
import { darknetCategories } from '../constants/darknetCategories'
import DarknetRecommend from '../components/DarknetRecommend.vue'
import TopNavBar from '../components/TopNavBar.vue'
import Banner from '../components/Banner.vue'
import NoticeBar from '../components/NoticeBar.vue'
import NormalCategory from '../components/NormalCategory.vue'
import TabBar from '../components/TabBar.vue'
import SideDrawer from '../components/SideDrawer.vue'
import { storeToRefs } from 'pinia'
import { useDarknetStore } from '@/store/darknet.store'
import { useUserStore } from '@/store/user'
const darknetStore = useDarknetStore()
const userStore = useUserStore()
const isVip = computed(() => userStore.userInfo.vip_status === 1)
const userInfoLoaded = computed(() => userStore.userInfoLoaded) // pinia里有

onMounted(async () => {
  if (!userInfoLoaded.value) {
    await userStore.fetchUserInfo()
  }
})

const { vip_status } = storeToRefs(darknetStore) // 新增

// 判断是否VIP
const isVip2 = computed(() => userStore.isVIP)

// 类型声明
interface Category {
  name: string
  id?: number
  [key: string]: any
}
interface DarknetDataMap {
  [key: string]: any[]
}
const videoBasicData = ref<Record<string, any[]>>({})
// 基础变量
const router = useRouter()
const swiperRef = ref<InstanceType<typeof Swiper> | null>(null)
const swiperInstance = ref<any>(null)
const drawerVisible = ref(false)

// 会员开通
function openVip() {
  localStorage.setItem('vip', 'true')
  isVip.value = true
}

// 分类数据
const categories = ref<Category[]>([{ name: '暗网推荐', id: 0 }]);

onMounted(async () => {
  await darknetStore.loadParentCategories(); // 每次都拉接口
  if (darknetStore.categories && darknetStore.categories.length > 0) {
    categories.value = [{ name: '暗网推荐', id: 0 }, ...darknetStore.categories];
  }
  // 只加载当前分类内容（推荐页不加载）
});

const categoryNames = computed(() => categories.value.map(c => c.name))

const currentCategory = ref<string>(sessionStorage.getItem('dark-category') || '暗网推荐')
const currentIndex = ref<number>(categoryNames.value.indexOf(currentCategory.value))
const bannerKey = ref(0)
const categoryData = ref<DarknetDataMap>({})
const slideRefs = ref<HTMLElement[]>([])
function setSlideRef(el: Element | ComponentPublicInstance | null, i: number) {
  if (el instanceof HTMLElement) {
    slideRefs.value[i] = el
  }
}
function onSwiperReady(swiper: any) {
  swiperInstance.value = swiper
}

// 分类内容只加载一次
const loadedCategories = ref<Record<string, boolean>>({});
let manualLoading = false; // 新增锁

async function loadCategory(name: string) {
  manualLoading = true; // 开始手动加载
  console.log('loadCategory', name, new Error().stack);
  if (name === '暗网推荐' || loadedCategories.value[name]) return;
  const category = categories.value.find(c => c.name === name);
  if (!category || !category.id) return;
  loadedCategories.value[name] = true;
  try {
    const res = await darknetStore.loadH5CategoryBatch({ parent_id: category.id, page: 1 });
    const newCategories = res.categories || [];
    categoryData.value[name] = newCategories;

    // 填充 videoBasicData
    newCategories.forEach(subCat => {
      videoBasicData.value[subCat.id] = subCat.videos || [];
    });

    categoryData.value[name + '_state'] = {
      page: 2, // 直接设为2，无论高度
      hasMore: res.current_page < res.total_pages,
      isLoading: false
    };
    await nextTick();
    // 如果内容高度不够一屏，主动拉下一页
    const idx = categoryNames.value.indexOf(name);
    const slideEl = slideRefs.value[idx];
    if (
      slideEl &&
      slideEl.scrollHeight <= slideEl.clientHeight &&
      categoryData.value[name + '_state'].hasMore
    ) {
      // 允许懒加载
      loadMoreCategory();
    }
  } catch (error) {
    categoryData.value[name] = [];
    categoryData.value[name + '_state'] = { page: 2, hasMore: false, isLoading: false }; // 这里也设为2
  } finally {
    manualLoading = false; // 加载结束
  }
}

// 恢复、保存滚动
function restoreScroll(name: string) {
  nextTick(() => {
    const idx = categoryNames.value.indexOf(name)
    const el = slideRefs.value[idx]
    const saved = sessionStorage.getItem(`dark-scroll-${name}`)
    if (el && saved != null) {
      el.scrollTop = parseInt(saved)
    }
  })
}
function saveScroll(name: string) {
  const idx = categoryNames.value.indexOf(name)
  const el = slideRefs.value[idx]
  if (el) {
    sessionStorage.setItem(`dark-scroll-${name}`, el.scrollTop.toString())
  }
}

// 保存滚动位置（播放页/更多页跳转前调用）
function saveScrollPosition() {
  sessionStorage.setItem('darknet-scroll-position', JSON.stringify({
    category: currentCategory.value,
    position: slideRefs.value[currentIndex.value]?.scrollTop || 0
  }));
}

// 分类切换
const isSwitching = ref(false);
let callId = 0;
function onCategoryChange(name: string) {
  categoryState(name).isLoading = true; // 显示转圈圈
  callId += 1;
  const id = callId;
  if (name === currentCategory.value || isSwitching.value) return;
  isSwitching.value = true;
  categoryState(name).isLoading = true; // 开始转圈圈

  const newIndex = categoryNames.value.indexOf(name);
  if (newIndex === -1) {
    isSwitching.value = false;
    categoryState(name).isLoading = false;
    return;
  }
  currentCategory.value = name;
  currentIndex.value = newIndex;
  nextTick(() => {
    swiperInstance.value?.slideTo(newIndex);
    const newPosition = darknetStore.getScrollPosition(name);
    const scrollEl = slideRefs.value[newIndex];
    if (scrollEl) scrollEl.scrollTop = newPosition;
    isSwitching.value = false;
    
  });
  drawerVisible.value = false;
  if (name !== '暗网推荐' && !loadedCategories.value[name]) {
    loadCategory(name).finally(() => {
      
    });
  } else {
    categoryState(name).isLoading = false;
  }
}

// swiper切换
function onSlideChange(swiper: any) {
  if (isSwitching.value) return;
  if (swiper.activeIndex === currentIndex.value) return;

  // 保存当前滚动位置
  saveScrollPosition(currentCategory.value);

  currentIndex.value = swiper.activeIndex;
  currentCategory.value = categoryNames.value[currentIndex.value];

  nextTick(() => {
    // 恢复新分类的滚动位置
    const newPosition = darknetStore.getScrollPosition(currentCategory.value);
    const scrollEl = slideRefs.value[currentIndex.value];
    if (scrollEl) scrollEl.scrollTop = newPosition;
  });

  // 不再调用 loadCategory
  // 加载逻辑只在 onCategoryChange 中触发
}

// 恢复滚动位置（返回时调用）
async function restoreScrollPosition() {
  const saved = sessionStorage.getItem('darknet-scroll-position');
  if (!saved) return;
  const { category, position } = JSON.parse(saved);
  const index = categoryNames.value.indexOf(category);
  if (index !== -1) {
    currentCategory.value = category;
    currentIndex.value = index;
    await nextTick();
    const el = slideRefs.value[index];
    if (el) {
      el.scrollTop = position;
    }
  }
  sessionStorage.removeItem('darknet-scroll-position');
}

// 跳转到播放页
function goToPlay(payload: any) {
  saveCurrentScroll(); // 添加保存滚动

  // 保存当前滚动位置
  const scrollPosition = slideRefs.value[currentIndex.value]?.scrollTop || 0;
  darknetStore.setScrollPosition(currentCategory.value, scrollPosition);

  // 缓存完整状态
  darknetStore.cacheRecommendState();

  // ...原有跳转逻辑
  saveScroll(currentCategory.value)
  saveScrollPosition();
  sessionStorage.setItem('return-from', 'darknet')
  sessionStorage.setItem('return-scroll', slideRefs.value[currentIndex.value]?.scrollTop?.toString() || '0')
  sessionStorage.setItem('return-category', currentCategory.value)
  const src = payload.src || payload.preview || ''
  router.push({
    path: `/play/${payload.id}`,
    query: {
      src,
      title: payload.title,
      cover: payload.cover,
      tag: payload.tag || (payload.tags?.length ? payload.tags[0] : ''),
      type: payload.type || 'darknet'
    }
  })
}

function goToListPage(cat: any, groupId?: number) {
  // 只补充这段，不删你原来的
  let category = null;
  if (typeof cat === 'object' && cat !== null && cat.name && cat.id) {
    category = cat;
  } else if (typeof cat === 'string') {
    category = categories.value.find(c => c.name === cat);
  }

  // 后面你的原有逻辑全部保留
  saveCurrentScroll(); // 添加保存滚动

  // 保存当前滚动位置
  const scrollPosition = slideRefs.value[currentIndex.value]?.scrollTop || 0;
  darknetStore.setScrollPosition(currentCategory.value, scrollPosition);

  // 缓存完整状态
  darknetStore.cacheRecommendState();

  // ...原有跳转逻辑
  saveScroll(currentCategory.value)
  saveScrollPosition();
  sessionStorage.setItem('dark-return-from', currentCategory.value)
  sessionStorage.setItem('dark-return-scroll', slideRefs.value[currentIndex.value]?.scrollTop?.toString() || '0')

  // 只在 category 有效时补充 categoryId，否则用你原来的 cat
  router.push({
    name: 'ListPage',
    query: {
      cat: category ? category.name : cat,
      categoryId: category ? category.id : undefined,
      groupId,
      type: 'darknet'
    }
  })
}


const { recommendGroups } = storeToRefs(darknetStore) // 必须用 storeToRefs

onMounted(async () => {
  
  // 刷新页面 - 重置所有状态
  const isReload = performance.navigation.type === 1 ||
    performance.getEntriesByType('navigation')[0]?.type === 'reload';

  if (isReload) {
    darknetStore.resetHomeState();
    await darknetStore.loadHome({ page: 1, pageSize: 3 });

    currentCategory.value = '暗网推荐';
    currentIndex.value = 0;
    sessionStorage.setItem('dark-category', '暗网推荐');
    await nextTick();
    const firstSlide = slideRefs.value[0];
    if (firstSlide) firstSlide.scrollTop = 0;
    swiperInstance.value?.slideTo(0);
    bannerKey.value++;
    return;
  }

  // 返回页面 - 优先使用缓存数据
  if (darknetStore.cachedState.groups.length > 0) {
    darknetStore.restoreRecommendState();

    // 恢复分类和swiper页码
    const savedCategory = sessionStorage.getItem('dark-category') || '暗网推荐';
    currentCategory.value = savedCategory;
    currentIndex.value = categoryNames.value.indexOf(savedCategory);

    await nextTick();
    swiperInstance.value?.slideTo(currentIndex.value);

    await nextTick();
    const scrollKey = `dark-scroll-${currentCategory.value}`;
    const scrollPosition = Number(sessionStorage.getItem(scrollKey)) || 0;
    const scrollEl = slideRefs.value[currentIndex.value];
    if (scrollEl) scrollEl.scrollTop = scrollPosition;

    sessionStorage.removeItem('dark-scroll');
  } else {
    // 没有缓存数据时加载新数据
    await darknetStore.loadHome({ page: 1, pageSize: 3 });
  }

  
});

// 1. 添加 onActivated 处理 keep-alive 场景下的滚动恢复
onActivated(async () => {
  const scrollKey = `dark-scroll-${currentCategory.value}`;
  const scrollPosition = Number(sessionStorage.getItem(scrollKey)) || 0;
  const index = categoryNames.value.indexOf(currentCategory.value);

  await nextTick();
  const scrollEl = slideRefs.value[index];
  if (scrollEl) {
    scrollEl.scrollTop = scrollPosition;
    console.log('Restored scroll position:', scrollPosition);
  }
});

// 2. 跳转前保存当前滚动位置
function saveCurrentScroll() {
  const scrollEl = slideRefs.value[currentIndex.value];
  if (scrollEl) {
    const scrollPosition = scrollEl.scrollTop;
    sessionStorage.setItem(`dark-scroll-${currentCategory.value}`, scrollPosition.toString());
    console.log('Saved scroll position:', scrollPosition);
  }
}

// 换一批：只刷新当前子分类，随机换6个（直接走API，不用store）
async function onRefreshCategory(categoryId: number) {
  const name = currentCategory.value;
  const state = categoryState(name);
  state.isLoading = true;

  const newData = await fetchDarknetCategoryVideos(categoryId, {
    page: 1,
    pageSize: 6,
    random: 1
  });

  const list = newData?.list || [];
  // 1. 更新 videoBasicData
  videoBasicData.value = {
    ...videoBasicData.value,
    [categoryId]: list
  };
  // 2. 更新 categoryData[name]，让 NormalCategory 的 categoryList 响应式刷新
  if (categoryData.value[name]) {
    // 找到对应子分类，替换 videos 字段
    categoryData.value[name] = categoryData.value[name].map(cat =>
      cat.id === categoryId ? { ...cat, videos: list } : cat
    );
  }
  state.isLoading = false;
}

// 懒加载相关变量（只用于分类页）
const sentinelRefs = ref<(HTMLElement | null)[]>([]);
const observerRef = ref<IntersectionObserver | null>(null);

function setSentinelRef(el: HTMLElement | null, i: number) {
  sentinelRefs.value[i] = el;
}

// 分类懒加载状态（完全独立）
const categoryLoading = computed(() => categoryState(currentCategory.value).isLoading);
const categoryHasMore = computed(() => categoryState(currentCategory.value).hasMore);
const categoryNoMore = computed(() => !categoryHasMore.value && (categoryData.value[currentCategory.value]?.length > 0));

// 分类状态获取（建议用 store 或本地 map）
function categoryState(name: string) {
  // 这里建议用 pinia store 或本地 map存储每个分类的分页、hasMore、isLoading
  // 示例：
  if (!categoryData.value[name + '_state']) {
    categoryData.value[name + '_state'] = { page: 1, hasMore: true, isLoading: false };
  }
  return categoryData.value[name + '_state'];
}

// 懒加载方法（只拉分类数据）
let loadMoreLock = false; // 懒加载总锁

async function loadMoreCategory() {
  const name = currentCategory.value;
  const state = categoryState(name);

  if (!state.hasMore || state.isLoading || name === '暗网推荐') return;

  state.isLoading = true;
  try {
    const page = state.page;
    const category = categories.value.find(c => c.name === name);
    const res = await darknetStore.loadH5CategoryBatch({ parent_id: category.id, page });
    const newList = res.categories || [];
    if (page === 1) {
      categoryData.value[name] = newList;
    } else {
      categoryData.value[name] = [...(categoryData.value[name] || []), ...newList];
    }
    state.page++;
    state.hasMore = res.current_page < res.total_pages;
  } catch (e) {
    state.hasMore = false;
  } finally {
    state.isLoading = false;
  }
}

// IntersectionObserver监听
watch(
  [
    () => sentinelRefs.value[currentIndex.value],
    currentIndex
  ],
  ([el, index]) => {
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
        categoryHasMore.value &&
        !categoryLoading.value &&
        !manualLoading // 加这一句
      ) {
        loadMoreCategory();
      }
    }, {
      root: rootEl,
      rootMargin: '120px',
      threshold: 0.01
    });
    observerRef.value.observe(el);
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (observerRef.value) observerRef.value.disconnect();
});
function goToVipCenter() {
  router.push({ name: 'Vip' }) // 或 router.push('/vip')
}

</script>

<style scoped>
.darknet-wrapper {
  position: relative;
  height: 100vh;
  overflow: visible;
  font-size: 4vw;
  background: #101010;
}

.swiper-container {
  height: calc(100vh - 13vw);
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.slide-wrapper {
  height: 100%;
}

.darknet-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  object-fit: cover;
  z-index: 0;
  pointer-events: none;
  filter: blur(0.4vw) brightness(0.8);
}

.slide-content {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  position: relative;
  z-index: 1;
  background-color: transparent;
  backdrop-filter: blur(0.8vw);
  width: 100vw; /* 关键！让内容区宽度足够，两列卡片才能并排 */
  padding-bottom: 16vw; /* 或更大，确保底部提示不会被遮挡 */

  /* 隐藏滚动条 */
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-mask-image: linear-gradient(black 100%, black 100%);
  mask-image: linear-gradient(black 100%, black 100%);
}

.slide-content::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
}

.vip-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(2.4vw);

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;

  padding: max(env(safe-area-inset-top), 6vw) 4vw max(env(safe-area-inset-bottom), 2vw);
  box-sizing: border-box;

  height: 100dvh;
  height: 100svh;
  height: 100vh;
  max-height: 100vh;
  text-align: center;
  font-size: 4vw;
  overflow-y: auto;
}

.vip-warning {
  max-width: 90vw;
  width: 100%;
  padding: 0 2vw;
  padding-bottom: 14vw;
  margin-top: 20vw;
  box-sizing: border-box;
  flex-shrink: 0;

  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.vip-title {
  display: inline-block;
  background: #f00;
  color: #fff;
  font-weight: bold;
  font-size: 5.5vw;
  padding: 3vw 6vw;
  margin: 0 auto 4vw;
  border-radius: 2vw;
  box-shadow: 0 0.8vw 2.4vw rgba(0, 0, 0, 0.3);
  max-width: 90%;
  white-space: nowrap;
}

.vip-text {
  color: #ff4c8b;
  font-size: 5vw;
  line-height: 1.4;
  word-break: break-word;
}

.vip-btn {
  background: #f12c2c;
  color: #fff;
  font-size: 3.5vw;
  font-weight: bold;
  padding: 2.5vw 0;
  margin: 3vw auto 1.5vw;
  border: none;
  border-radius: 2vw;
  cursor: pointer;
  display: block;
  width: 100%;
  max-width: 26vw;
  box-sizing: border-box;
}

.vip-btn:hover {
  background: #d01010;
}

.vip-note {
  font-size: 3vw;
  color: #ccc;
  margin-bottom: env(safe-area-inset-bottom, 1vw);
}

.tabbar-fixed-bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  z-index: 10001;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  box-shadow: 0 -0.2vw 1.6vw rgba(0,0,0,0.04);
}

.loading-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5.3vw 0;
  font-size: 3.7vw;
  background: none;
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

/* 懒加载触发器也可以加背景色或边框统一风格 */
.load-more-trigger {
  height: 13.3vw;
  margin-top: 5.3vw;
  background: transparent;
  border: none;
}

.no-more-text {
  color: #fff;
  font-size: 4vw;
  text-align: center;
  margin: 2vw 0;
  font-weight: bold;
}
</style>