<template>
  <div class="more-list-wrapper">
    <div class="top-bar">
      <img src="/icons/back3.svg" class="back-icon" @click="goBack" />
      <div class="title-wrapper"><span class="title">{{ pageTitle }}</span></div>
    </div>

    <div class="scroll-content" ref="scrollContent">
      <div class="card-list">
        <AcgCard
          v-for="item in items"
          :key="item.id"
          :data="item"
          @click="goToDetail(item)"
        />
      </div>
      <div v-if="isLoading" class="loading-tip">
        <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
        <div class="loading-text">客官别走，妾身马上就好~</div>
      </div>
      <div v-if="noMore && items.length > 0" class="no-more-text">
        客官，妾身被你弄高潮了，扛不住了 ~
      </div>
      <div v-if="!noMore" ref="sentinel" class="load-more-trigger"></div>
    </div>

    <!-- 🔥 修复：添加组件挂载状态检查，和 LimitedFreeList 保持一致 -->
    <BackToTop 
      v-if="isComponentMounted"
      :scroll-container="scrollContent"
      :threshold="200"
      :duration="500"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted, onActivated, computed } from 'vue'
import { useRouter } from 'vue-router'
import AcgCard from '@/components/AcgCard.vue'
// 🔥 新增：导入 BackToTop 组件
import BackToTop from '@/components/BackToTop.vue'
import { useComicCategoryStore } from '@/store/comicCategoryStore'
import { useNovelCategoryStore } from '@/store/novelStore'
import { useAudioNovelCategoryStore } from '@/store/audio-novel.store'
import { useAnimeStore } from '@/store/anime.store'


const comicStore = useComicCategoryStore()
const novelStore = useNovelCategoryStore()
const audioStore = useAudioNovelCategoryStore()
const animeStore = useAnimeStore()
const router = useRouter()

const pageTitle = ref(sessionStorage.getItem('acg-return-sub') || '推荐')
const groupId = ref<number | null>(
  sessionStorage.getItem('groupId') ? Number(sessionStorage.getItem('groupId')) : null
)
const subCategoryId = ref<number | null>(
  sessionStorage.getItem('subCategoryId') ? Number(sessionStorage.getItem('subCategoryId')) : null
)
// 支持三种类型：type = comic | novel | audio
const type = sessionStorage.getItem('type') // 推荐你 setItem('type', 'audio') / 'novel' / 'comic'
const isComic = computed(() => !type || type === 'comic')
const isNovel = computed(() => type === 'novel')
const isAudio = computed(() => type === 'audio')
const isAnime = computed(() => type === 'anime')


const items = ref<any[]>([])
const isLoading = ref(false)
const noMore = ref(false)
const page = ref(1)
const total = ref(0)
const sentinel = ref<HTMLDivElement | null>(null)
const scrollContent = ref<HTMLElement | null>(null)

// 🔥 新增：添加组件挂载状态标识，和 LimitedFreeList 保持一致
const isComponentMounted = ref(false)

async function loadMore() {
  if (isLoading.value || noMore.value) return
  isLoading.value = true

  let res: { list: any[]; total: number } = { list: [], total: 0 }

  // 推荐分组分页
  if (groupId.value && !subCategoryId.value) {
    if (isAudio.value) {
      // 有声推荐分组
      res = await audioStore.loadAudioRecommendGroupAudiosPaginated(
        groupId.value, { page: page.value, pageSize: 15 }
      )
    } else if (isNovel.value) {
      // 小说推荐分组
      res = await novelStore.loadRecommendGroupNovels(
        groupId.value, { page: page.value, pageSize: 15 }
      )
      } else if (isAnime.value) {
      // ==================== 新增动漫推荐分组 ====================
      res = await animeStore.loadRecommendGroupAnimes(
        groupId.value, { page: page.value, pageSize: 15 }
      )
    } else {
      // 漫画推荐分组
      res = await comicStore.loadRecommendGroupComics(
        groupId.value, { page: page.value, pageSize: 15 }
      )
    }
  }
  // 分类分页
  else if (subCategoryId.value) {
    if (isAudio.value) {
      // 有声分页，兼容 store 分页缓存
      const cacheKey = String(subCategoryId.value)
      await audioStore.loadAudioNovelList(
        { categoryId: subCategoryId.value, page: page.value, pageSize: 15 }, false, subCategoryId.value
      )
      const pageCache = audioStore.categoryAudioMap[cacheKey]?.[page.value]
      res = {
        list: pageCache?.list || [],
        total: pageCache?.total || 0
      }
    } else if (isNovel.value) {
      // 小说分页
      res = await novelStore.loadCategoryNovels(
        subCategoryId.value, { page: page.value, pageSize: 15 }
      )
      } else if (isAnime.value) {
  // ========== 新增动漫分页 ==========
  res = await animeStore.loadSubCategoryAnimes(
    subCategoryId.value, page.value, 15
  )
    } else {
      // 漫画分页
      res = await comicStore.loadSubCategoryComics(
        subCategoryId.value, { page: page.value, pageSize: 15 }
      )
    }
  }

  // 默认空
  const list = res?.list || []
  total.value = res?.total || 0
  items.value = page.value === 1 ? list : [...items.value, ...list]
  noMore.value = items.value.length >= total.value || list.length < 15
  page.value++
  isLoading.value = false
}

function saveScrollPosition() {
  const scrollPosition = scrollContent.value?.scrollTop || window.scrollY
  sessionStorage.setItem('acg-more-scroll-top', scrollPosition.toString())
}

async function restoreScrollPosition() {
  await nextTick()
  const savedScroll = sessionStorage.getItem('acg-more-scroll-top')
  if (!savedScroll) return
  requestAnimationFrame(() => {
    const position = parseInt(savedScroll, 10)
    if (scrollContent.value) {
      scrollContent.value.scrollTop = position
    } else {
      window.scrollTo(0, position)
    }
    sessionStorage.removeItem('acg-more-scroll-top')
  })
}

function goToDetail(item: any) {
  // id 兼容漫画/小说/有声
  const id = item.id || item.comic_id || item.novel_id || item.audio_novel_id
  if (!id) {
    alert('数据异常，无法跳转详情')
    return
  }
  saveScrollPosition()
  sessionStorage.setItem('acg-return-from', JSON.stringify({ name: 'AcgMoreListPage' }))
  router.push({
    name: isAudio.value
      ? 'AudioPlayer'
      : isNovel.value
        ? 'NovelDetail'
        : isAnime.value
          ? 'PlayPage'
        : 'ComicDetail',
    params: { id },
    query: isAnime.value ? { type: 'anime' } : {}
  })
}

function goBack() {
  const entryPath = sessionStorage.getItem('more-entry-path')
  const moreScroll = sessionStorage.getItem('acg-more-scroll-top')
  sessionStorage.removeItem('more-entry-path')
  sessionStorage.removeItem('acg-more-scroll-top')
  if (entryPath) {
    router.replace(entryPath).then(() => {
      setTimeout(() => {
        window.scrollTo(0, parseInt(moreScroll || '0', 10))
      }, 0)
    })
  } else {
    router.replace('/')
  }
}

let observer: IntersectionObserver | null = null
function initObserver() {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        loadMore()
      }
    },
    { root: null, threshold: 0.1 }
  )
  if (sentinel.value) observer.observe(sentinel.value)
}

onMounted(async () => {
  pageTitle.value = sessionStorage.getItem('moduleTitle') || '默认标题'
  
  // 🔥 新增：等待 DOM 渲染完成
  await nextTick()
  
  // 🔥 新增：设置组件挂载完成标识
  if (scrollContent.value) {
    isComponentMounted.value = true
  }
  
  await loadMore()
  await restoreScrollPosition()
  initObserver()
})

onActivated(async () => {
  await restoreScrollPosition()
})

onUnmounted(() => {
  if (observer && sentinel.value) {
    observer.unobserve(sentinel.value)
    observer.disconnect()
  }
})
</script>

<style scoped>
.more-list-wrapper {
  background: #f8f8f8;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.scroll-content {
  flex: 1;
  width: 100%;
  overflow-y: scroll; /* 必须保留scroll而非auto，否则部分浏览器不生效 */
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox隐藏滚动条 */
}

/* Chrome/Safari隐藏滚动条 */
.scroll-content::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
  background: transparent;
}
.top-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  height: 13.3vw;
  padding: 0 3.2vw;
}

.back-icon {
  position: absolute;
  left: 3.2vw;
  width: 6.9vw;
  height: 6.9vw;
  z-index: 20;
}

.title-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.title {
  font-size: 5.3vw;
  font-weight: bold;
  color: #333;
}

.card-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3.2vw;
  padding: 3.2vw;
  width: 100%;
  box-sizing: border-box;
}

.loading-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5.3vw 0;
  font-size: 3.7vw;
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
  margin: 5.33vw 0;
}

.load-more-trigger {
  height: 2px;
  margin: 0;
  background: transparent;
}
</style>