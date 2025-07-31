<template>
  <div class="recommend-page">
    <div
      v-for="(group, index) in visibleGroups"
      :key="group.id + '-' + group.mainId"
      class="recommend-group-block"
    >
      <CategoryBlock
        :category="group"
        @clickItem="emitClickItem"
        @goToMore="emitGoToMore"
        @refreshGroup="emitRefreshGroup"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import CategoryBlock from './CategoryBlock.vue'
import { useRecommendUIStore } from '@/store/ui/longVideo/recommendUI.store'
import { useH5LongVideoStore } from "@/store/h5LongVideo.store";

const props = defineProps<{ groups: any[] }>()
const emit = defineEmits<{
  (e: 'clickItem', payload: any): void
  (e: 'goToMore', payload: string): void
  (e: 'refreshGroup', groupId: number): void
  (e: 'loadPage', page: number): void
}>()

const PAGE_KEY = 'recommend-page'
const router = useRouter()
const recommendUIStore = useRecommendUIStore()
const h5LongVideoStore = useH5LongVideoStore();
const currentPage = ref(1) // 当前页码

const visibleGroups = computed(() => {
  return (props.groups || []).map(group => ({
    id: group.id,
    name: group.name,
    icon: group.icon,
    mainId: Array.isArray(group.videos) && group.videos[0] ? group.videos[0].id : 0,
    mainImage: Array.isArray(group.videos) && group.videos[0] ? group.videos[0].cover : '',
    mainTitle: Array.isArray(group.videos) && group.videos[0] ? group.videos[0].title : '',
    mainTags: Array.isArray(group.videos) && group.videos[0] && group.videos[0].tags ? [group.videos[0].tags[0]] : [],
    mainViews: Array.isArray(group.videos) && group.videos[0] ? group.videos[0].play_count ?? 0 : 0,
    mainDuration: Array.isArray(group.videos) && group.videos[0] ? group.videos[0].duration ?? 0 : 0,
    mainVip: Array.isArray(group.videos) && group.videos[0] ? !!(group.videos[0].vip ?? group.videos[0].is_vip) : false,
    mainCoin: Array.isArray(group.videos) && group.videos[0] ? group.videos[0].coin ?? 0 : 0,
    src: '',
    subImages: Array.isArray(group.videos)
      ? group.videos.slice(1, 5).map(item => ({
          id: item.id,
          cover: item.cover,
          src: '',
          title: item.title,
          tags: item.tags && item.tags.length ? [item.tags[0]] : [],
          views: item.play_count ?? 0,
          duration: item.duration ?? 0,
          coin: item.coin ?? 0,
          vip: !!(item.vip ?? item.is_vip)
        }))
      : []
  }))
})

function getScrollContainer() {
  let el = document.querySelector('.recommend-page');
  while (el && el.parentElement) {
    el = el.parentElement;
    if (el.classList && el.classList.contains('slide-content')) {
      return el;
    }
  }
  return null;
}

const emitGoToMore = (groupId: number, groupName: string) => {
  const scrollContainer = getScrollContainer();
  if (scrollContainer) {
    sessionStorage.setItem('recommend-scroll-top', scrollContainer.scrollTop.toString());
    sessionStorage.setItem('recommend-current-page', currentPage.value.toString());
    sessionStorage.setItem('recommend-groups', JSON.stringify(props.groups));
  }

  router.push({
    path: '/list',
    query: {
      groupId,
      type: 'group',
      cat: groupName,
      page: currentPage.value
    }
  });
}

function emitRefreshGroup(groupId: number) {
  emit('refreshGroup', groupId)
}
const emitClickItem = (video: any) => emit('clickItem', video)

watch(currentPage, (newPage) => {
  recommendUIStore.setCurrentPage(PAGE_KEY, newPage)
})

onMounted(() => {
  const cacheScroll = sessionStorage.getItem('recommend-scroll-top');
  const cachePage = sessionStorage.getItem('recommend-current-page');
  const cacheGroups = sessionStorage.getItem('recommend-groups');

  if (cacheGroups && cachePage) {
    const groups = JSON.parse(cacheGroups);
    h5LongVideoStore.groups = groups;
    h5LongVideoStore.currentPage = Number(cachePage);
    h5LongVideoStore.lastFetchTime = Date.now();
    currentPage.value = Number(cachePage);

    nextTick(() => {
      setTimeout(() => {
        const scrollContainer = getScrollContainer();
        if (scrollContainer) {
          scrollContainer.scrollTop = Number(cacheScroll) || 0;
        }
        sessionStorage.removeItem('recommend-scroll-top');
        sessionStorage.removeItem('recommend-current-page');
        sessionStorage.removeItem('recommend-groups');
      }, 100);
    });
  }
});
</script>

<style scoped>
.recommend-page {
  padding: 0 3.2vw;
  box-sizing: border-box;
}
.recommend-group-block {
  margin-bottom: 5.3vw;
}
</style>