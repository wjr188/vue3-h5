<template>
  <div class="tiktok-page">
    <!-- 顶部栏 -->
    <div class="top-bar">
      <img src="/icons/back.svg" class="top-icon back" @click="goBack" />
      <div class="tab-group">
        <span
          :class="['tab-item', activeTab === 'discover' ? 'active' : '']"
          @click="switchTab('discover')"
        >发现</span>
        <span
          :class="['tab-item', activeTab === 'recommend' ? 'active' : '']"
          @click="switchTab('recommend')"
        >推荐</span>
      </div>
      <img src="/icons/search.svg" class="top-icon search" @click="goToSearch" />
    </div>

    <!-- 页面内容 -->
    <div class="page-content">
      <Suspense>
        <keep-alive>
          <component :is="activeTabComponent" :category="route.query.category || '最新'" />
        </keep-alive>
      </Suspense>
    </div>

    <!-- ✅ 底部导航栏 -->
    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TiktokDiscover from './TiktokDiscover.vue'
import TiktokRecommend from './TiktokRecommend.vue'
import TabBar from '../components/TabBar.vue'

// 定义组件名，确保 keep-alive 能正确识别
defineOptions({
  name: 'Tiktok'
})

const route = useRoute()
const router = useRouter()

type TabType = 'discover' | 'recommend'

const activeTab = ref<TabType>(
  route.query.tab === 'discover' ? 'discover' : 'recommend'
)

const currentCategory = ref<string>(
  (route.query.category as string) || '最新'
)

watch(
  () => route.query.tab,
  (tab) => {
    if (tab === 'discover' || tab === 'recommend') {
      activeTab.value = tab
    }
  }
)

watch(
  () => route.query.category,
  (category) => {
    if (typeof category === 'string') {
      currentCategory.value = category
    }
  }
)

function switchTab(tab: TabType) {
  if (tab !== activeTab.value) {
    router.replace({
      path: '/tiktokIndex',
      query: { tab, category: currentCategory.value }
    })
  }
}

function goBack() {
  if (route.query.from === 'discover') {
    router.push({
      path: '/tiktokIndex',
      query: { tab: 'discover', category: currentCategory.value }
    })
  } else {
    router.back()
  }
}

function goToSearch() {
  router.push('/search')
}

const activeTabComponent = computed(() =>
  activeTab.value === 'discover' ? TiktokDiscover : TiktokRecommend
)
</script>

<style scoped>
.tiktok-page {
  background: #000;
  position: relative;
  /* 不要写flex，swiper这类不能用flex！ */
}
/* 顶部导航栏 */
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 14.93vw; /* 56px */
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2.66vw 4.26vw; /* 10px 16px */
  background: #000;
}

/* Tab文字切换 */
.tab-group {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 5.33vw; /* 20px */
}
.tab-item {
  font-size: 4.8vw; /* 18px */
  font-weight: bold;
  color: #999;
  cursor: pointer;
}
.tab-item.active {
  color: #fff;
}
.top-icon {
  width: 6.93vw; /* 26px */
  height: 6.93vw;
}

/* ✅ 内容区域需要让出顶部和底部空间 */
.page-content {
  flex: 1 0 auto;
  min-height: 0;    /* 兼容性写上，防止内容撑溢 */
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  /* 不加height: 100vh，不加padding-top/bottom */
  overflow: hidden;  /* 根据你实际需求决定要不要 */
}
</style>
