<template>
  <div class="video-rank-page">
    <div class="header-container">
      <!-- 顶部背景 -->
      <div class="top-banner">
        <img src="/static/1234.png" class="bg-img" />
        <img src="/static/shipinbandan.png" class="center-img" />
        <div class="back-btn" @click="goBack">
          <van-icon name="arrow-left" size="25" color="#333" />
        </div>
        <!-- 一级Tab -->
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

      <!-- 二级Tab -->
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

    <!-- 内容横滑 -->
    <van-swipe
      :key="mainTab"
      ref="swiperRef"
      v-model:active="subTab"
      :loop="false"
      :show-indicators="false"
      class="swipe-content"
      @change="onSwipeChange"
      style="overflow: hidden;"
    >
      <van-swipe-item v-for="(sub, idx) in subTabs" :key="sub">
        <div
          class="tab-scroll-content"
          :ref="setScrollRef(idx)"
          @scroll="e => onTabScroll(e, idx)"
        >
          <div
            v-for="(item, index) in tabStates[mainTab][idx].visibleList"
            :key="item.id"
            class="video-item"
            @click="goToDetail(item.id)"
          >
            <!-- Navigate to detail page on click -->
            <div class="thumb">
              <img v-lazy="item.cover" />
              <CardCornerIcon :isVip="item.vip" :coinAmount="item.coin" />
              <div class="footer-bar">
                <div class="views">
                  <img src="/icons/play4.svg" class="play-icon" />
                  {{ formatViews(item.playCount) }}
                </div>
                <div class="duration">{{ formatDuration(item.duration) }}</div>
              </div>
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
                  color="#ff4b4b"
                  :style="{ fontSize: '3.2vw' }"
                >
                  {{ tag }}
                </van-tag>
              </div>
              <div class="meta-bar">
                <span class="date">{{ item.publishTime }}</span>
                <span class="likes">点赞量: {{ formatViews(item.likeCount) }}</span>
              </div>
            </div>
          </div>
          <div
            class="load-more-trigger"
            :ref="el => setSentinel(el, idx)"
            style="height: 1px;"
          ></div>
          <div v-if="tabStates[mainTab][idx].isLoading" class="loading-tip">
            <img src="/icons/loading.svg" class="spinner" />
            <div class="loading-text">客官别走，妾身马上就好~</div>
          </div>
          <div v-if="tabStates[mainTab][idx].noMore && tabStates[mainTab][idx].visibleList.length" class="no-more-text">
            客官，妾身被你弄高潮了，扛不住了~
          </div>
          <div v-if="!tabStates[mainTab][idx].visibleList.length && !tabStates[mainTab][idx].isLoading" class="no-more-text">
            暂无数据
          </div>
        </div>
      </van-swipe-item>
    </van-swipe>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onActivated, onBeforeUnmount, onMounted } from 'vue';
import { fetchLongVideoRank } from '@/api/longVideo.api';
import CardCornerIcon from './CardCornerIcon.vue';
import { useRouter } from 'vue-router'

const router = useRouter()

const mainTabs = ['人气榜', '点赞榜', '收藏榜'];
const subTabs = ['日榜', '周榜', '月榜', '年榜'];

const mainTab = ref<number>(0);
const subTab = ref<number>(0);

const tabStates = ref(
  Array.from({ length: mainTabs.length }, () =>
    Array.from({ length: subTabs.length }, () => ({
      allVideos: [],
      visibleList: [],
      isLoading: false,
      noMore: false,
      hasLoaded: false,
    }))
  )
);

const PAGE_SIZE = 10;


// 新增：滚动位置缓存对象
const scrollPositions = ref<Record<string, number>>({});

// 记录滚动
function debounce<T extends (...args: any[]) => void>(fn: T, delay = 150) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function(this: any, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

const debouncedScroll = debounce((e: Event, idx: number) => {
  const scrollEl = e.target as HTMLElement;
  const tabKey = `${mainTab.value}-${idx}`;
  scrollPositions.value[tabKey] = scrollEl.scrollTop;
}, 150);

function onTabScroll(e: Event, idx: number) {
  debouncedScroll(e, idx);
}

// 跳转前保存滚动位置
function goToDetail(id: number) {
  const tabKey = `${mainTab.value}-${subTab.value}`;
  const scrollEl = tabScrollRefs.value[subTab.value];
  if (scrollEl) {
    scrollPositions.value[tabKey] = scrollEl.scrollTop;
    
  }
  router.push(`/play/${id}`);
}

// 恢复滚动
function restoreScrollPosition() {
  const tabKey = `${mainTab.value}-${subTab.value}`;
  const savedPosition = scrollPositions.value[tabKey] || 0;
  nextTick(() => {
    const el = tabScrollRefs.value[subTab.value];
    if (el && savedPosition > 0) {
      requestAnimationFrame(() => {
        el.scrollTop = savedPosition;
      });
    }
  });
}

function setScrollRef(index: number) {
  return (el: HTMLElement | null) => {
    tabScrollRefs.value[index] = el;
    // 不再做任何滚动恢复
  };
}

// tab切换只加载一次数据
watch([mainTab, subTab], ([mainIdx, subIdx]) => {
  const state = tabStates.value[mainIdx][subIdx];
  if (!state.hasLoaded) {
    loadRankData(mainIdx, subIdx);
  } else {
    restoreScrollPosition();
  }
}, { immediate: true });

// tab状态持久化
watch([mainTab, subTab], ([main, sub]) => {
  sessionStorage.setItem('videoRankTab', JSON.stringify({ main, sub }));
});

function currentTabState(mainIdx = mainTab.value, subIdx = subTab.value) {
  return tabStates.value[mainIdx][subIdx];
}



// 懒加载相关
const sentinels = ref<HTMLElement[]>([]);
const observers = ref<(IntersectionObserver | null)[]>([]);

function setSentinel(el: HTMLElement | null, idx: number) {
  sentinels.value[idx] = el!
  if (el) {
    nextTick(() => initObserver(idx))
  }
}

function initObserver(idx: number) {
  destroyObserver(idx);
  const el = sentinels.value[idx];
  if (!el) return;
  observers.value[idx] = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      loadMore(mainTab.value, idx);
    }
  }, {
    threshold: 0.1,
    rootMargin: "0px 0px 200px 0px" // 距底部200px时触发
  });
  observers.value[idx]?.observe(el);
}

function destroyObserver(idx: number) {
  observers.value[idx]?.disconnect();
  observers.value[idx] = null;
}

onBeforeUnmount(() => {
  observers.value.forEach(o => o?.disconnect());
});




// 一级tab点击时重置二级tab并加载数据
const swiperRef = ref();
function onMainTabClick(i: number) {
  if (mainTab.value !== i) {
    mainTab.value = i;
    subTab.value = 0;
    nextTick(() => {
      swiperRef.value?.swipeTo?.(0);
    });
    // loadRankData(i, 0); // 不需要，watch会自动触发
  }
}

// 二级tab点击
function onSubTabClick(index: number): void {
  if (subTab.value !== index) {
    subTab.value = index;
    swiperRef.value?.swipeTo?.(index); // 关键：同步 swiper 的 active
  }
}

// 横滑切换
function onSwipeChange(index: number) {
  subTab.value = index;
  // loadRankData(mainTab.value, index); // 不需要，watch会自动触发
}

// 加载数据
async function loadRankData(mainIdx = mainTab.value, subIdx = subTab.value) {
  const state = tabStates.value[mainIdx][subIdx];
  if (state.hasLoaded) return;

  state.isLoading = true;
  try {
    const actionMap = ['view', 'like', 'collect'];
    const rangeMap = ['day', 'week', 'month', 'year'];
    const params = {
      action: actionMap[mainIdx],
      range: rangeMap[subIdx],
    };
    const data = await fetchLongVideoRank(params);
    

    state.allVideos = data.map((item: any) => ({
      id: item.video_id,
      title: item.title,
      cover: item.cover,
      tags: item.tags,
      publishTime: item.create_time,
      collectCount: item.collect_count,
      playCount: item.play_count,
      likeCount: item.num,
      vip: Boolean(item.is_vip),
      coin: item.coin,
      duration: item.duration,
    }));
   

    state.visibleList = state.allVideos.slice(0, PAGE_SIZE);
    

    state.noMore = state.visibleList.length >= state.allVideos.length;
    state.hasLoaded = true;
    nextTick(() => {
      if (mainIdx === mainTab.value && subIdx === subTab.value) {
        restoreScrollPosition();
      }
    });
  } catch (error) {
    state.allVideos = [];
    state.visibleList = [];
    state.noMore = true;
    console.error('加载排行榜数据失败:', error);
  } finally {
    state.isLoading = false;
  }
}

// 懒加载
function loadMore(mainIdx = mainTab.value, subIdx = subTab.value) {
  const state = tabStates.value[mainIdx][subIdx];
  if (state.noMore || state.isLoading) return;
  const next = state.visibleList.length + PAGE_SIZE;
  state.visibleList = state.allVideos.slice(0, next);
  state.noMore = state.visibleList.length >= state.allVideos.length;
}

// 工具函数和样式函数不变
function formatViews(views: number | undefined): string {
  if (!views || isNaN(views)) {
    return '0';
  }
  if (views >= 10000) {
    return (views / 10000).toFixed(1) + '万';
  }
  return views.toString();
}
function formatDuration(sec: number | string | undefined): string {
  const s = Number(sec);
  if (isNaN(s) || s <= 0) return '00:00';
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
}
function getRankType(index: number): string {
  if (index === 0) return 'danger';
  if (index === 1) return 'warning';
  if (index === 2) return 'success';
  return 'default';
}
function getRankStyle(index: number): Record<string, string> {
  if (index === 0) return { backgroundColor: '#ff4b4b', color: '#fff' };
  if (index === 1) return { backgroundColor: '#ffa500', color: '#fff' };
  if (index === 2) return { backgroundColor: '#32cd32', color: '#fff' };
  return { backgroundColor: '#d3d3d3', color: '#000' };
}
function goBack(): void {
  window.history.back();
}

const tabScrollRefs = ref<(HTMLElement | null)[]>([])
const tabScrollTops = ref<number[]>(Array(subTabs.length).fill(0))

let scrollTimer: ReturnType<typeof setTimeout> | null = null
const scrollTimers = ref<number[]>([])

// 数据加载后自动恢复滚动
watch(
  () => tabStates.value[mainTab.value][subTab.value].visibleList,
  (newList) => {
    if (newList.length > 0) {
      nextTick(() => {
        const state = tabStates.value[mainTab.value][subTab.value];
        const el = tabScrollRefs.value[subTab.value];
        if (el && state.scrollTop > 0) {
          setTimeout(() => {
            const idx = subTab.value; // 修复：声明 idx
            
            el.scrollTop = state.scrollTop;
          }, 50)
        }
      })
    }
  }
)

onActivated(() => {
  // 恢复 tab 状态
  const saved = sessionStorage.getItem('videoRankTab')
  if (saved) {
    const { main, sub } = JSON.parse(saved)
    mainTab.value = main
    subTab.value = sub
  }

  // 强制刷新当前列表并延时恢复滚动
  nextTick(() => {
    const state = currentTabState()
    state.visibleList = [...state.visibleList]
    setTimeout(restoreScrollPosition, 300)
  })
})


// 监听 tab 变化，存储到 sessionStorage
watch([mainTab, subTab], ([main, sub]) => {
  sessionStorage.setItem('videoRankTab', JSON.stringify({ main, sub }))
})

function setTabScrollRef(idx: number) {
  return (el: HTMLElement | null) => {
    if (el) {
      tabScrollRefs.value[idx] = el;
      // 激活时立即恢复位置
      if (tabStates.value[mainTab.value][idx].scrollTop > 0) {
        nextTick(() => {
          el.scrollTop = tabStates.value[mainTab.value][idx].scrollTop;
        });
      }
    }
  }
}
</script>

<style scoped>
.header-container {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #fff;
}

.video-rank-page {
  background: #fff;
  min-height: 100vh;
}
.loading-tip,
.no-more-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
  padding: 20px 0;
}
.spinner {
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.loading-text {
  margin-top: 6px;
  color: #ff5f5f;
  font-weight: 500;
}
.no-more-text {
  text-align: center;
  color: #999;
  font-size: 14px;
  margin: 20px 0;
}
.load-more-trigger {
  height: 50px;
  margin-top: 10px;
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
  bottom: 40px;
  left: 50%;
  width: 26vw;
  transform: translateX(-50%);
}
.back-btn {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(255, 255, 255, 0.6);
  padding: 6px;
  border-radius: 50%;
}
.main-tab-row {
  position: absolute;
  bottom: 6px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 30px;
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
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 2px;
  background: #333;
  border-radius: 1px;
}
.sub-tab-container {
  display: flex;
  justify-content: space-around;
  padding: 8px 0;
  background: #454140;
}
.sub-tab {
  font-size: 3.5vw;
  color: #fff;
  padding: 0.5vw 3vw;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
}
.sub-tab.active {
  background: #fff;
  color: #3a2a26;
}
.swipe-content {
  height: calc(100vh - 120px);
  min-height: 500px;
  overflow: hidden !important; /* 强制禁止自身滚动 */
  position: relative;
  touch-action: pan-y;
}
.video-item {
  display: flex;
  padding: 4px;
  align-items: flex-start;
}
.thumb {
  position: relative;
  width: 46vw;
  height: calc(46vw * 0.6);
  flex-shrink: 0;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}
.footer-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 2px 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0,0,0,0.0);
  border-radius: 0 0 6px 6px;
}
.views {
  display: flex;
  align-items: center;
  color: #fff;
  font-size: 11px;
}
.play-icon {
  width: 14px !important;
  height: 14px !important;
  max-width: none !important;
  flex-shrink: 0;
  object-fit: contain;
}
.duration {
  color: #fff;
  font-size: 11px;
}
.rank-tag {
  position: absolute;
  top: 4px;
  left: 4px;
  font-size: 11px;
  border-radius: 4px;
  padding: 0 6px;
  line-height: 18px;
  font-weight: bold;
}
.info {
  flex: 1;
  margin-left: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 27vw;
}
.title {
  font-size: 4vw;
  font-weight: bold;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tags {
  display: flex;
  font-size: 3vw !important;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
}
.meta-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #888;
  padding-top: 4px;
  margin-top: auto;
}
.tab-scroll-content {
  height: 100%;
  min-height: 100%;
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch;
  contain: unset; /* 移除 contain 相关属性 */
  will-change: transform;
  box-sizing: border-box;
  background: #fff;
}
</style>
