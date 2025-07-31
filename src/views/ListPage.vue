<template>
  <div class="list-page">
    <!-- 吸顶顶部栏 -->
    <van-sticky>
      <div class="page-header">
        <img src="/static/back-arrow.png" class="back-icon" @click="goBack" />
        <span class="cat-title">{{ currentCategory }}</span>
      </div>
      <!-- 横滑Tab -->
      <div class="tob-bar">
        <div
          v-for="(tab, idx) in tabs"
          :key="tab"
          class="tab-item"
          :class="{ active: activeTab === idx }"
          @click="onTabClick(idx)"
        >
          {{ tab }}
        </div>
      </div>
    </van-sticky>

    <!-- 内容区域 -->
    <van-swipe
      ref="swipeRef"
      class="swipe-content"
      :loop="false"
      :show-indicators="false"
      v-model:active="activeTab"
      @change="onSwipeChange"
      touchable
    >
      <van-swipe-item v-for="(tab, tabIndex) in tabs" :key="tab">
        <div class="swipe-item-container">
          <div class="video-list">
            <div
              class="video-card"
              v-for="item in tabStates[tabIndex].list"
              :key="item.id"
              @click="goToPlay(item)"
            >
              <div class="thumb-wrap">
                <img :src="item.cover" class="cover" />
                <!-- 右上角VIP/金币角标 -->
                <CardCornerIcon
                  :isVip="item.vip"
                  :coinAmount="item.coin"
                />
                <div class="video-info-bar">
                  <span class="views">
                    <svg width="3.7vw" height="3.7vw" style="vertical-align:-0.5vw;"><use xlink:href="#icon-play" /></svg>
                    {{ formatPlayCount(item.play) }}
                  </span>
                  <span class="duration">{{ formatDuration(item.duration) }}</span>
                </div>
              </div>
              <div class="desc-box">
                <div class="video-title">{{ item.title }}</div>
                <div class="card-bottom">
                  <!-- 只显示第一个标签 -->
                  <span
                    class="tag"
                    v-if="item.tags && item.tags.length"
                  >{{ item.tags[0] }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 加载状态提示 - 使用当前tab的状态 -->
          <!-- 懒加载触发点 -->
          <div
            v-if="tabStates[tabIndex].hasMore && !tabStates[tabIndex].loading"
            ref="setSentinel(tabIndex)"
            class="load-more-trigger"
          ></div>
          <div v-if="tabStates[tabIndex].loading" class="loading-tip">
            <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
            <div class="loading-text">客官别走，妾身马上就好~</div>
          </div>
          <div v-if="!tabStates[tabIndex].hasMore && tabStates[tabIndex].list.length > 0" class="no-more-text">
            客官，妾身被你看光了，扛不住了~
          </div>
          <div v-if="tabStates[tabIndex].inited && tabStates[tabIndex].list.length === 0 && !tabStates[tabIndex].loading" class="empty-data-message">
            <p>该分类暂无视频数据或数据加载失败...</p>
          </div>
        </div>
      </van-swipe-item>
    </van-swipe>

    <!-- SVG icons -->
    <svg style="display:none">
      <symbol id="icon-play" viewBox="0 0 1024 1024"><path fill="#fff" d="M512 0C229.23 0 0 229.23 0 512s229.23 512 512 512 512-229.23 512-512S794.77 0 512 0zm208.94 524.09L418.15 692.65c-16.4 11.3-38.15-0.13-38.15-20.56V351.91c0-20.43 21.75-31.86 38.15-20.56l302.79 168.56c16.4 11.3 16.4 29.83 0 40.18z"/></symbol>
      <symbol id="icon-comment" viewBox="0 0 1024 1024"><path fill="#bbb" d="M512 80c-238.8 0-432 150.3-432 336 0 70.5 32.5 135.7 87.5 188-11.6 53.8-37.2 117.4-60.8 153.8-4.3 6.5 1.3 15.2 9.1 13.3C181.2 753.7 252.7 737.7 286.9 730.2c65.8 31.1 145.2 49.8 233.1 49.8 238.8 0 432-150.3 432-336S750.8 80 512 80z"/></symbol>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchLongVideoByCategory } from '@/api/longVideo.api'
import { fetchRecommendGroupVideos } from '@/api/h5LongVideo.api'
import { useLongVideoStore } from '@/store/longVideoStore'
import { useH5LongVideoStore } from '@/store/h5LongVideo.store'
import CardCornerIcon from '@/components/CardCornerIcon.vue'
import { useLazyLoad } from '@/composables/useLazyLoad'

const route = useRoute()
const router = useRouter()
const swipeRef = ref()
const currentCategory = computed(() => route.query.cat || '栏目名')
const tabs = ['最多收藏', '最多观看', '最新上架']
const activeTab = ref<number>(0)

// 删除原来的videoList、page、hasMore、loading
// 为每个tab创建独立的状态
const tabStates = ref([
  { loading: false, hasMore: true, page: 1, list: [], inited: false, scrollTop: 0 },
  { loading: false, hasMore: true, page: 1, list: [], inited: false, scrollTop: 0 },
  { loading: false, hasMore: true, page: 1, list: [], inited: false, scrollTop: 0 }
])

const pageSize = 20
const categoryId = Number(route.query.categoryId)
const groupId = route.query.groupId

const longVideoStore = useLongVideoStore()
const h5LongVideoStore = useH5LongVideoStore()

const debounce = (func: Function, delay: number) => {
  let timer: any = null
  return (...args: any[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      func.apply(this, args)
    }, delay)
  }
}

// 修改检查滚动函数，使用当前tab的状态
const checkScrollBottom = () => {
  if (route.query.type === 'recommend') return false
  const currentTab = tabStates.value[activeTab.value]
  if (currentTab.loading || !currentTab.hasMore) return false
  const el = document.querySelector('.swipe-content')
  if (!el) return false
  const threshold = 200
  return el.scrollTop + el.clientHeight >= el.scrollHeight - threshold
}

const handleScroll = debounce(() => {
  if (checkScrollBottom()) {
    loadMore(activeTab.value)
  }
}, 200)

function addScrollListener() {
  const el = document.querySelector('.swipe-content')
  if (el) {
    el.addEventListener('scroll', handleScroll)
  }
}

function removeScrollListener() {
  const el = document.querySelector('.swipe-content')
  if (el) {
    el.removeEventListener('scroll', handleScroll)
  }
}

onMounted(async () => {
  // 滚动、tab、分页恢复
  const from = sessionStorage.getItem('return-from')
  const scroll = sessionStorage.getItem('return-scroll')
  const tab = sessionStorage.getItem('return-tab')
  const page = sessionStorage.getItem('return-page')

  if (from === 'list') {
    if (tab) activeTab.value = parseInt(tab)
    if (page) tabStates.value[activeTab.value].page = parseInt(page)
    // 恢复内部容器的滚动位置
    nextTick(() => {
      const el = document.querySelector('.swipe-content') as HTMLElement
      if (el && scroll) {
        el.scrollTop = parseInt(scroll)
      }
    })
    sessionStorage.removeItem('return-from')
    sessionStorage.removeItem('return-scroll')
    sessionStorage.removeItem('return-tab')
    sessionStorage.removeItem('return-page')
  }

  const cacheKey = groupId ? Number(groupId) : categoryId
  tabs.forEach((tab, idx) => {
    const tabKey = getTabKey(idx)
    if (
      longVideoStore.cache[cacheKey] &&
      longVideoStore.cache[cacheKey][tabKey] &&
      longVideoStore.cache[cacheKey][tabKey].list.length > 0
    ) {
      const cacheData = longVideoStore.cache[cacheKey][tabKey]
      tabStates.value[idx].list = [...cacheData.list]
      tabStates.value[idx].page = cacheData.lastPage
      tabStates.value[idx].hasMore = cacheData.hasMore
      tabStates.value[idx].inited = true
    }
  })

  // 👇 恢复分页后自动补齐数据
  if (!tabStates.value[activeTab.value].inited) {
    // 如果 page > 1，循环加载到目标页
    for (let i = 1; i < tabStates.value[activeTab.value].page; i++) {
      await loadTabData(activeTab.value, true)
    }
    await loadTabData(activeTab.value)
  }

  addScrollListener()
})

// 为每个tab单独加载数据
async function loadTabData(tabIndex: number, isLoadMore = false) {
  const state = tabStates.value[tabIndex]
  if (state.loading) return

  state.loading = true
  try {
    const page = isLoadMore ? state.page + 1 : 1
    const sort = getSortByTab(tabIndex)

    let res
    if (groupId) {
      console.log('ListPage groupId:', groupId)
      res = await fetchRecommendGroupVideos(Number(groupId), { page, pageSize, sort })
    } else if (categoryId) {
      res = await fetchLongVideoByCategory(categoryId, { page, pageSize, sort })
    }

    const newItems = (res?.list || []).map(item => ({
      ...item,
      cover: item.cover || item.cover_url,
      vip: !!(item.vip ?? item.is_vip),
      coin: item.coin ?? 0,
      play: item.play ?? item.play_count ?? 0,
    }))

    if (isLoadMore) {
      state.list = [...state.list, ...newItems]
      state.page = page
    } else {
      state.list = newItems
      state.page = 1
    }

    state.hasMore = newItems.length >= pageSize
    state.inited = true

    // 同步到 store，按 cacheKey+tabKey 缓存
    const parent_id = categoryId
    const tabKey = getTabKey(tabIndex)
    const cacheKey = groupId ? Number(groupId) : parent_id
    if (!longVideoStore.cache[cacheKey]) longVideoStore.cache[cacheKey] = {}
    longVideoStore.cache[cacheKey][tabKey] = {
      list: [...state.list],
      total: state.list.length,
      lastPage: state.page,
      hasMore: state.hasMore
    }
  } finally {
    state.loading = false
  }
}

async function loadMore(tabIndex: number) {
  await loadTabData(tabIndex, true)
}

onBeforeUnmount(() => {
  removeScrollListener()
})

function onTabClick(i: number) {
  saveCurrentTabScroll()
  activeTab.value = i
  swipeRef.value?.swipeTo(i)
  nextTick(() => {
    // 切换时重置滚动
    const el = document.querySelector('.swipe-content')
    if (el) el.scrollTop = 0
    restoreTabScroll(i)
  })
  if (!tabStates.value[i].inited) {
    loadTabData(i)
  }
}
function onSwipeChange(i: number) {
  saveCurrentTabScroll()
  activeTab.value = i
  nextTick(() => {
    // 切换时重置滚动
    const el = document.querySelector('.swipe-content')
    if (el) el.scrollTop = 0
    restoreTabScroll(i)
  })
  if (!tabStates.value[i].inited) {
    loadTabData(i)
  }
}

// 修改 goToPlay 方法，保存正确的滚动位置
const goToPlay = (item: any) => {
  // 保存当前标签页的滚动位置
  saveCurrentTabScroll()
  // 获取当前标签页的滚动位置
  const scrollTop = tabStates.value[activeTab.value].scrollTop

  sessionStorage.setItem('return-from', 'list')
  sessionStorage.setItem('return-scroll', scrollTop.toString())  // 保存内部滚动位置
  sessionStorage.setItem('return-tab', activeTab.value.toString())
  sessionStorage.setItem('return-page', tabStates.value[activeTab.value].page.toString())

  router.push({
    path: `/play/${item.id}`,
  })
}

function goBack() {
  if (window.history.length <= 1) router.push('/')
  else router.back()
}

function formatDuration(duration: number) {
  if (!duration || isNaN(duration)) return '00:00'
  const min = Math.floor(duration / 60)
  const sec = duration % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function formatPlayCount(count: number) {
  if (count >= 10000) {
    return (count / 10000).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') + 'w'
  } else if (count >= 1000) {
    return (count / 1000).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') + 'k'
  }
  return count?.toString() ?? '0'
}

function getSortByTab(tabIndex: number) {
  if (tabIndex === 0) return 'collect'
  if (tabIndex === 1) return 'play'
  if (tabIndex === 2) return 'new'
  return ''
}
function getTabKey(tabIndex: number) {
  if (tabIndex === 0) return 'collect'
  if (tabIndex === 1) return 'play'
  if (tabIndex === 2) return 'new'
  return ''
}
function saveCurrentTabScroll() {
  const el = document.querySelector('.swipe-content') as HTMLElement
  if (el) {
    tabStates.value[activeTab.value].scrollTop = el.scrollTop
  }
}

function restoreTabScroll(i: number) {
  nextTick(() => {
    const el = document.querySelector('.swipe-content') as HTMLElement
    if (el) {
      el.scrollTop = tabStates.value[i].scrollTop || 0
    }
  })
}

const sentinels = [ref(null), ref(null), ref(null)]
const observers: IntersectionObserver[] = []

function setSentinel(idx: number) {
  return (el: HTMLElement | null) => {
    sentinels[idx].value = el
  }
}

tabs.forEach((tab, idx) => {
  watch(sentinels[idx], (el) => {
    if (!el) return
    if (observers[idx]) observers[idx].disconnect()
    observers[idx] = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        const state = tabStates.value[idx]
        // 只有有数据渲染出来才允许继续加载
        if (state.hasMore && !state.loading && state.list.length > 0) {
          loadMore(idx)
        }
      }
    }, { rootMargin: '120px' }) // 提前120px触发
    observers[idx].observe(el)
  }, { immediate: true })
})

onBeforeUnmount(() => {
  observers.forEach(o => o && o.disconnect())
})
</script>

<style scoped>
/* 样式保持不变 */
.list-page {
  background: #fff;
  min-height: 100vh;
  box-sizing: border-box;
  padding-bottom: 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  height: 13vw;
  border-bottom: 1px solid #f3f1f1;
  background: #fff;
}
.cat-title {
  font-size: 5vw;
  font-weight: 800;
  color: #232323;
  text-align: center;
  letter-spacing: 0.2vw;
  max-width: 80vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
  margin: 0 auto;
  flex: 1;
}
.back-icon {
  position: absolute;
  left: 3vw;
  top: 50%;
  transform: translateY(-50%);
  width: 5vw;
  height: 5vw;
  cursor: pointer;
  z-index: 2;
}

.tob-bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 8vw;
  padding: 0;
  background: #f7f6f6;
}
.tab-item {
  flex: 1;
  text-align: center;
  font-size: 4vw;
  color: #888;
  font-weight: 500;
  position: relative;
  cursor: pointer;
  padding-bottom: 1vw;
  padding-top: 1vw;
  transition: color .15s;
  letter-spacing: 0.1vw;
}
.tab-item.active {
  color: #e23d41;
  font-weight: bold;
}
.tab-item.active::after {
  content: "";
  position: absolute;
  left: 50%; bottom: -0.5vw;
  transform: translateX(-50%);
  width: 11vw;
  height: 0.7vw;
  background: #e23d41;
  border-radius: 1vw;
}

.swipe-content {
  width: 100vw;
  background: #fff;
  min-height: 50vw;
  height: 100vh;
  overflow-y: auto;
}
.video-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3vw 2vw;
  padding: 4vw 2vw 0 2vw;
}
.video-card {
  background: #f5f4f4;
  border-radius: 2vw;
  box-shadow: 0 0.4vw 2vw rgba(160,160,160,0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 44vw;
  height: 40vw;
  min-height: 42vw;
  max-height: 54vw;
  position: relative;
}

.thumb-wrap {
  width: 100%;
  aspect-ratio: 16/9;
  background: #e8e8e8;
  border-radius: 2vw 2vw 0 0;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
}
.cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 2vw 2vw 0 0;
  background: #e8e8e8;
}
.video-info-bar {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 3vw;
  color: #fff;
  padding: 0 2vw 1vw 2vw;
  background: linear-gradient(0deg,rgba(34,34,34,0.80),rgba(34,34,34,0.10) 85%);
  border-radius: 0 0 2vw 2vw;
}

.desc-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.5vw 2vw 1vw 2vw;
  min-height: 12vw;
}

.video-title {
  font-size: 3.3vw;
  color: #303030;
  font-weight: 550;
  line-height: 1.25;
  margin-bottom: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  min-height: 8vw;
  max-height: 8vw;
}

.card-bottom {
  display: flex;
  align-items: center;
  gap: 2vw;
  margin-top: 2vw;
  padding-bottom: 0.3vw;
}

.tag {
  background: #e23d41;
  color: #fff;
  font-size: 3vw;
  border-radius: 0.7vw;
  padding: 0.4vw 2vw 1vw 2vw;
  margin-right: 1vw;
  font-weight: 500;
  display: inline-block;
  line-height: 1;
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
</style>