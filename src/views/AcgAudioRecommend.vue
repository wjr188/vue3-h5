<template>
  <div class="acg-audio-recommend-wrapper">
    <div class="content-container">
      <!-- 推荐模块列表 -->
      <div
        v-for="(module, index) in visibleList"
        :key="module.id || index"
        class="recommend-module"
      >
        <div class="module-title">
          <div class="left-title">
            <img
              v-if="module.icon"
              :src="`/icons/${module.icon}`"
              class="icon"
              alt=""
            />
            {{ module.moduleTitle }}
            <img
              v-if="index === 0"
              src="/icons/recommend.svg"
              class="hand-icon"
              alt="推荐"
            />
          </div>
          <div class="more-btn" @click="goMore(module)">
            <span>更多</span>
            <img src="/icons/more-arrow.svg" class="arrow-icon" alt="箭头" />
          </div>
        </div>
        <AcgSection
          :layoutType="module.layoutType"
          :data="module.items"
          @item-click="goToDetail"
        />
      </div>
      <div v-if="visibleList.length === 0 && !isLoading" class="empty-data-message">
        推荐内容正在加载或暂无数据...
      </div>
      <div v-if="isLoading" class="loading-tip">
        <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
        <div class="loading-text">客官别走，妾身马上就好~</div>
      </div>
      <div v-if="noMore && visibleList.length > 0" class="no-more-text">
        客官，妾身被你看光了，扛不住了 ~
      </div>
      <div ref="sentinel" class="load-more-trigger"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'AcgAudioRecommend' })

import { ref, computed, onMounted, onActivated, onDeactivated, nextTick, onBeforeUnmount, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import AcgSection from '@/components/AcgSection.vue'
import { useAudioNovelCategoryStore } from '@/store/audio-novel.store'

// 1. 接收滚动容器 Ref
const props = defineProps<{ scrollContainerRef: Ref<HTMLElement | null> }>()

const audioStore = useAudioNovelCategoryStore()
const router = useRouter()

const currentPage = ref(1)
const pageSize = 2
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

// 2. 状态
const isLoading = computed(() => audioStore.loading)
const total = computed(() => audioStore.recommendGroupsTotal)
const noMore = computed(() => total.value > 0 && visibleList.value.length >= total.value && !isLoading.value)

// 3. 懒加载/分页
function setupObserver() {
  if (observer) observer.disconnect()
  observer = new window.IntersectionObserver(async entries => {
    if (
      entries[0].isIntersecting &&
      !audioStore.loading &&
      visibleList.value.length < total.value
    ) {
      currentPage.value++
      await audioStore.loadAudioRecommendAllGroups({ page: currentPage.value, pageSize })
      await nextTick()
      if (sentinel.value) observer!.observe(sentinel.value)
    }
  })
  if (sentinel.value) observer.observe(sentinel.value)
}

// 4. 首次加载
onMounted(async () => {
  currentPage.value = 1
  await audioStore.loadAudioRecommendAllGroups({ page: currentPage.value, pageSize })
  setupObserver()
})
onBeforeUnmount(() => { if (observer) observer.disconnect() })

// 5. 显示列表（格式和小说完全一致）
const visibleList = computed(() => {
  return (audioStore.recommendGroups || []).map(group => ({
    id: group.id,
    moduleTitle: group.name,
    layoutType: group.layout_type || 'type1',
    icon: group.icon || '',
    items: (group.audios || group.novels || group.items || []).slice(0, 15),
    audiosCount: (group.audios || group.novels || group.items || []).length
  }))
})

// 6. 滚动保存/恢复
const scrollKey = 'acg-scroll-audio-recommend'
function saveScrollTop() {
  const el = props.scrollContainerRef?.value
  if (el) {
    const scrollTop = Math.max(0, el.scrollTop)
    if (scrollTop > 0) {
      sessionStorage.setItem(scrollKey, scrollTop.toString())
    }
  }
}
function restoreScrollTop() {
  const el = props.scrollContainerRef?.value
  const saved = sessionStorage.getItem(scrollKey)
  if (el && saved) {
    const targetPos = parseInt(saved)
    if (targetPos > 0 && el.scrollHeight > el.clientHeight) {
      const restoreAttempt = (attempt = 0) => {
        if (attempt >= 5) return
        el.scrollTop = targetPos
        const currentPos = el.scrollTop
        if (Math.abs(currentPos - targetPos) > 2) {
          setTimeout(() => restoreAttempt(attempt + 1), 50 * (attempt + 1))
        }
      }
      setTimeout(() => {
        if (el.scrollHeight > el.clientHeight) {
          restoreAttempt()
        }
      }, 100)
    }
  }
}
onActivated(() => { restoreScrollTop() })
onDeactivated(() => { saveScrollTop() })

function getCurrentFullPath(): string {
  return window.location.pathname + window.location.search
}

// 7. 跳转详情/更多
function goToDetail(item: any) {
  saveScrollTop()
  sessionStorage.setItem('acg-return-from', JSON.stringify({
    name: 'Acg',   // 可以写成你的推荐/分类页真实路由名
    query: { tab: '有声', sub: '推荐' }
  }))
  sessionStorage.setItem('acg-return-tab', '有声')
  sessionStorage.setItem('acg-return-sub', '推荐')
  router.push({
    name: 'AudioPlayer',
    params: { id: item.id },
    query: { type: 'audio' }
  })
}

function goMore(module: any) {
  saveScrollTop()
  if (!sessionStorage.getItem('more-entry-path')) {
    sessionStorage.setItem('more-entry-path', getCurrentFullPath())
    sessionStorage.setItem('more-entry-scroll', props.scrollContainerRef?.value?.scrollTop?.toString() || '0')
  }
  sessionStorage.setItem('acg-return-from', getCurrentFullPath())
  sessionStorage.setItem('acg-return-tab', '有声')
  sessionStorage.setItem('acg-return-sub', module.moduleTitle)
  sessionStorage.setItem('moduleTitle', module.moduleTitle)
  sessionStorage.setItem(`scroll-pos-${module.moduleTitle}`, props.scrollContainerRef?.value?.scrollTop?.toString() || '0')
  if (module.id) {
    sessionStorage.setItem('groupId', module.id.toString())
    sessionStorage.removeItem('subCategoryId')
  }
  sessionStorage.setItem('type', 'audio')
  router.push({ name: 'AcgMoreListPage' })
}
</script>

<style scoped>
.acg-audio-wrapper {
  background: #f8f8f8;
  height: calc(100vh - 140px - 60px);
  overflow-y: auto;
  position: relative;
}
.content-container {
  width: 100%;
  min-height: 100%;
  padding-bottom: 20px;
}
.recommend-module { margin-bottom: 0; }
.module-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 1.33vw 2.13vw;
  font-size: 4.26vw;
  font-weight: bold;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
.hand-icon {
  width: 28px;
  height: 28px;
  margin-left: 8px;
  vertical-align: middle;
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
.more-btn span { font-size: 3.2vw; line-height: 1; }
.more-btn:hover { background: #ff6699; color: #fff; }
.arrow-icon { width: 2.66vw; height: 2.66vw; }
.empty-data-message {
  text-align: center;
  padding: 13.3vw;
  color: #999;
  font-size: 4.26vw;
}
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
.loading-text { color: #ff5f5f; font-weight: 500; }
.no-more-text {
  text-align: center;
  color: #999;
  font-weight: bold;
  font-size: 3.73vw;
  margin: 5.33vw 0;
}
.load-more-trigger {
  height: 13.3vw;
  margin-top: 5.33vw;
}
</style>
