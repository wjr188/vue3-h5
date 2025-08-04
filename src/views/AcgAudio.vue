<template>
  <div class="acg-audio-wrapper">
    <div class="content-container">
      <!-- 有声小说卡片列表 -->
      <div v-if="audios.length">
        <AcgSection
          :layoutType="'type5'"
          :data="audios"
          @item-click="goToDetail"
        />
      </div>
      <!-- 初始加载中 -->
      <div v-if="loading && audios.length === 0" class="loading-tip">
        <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
        <div class="loading-text">客官别走，妾身马上就好~</div>
      </div>
      <!-- 无数据 -->
      <div v-if="!loading && audios.length === 0">
        <div class="empty-data-message">该分类暂无有声数据或数据加载失败...</div>
      </div>
      <!-- 下拉加载中 -->
      <div v-if="loading && audios.length > 0" class="loading-tip">
        <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
        <div class="loading-text">客官别走，妾身马上就好~</div>
      </div>
      <!-- 加载更多提示锚点 -->
      <div v-if="!noMore" ref="sentinel" class="load-more-trigger"></div>
      <!-- 没有更多了 -->
      <div v-if="noMore && audios.length > 0" class="no-more-text">
        客官，妾身被你看光了，扛不住了~
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onActivated, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AcgSection from '@/components/AcgSection.vue'
import { useAudioNovelCategoryStore } from '@/store/audio-novel.store'

// props: categoryTitle 和 categoryId 由父组件传入
const props = defineProps<{
  categoryTitle: string
  activeTab: string
  activeSubCategory: string
  categoryId: string | number
  scrollContainerRef: any
}>()

const router = useRouter()
const audioNovelStore = useAudioNovelCategoryStore()
const pageSize = 15
const sentinel = ref<null | HTMLElement>(null)
const noMore = ref(false)

// 1. 分页缓存结构和 novel 完全一致，按 categoryId 存储
const currentCache = computed(() => audioNovelStore.categoryAudioMap?.[props.categoryId] || {})
const sortedPages = computed(() => Object.keys(currentCache.value).map(p => +p).sort((a, b) => a - b))
const audios = computed(() =>
  sortedPages.value.flatMap(p => currentCache.value[p]?.list || [])
)
const total = computed(() => {
  const firstPage = sortedPages.value[0]
  return currentCache.value[firstPage]?.total || 0
})
const currentPage = computed(() =>
  sortedPages.value.length ? Math.max(...sortedPages.value) : 0
)
const loading = computed(() => audioNovelStore.loading)
const isActive = computed(() => props.activeSubCategory == props.categoryTitle)

// 是否没有更多
watch([audios, total], () => {
  noMore.value = audios.value.length >= total.value
})

// 懒加载分页（带categoryId）
async function tryLoadMore() {
  if (!isActive.value || loading.value || noMore.value) return;
  // 如果当前没有任何页数据，直接return，等待父组件的首次加载
  if (currentPage.value === 0) return;  // 这里加判断！
  const nextPage = currentPage.value + 1;
  await audioNovelStore.loadAudioNovelList({
    categoryId: props.categoryId,
    page: nextPage,
    pageSize,
  }, true, props.categoryId);
}

// intersection observer分页加载（和原来一致）
let io: IntersectionObserver | null = null
watch(
  () => sentinel.value,
  (el) => {
    if (io) io.disconnect()
    if (el) {
      io = new IntersectionObserver(async (entries) => {
        if (entries[0].isIntersecting) await tryLoadMore()
      }, { threshold: 0.1 })
      io.observe(el)
    }
  },
  { flush: 'post' }
)
function getCurrentFullPath(): string {
  return window.location.pathname + window.location.search
}
function goToDetail(item: any) {
  if (props.scrollContainerRef?.value) {
    const scrollTop = props.scrollContainerRef.value.scrollTop
    const key = `acg-scroll-${props.activeTab}-${props.activeSubCategory}`
    sessionStorage.setItem(key, scrollTop.toString())
  }
  sessionStorage.setItem('acg-return-from', JSON.stringify({
    name: 'Acg',
    query: {
      tab: props.activeTab,
      sub: props.activeSubCategory
    }
  }))
  sessionStorage.setItem('acg-return-tab', props.activeTab)
  sessionStorage.setItem('acg-return-sub', props.activeSubCategory)
  router.push({ name: 'AudioPlayer', params: { id: item.id } })
}

// 激活后恢复滚动
onActivated(() => {
  const scrollKey = `acg-scroll-${props.activeTab}-${props.activeSubCategory}`
  const savedScrollTop = sessionStorage.getItem(scrollKey)
  if (props.scrollContainerRef?.value && savedScrollTop) {
    requestAnimationFrame(() => {
      props.scrollContainerRef.value!.scrollTop = parseInt(savedScrollTop, 10)
    })
  }
})
</script>

<style scoped>
.acg-audio-wrapper {
  background: #f8f8f8;
  min-height: calc(100vh - 37.3vw - 16vw);
}
.content-container {
  max-width: 200vw;
  margin: 0 auto;
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
.load-more-trigger {
  height: 13.3vw;
  margin-top: 5.3vw;
  text-align: center;
  color: #888;
  font-size: 3.5vw;
}
.empty-data-message {
  text-align: center;
  padding: 8vw;
  color: #999;
  font-size: 4.26vw;
}
</style>
