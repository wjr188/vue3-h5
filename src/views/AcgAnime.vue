<template>
  <div class="acg-anime-wrapper">
    <div class="content-container">
      <!-- 每个模块=每个子分类 -->
      <div v-for="module in allModules" :key="module.id" class="recommend-module">
        <div class="module-title">
          <div class="left-title">
            <img v-if="module.icon" :src="`/icons/${module.icon}`" class="icon" :alt="module.moduleTitle" @error="e => (e.target.style.display='none')" />
            {{ module.moduleTitle }}
          </div>
          <div class="more-btn" @click="goMore(module)">
            <span>更多</span>
            <img src="/icons/more-arrow.svg" class="arrow-icon" />
          </div>
        </div>
        <AcgSection
          :layoutType="module.layoutType"
          :data="module.items"
          @item-click="goToDetail"
        />
      </div>
      <div v-if="allModules.length === 0 && !isLoading" class="empty-data-message">
        <p>该分类暂无动漫数据或数据加载失败...</p>
      </div>
      <div v-if="isLoading" class="loading-tip">
        <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
        <div class="loading-text">客官别走，妾身马上就好~</div>
      </div>
      <div v-if="noMore && allModules.length > 0" class="no-more-text">
        客官，妾身被你弄高潮了，扛不住了~
      </div>
      <div ref="sentinel" class="load-more-trigger"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, onActivated } from 'vue'
import { useAnimeStore } from '@/store/anime.store'
import AcgSection from '@/components/AcgSection.vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  categoryTitle: string
  activeTab: string
  activeSubCategory: string
  scrollContainerRef: any
  parentCategoryId: number
}>()

const router = useRouter()
const animeStore = useAnimeStore()

const parentId = computed(() => props.parentCategoryId || 0)
const subPage = computed(() =>
  animeStore.groupMap?.[parentId.value] || {
    subCategories: [], total: 0, page: 0, pageSize: 2, loading: false, noMore: false,
  }
)
const allModules = computed(() =>
  (animeStore.groupMap?.[parentId.value]?.subCategories || []).map(sub => ({
    id: sub.id,
    moduleTitle: sub.name,
    layoutType: sub.layout_type || 'type1',
    icon: sub.icon || '',
    items: sub.animes || []
  }))
)

const isLoading = computed(() => subPage.value.loading)
const noMore = computed(() => subPage.value.noMore)

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new window.IntersectionObserver(async entries => {
    if (
      entries[0].isIntersecting &&
      !isLoading.value &&
      !noMore.value
    ) {
      await animeStore.loadMoreGroup(parentId.value)
    }
  })
  nextTick(() => {
    if (sentinel.value) observer!.observe(sentinel.value)
  })
})
onUnmounted(() => { observer && observer.disconnect() })

function getCurrentFullPath() {
  return window.location.pathname + window.location.search
}
function saveScrollTop() {
  if (props.scrollContainerRef?.value) {
    const scrollTop = props.scrollContainerRef.value.scrollTop
    const key = `acg-scroll-anime-${props.categoryTitle}`
    sessionStorage.setItem(key, scrollTop.toString())
  }
}
function goToDetail(item) {
  saveScrollTop()
  sessionStorage.setItem('acg-return-from', JSON.stringify({
    name: 'Acg',
    query: {
      tab: props.activeTab,
      sub: props.activeSubCategory
    }
  }))
  sessionStorage.setItem('acg-return-tab', props.activeTab)
  sessionStorage.setItem('acg-return-sub', props.activeSubCategory)
  router.push({
    name: 'PlayPage',
    params: { id: item.id, source: props.categoryTitle },
    query: { type: 'anime' }
  })
}

function goMore(module) {
  if (module.items && module.items.length > 0) {
    saveScrollTop()
    if (!sessionStorage.getItem('more-entry-path')) {
      sessionStorage.setItem('more-entry-path', getCurrentFullPath())
      sessionStorage.setItem('more-entry-scroll', props.scrollContainerRef?.value?.scrollTop?.toString() || '0')
    }
    sessionStorage.setItem('acg-return-from', getCurrentFullPath())
    sessionStorage.setItem('acg-return-tab', props.activeTab)
    sessionStorage.setItem('acg-return-sub', props.activeSubCategory)
    sessionStorage.setItem('moduleTitle', module.moduleTitle)
    sessionStorage.setItem('subCategoryId', module.id?.toString() || '')
    sessionStorage.setItem(`scroll-pos-${module.moduleTitle}`, props.scrollContainerRef?.value?.scrollTop?.toString() || '0')
    sessionStorage.setItem('type', 'anime')
    router.push({ name: 'AcgMoreListPage' })
  }
}

// 滚动恢复
onActivated(() => {
  const scrollKey = `acg-scroll-anime-${props.categoryTitle}`
  const savedScrollTop = sessionStorage.getItem(scrollKey)
  if (props.scrollContainerRef?.value && savedScrollTop) {
    let tryCount = 0
    let lastHeight = 0
    function tryRestore() {
      if (!props.scrollContainerRef?.value) return
      const el = props.scrollContainerRef.value
      if (el.scrollHeight !== lastHeight && el.scrollHeight > 0) {
        el.scrollTop = parseInt(savedScrollTop, 10)
        lastHeight = el.scrollHeight
      }
      tryCount++
      if (tryCount < 20) setTimeout(tryRestore, 40)
    }
    tryRestore()
  }
})
</script>
<style scoped>
.acg-anime-wrapper {
  background: #f8f8f8;
  min-height: calc(100vh - 37.33vw - 16vw); /* 140px+60px */
}

.content-container {
  max-width: 200vw; /* 750px */
  margin: 0 auto;
}

.recommend-module {
  margin-bottom: 0;
}

.loading-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5.33vw 0; /* 20px */
  font-size: 3.73vw; /* 14px */
}

.custom-spinner {
  width: 9.33vw;  /* 35px */
  height: 9.33vw;
  margin-bottom: 2.13vw; /* 8px */
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.left-title {
  display: flex;
  align-items: center;
}
.icon {
  width: 5.33vw;
  height: 5.33vw;
  margin-right: 1.6vw;
}
.module-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 1.33vw 2.13vw;
  font-size: 4.26vw;
  font-weight: bold;
  color: #333;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.more-btn {
  font-size: 3.2vw;
  color: #ff6699;
  padding: 0.8vw 1.33vw;
  border: 0.53vw solid #ff6699;
  border-radius: 1.33vw;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 1.06vw;
  transition: 0.3s;
  background: #fff;
  font-weight: 600;
  box-shadow: 0 0.53vw 1.06vw rgba(0,0,0,0.1);
  margin-right: 2.66vw;
  white-space: nowrap;
  max-width: 19.2vw;
  overflow: hidden;
}
.more-btn:hover {
  background: #ff6699;
  color: #fff;
}
.arrow-icon {
  width: 2.66vw;
  height: 2.66vw;
}
.loading-text {
  color: #ff5f5f;
  font-weight: 500;
}

.no-more-text {
  text-align: center;
  color: #999;
  font-weight: bold;
  font-size: 3.73vw; /* 14px */
  margin: 5.33vw 0; /* 20px */
}

.load-more-trigger {
  height: 13.33vw; /* 50px */
  margin-top: 5.33vw; /* 20px */
}

.empty-data-message {
  text-align: center;
  padding: 8vw; /* 30px */
  color: #999;
  font-size: 4.26vw; /* 16px */
}
</style>
