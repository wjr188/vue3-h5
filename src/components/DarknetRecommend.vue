<template>
  <div class="recommend-page" ref="recommendPageRef">
    <CategoryBlock
      v-for="(group, index) in adaptedGroups"
      :key="group.id"
      :category="group"
      :dark="true"
      @clickItem="emitClickItem"
      @goToMore="() => emitGoToMore(group.name, group.id)"
      @refreshGroup="refreshGroup"
    />

    <div v-if="loading" class="loading-tip">
      <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
      <div class="loading-text">客官别走，妾身马上就好~</div>
    </div>
    <div v-if="noMore" class="no-more-text">
      客官，妾身被你弄高潮了，扛不住了 ~
    </div>
    
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, nextTick, ref, watch } from 'vue'
import CategoryBlock from './CategoryBlock.vue'
import { useDarknetStore } from '@/store/darknet.store'
import { storeToRefs } from 'pinia'
import { fetchDarknetGroupVideos } from '@/api/darknet.api' // 如未导入请补充

interface VideoItem {
  id: number
  cover: string
  title: string
  play_count?: number
  collect_count?: number
  coin?: number
  is_vip?: number
  create_time?: string
  duration?: string
  tags?: any[]
  preview?: string
  [key: string]: any
}
interface GroupItem {
  id: number
  name: string
  sort: number
  icon?: string
  videos: VideoItem[]
}

// 事件
const emit = defineEmits<{
  (e: 'clickItem', payload: VideoItem): void
  (e: 'goToMore', groupName: string, groupId: number): void // 增加 groupId
}>()
const emitClickItem = (payload: any) => {
  // 主卡片（group.mainId）和子卡片（subImages）都能点
  if (payload.id) {
    emit('clickItem', {
      ...payload,
      type: 'darknet', // 必须带type参数
      src: payload.src || payload.preview || '',
      cover: payload.cover || payload.mainImage,
      title: payload.title || payload.mainTitle,
      tag: payload.tag || (payload.tags?.length ? payload.tags[0] : ''),
      tags: payload.tags || payload.mainTags || [],
      duration: payload.duration || payload.mainDuration,
      coin: payload.coin || payload.mainCoin,
      is_vip: payload.is_vip ?? payload.mainVip,
      play_count: payload.play_count ?? payload.views ?? payload.mainViews,
    })
  }
}
const emitGoToMore = (groupName: string, groupId: number) => emit('goToMore', groupName, groupId)

// 用 store
const darknetStore = useDarknetStore()
const { loading, currentPage, totalPages } = storeToRefs(darknetStore)

const props = defineProps({
  groups: {
    type: Array,
    default: () => []
  }
})

// 结构适配函数
function adaptGroupToCategoryBlock(group: GroupItem) {
  const videos = group.videos || []
  const main = videos[0] || {}
  const subImages = videos.slice(1, 5).map(v => ({
    id: v.id,
    cover: v.cover,
    title: v.title,
    tag: (v.tags && v.tags.length) ? v.tags[0] : '',
    tags: v.tags,
    src: v.preview || '',
    views: v.play_count || 0,
    duration: v.duration || '',
    vip: !!v.is_vip,
    coin: v.coin,
  }))
  return {
    id: group.id,
    name: group.name,
    icon: group.icon,
    mainId: main.id,
    mainImage: main.cover,
    mainTitle: main.title,
    mainTag: (main.tags && main.tags.length) ? main.tags[0] : '',
    mainTags: main.tags || [], // 👈 加这一行
    mainViews: main.play_count || 0,
    mainDuration: main.duration || '',
    src: main.preview || '',
    mainVip: !!main.is_vip,
    mainCoin: main.coin,
    subImages,
  }
}

// 用 props.groups 替换所有 groups
const adaptedGroups = computed(() => props.groups.map(adaptGroupToCategoryBlock))

let autoLoadCount = 0;
const MAX_AUTO_LOAD = 1;

async function loadMore() {
  if (!props.groups || props.groups.length === 0) return;
  if (loading.value || noMore.value) return;
  if (autoLoadCount >= MAX_AUTO_LOAD) return;
  autoLoadCount++;

  await darknetStore.loadHome({ page: currentPage.value + 1, pageSize: 3 });
}

const recommendPageRef = ref<HTMLElement | null>(null)
let scrollContainer: HTMLElement | null = null

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el
  while (node) {
    const style = window.getComputedStyle(node)
    if (/(auto|scroll)/.test(style.overflowY)) return node
    node = node.parentElement
  }
  return null
}

function handleScroll() {
  if (loading.value) return; // 防止重复加载

  let scrollTop, clientHeight, scrollHeight
  if (scrollContainer) {
    scrollTop = scrollContainer.scrollTop
    clientHeight = scrollContainer.clientHeight
    scrollHeight = scrollContainer.scrollHeight
  } else {
    scrollTop = window.scrollY
    clientHeight = window.innerHeight
    scrollHeight = document.documentElement.scrollHeight
  }
  // 添加 200px 阈值
  if (scrollTop + clientHeight >= scrollHeight - 200) {
    loadMore();
  }
}

onMounted(() => {
  
  const initScrollListener = () => {
    nextTick(() => {
      scrollContainer = findScrollParent(recommendPageRef.value);
      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', handleScroll);
      } else {
        window.addEventListener('scroll', handleScroll);
      }
    });
  };

  // 如果已有数据，立即初始化
  if (props.groups && props.groups.length > 0) {
    initScrollListener();
  } else {
    // 否则等待数据加载
    const unwatch = watch(() => props.groups, (newVal) => {
      if (newVal && newVal.length > 0) {
        initScrollListener();
        unwatch();
      }
    });
  }
});

onUnmounted(() => {
  if (scrollContainer) {
    scrollContainer.removeEventListener('scroll', handleScroll)
  } else {
    window.removeEventListener('scroll', handleScroll)
  }
})

const noMore = computed(() => currentPage.value >= totalPages.value);

async function refreshGroup(groupId: number) {
  // 1. 拉取新的视频（随机5个）
  const res = await fetchDarknetGroupVideos(groupId, { pageSize: 5, random: 1 });
  // 2. 找到分组并更新
  const group = props.groups.find(g => g.id === groupId);
  if (group) {
    group.videos = res.list || [];
  }
}
</script>
<style scoped>
.recommend-page {
  padding: 0 3.2vw; /* 12px */
  box-sizing: border-box;
}
.loading-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5.3vw 0; /* 20px */
  font-size: 3.7vw; /* 14px */
}
.custom-spinner {
  width: 9.3vw; /* 35px */
  height: 9.3vw;
  margin-bottom: 2.1vw; /* 8px */
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.loading-text {
  color: #ff5f5f;
  font-weight: 500;
}
.no-more-text {
  text-align: center;
  color: #fff; /* 改成白色 */
  font-weight: bold;
  font-size: 3.7vw;
  margin: 5.3vw 0;
}
</style>
