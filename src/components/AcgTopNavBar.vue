<template>
  <div class="acg-top-bar">
    <div class="nav-container">
      <div class="nav-row" ref="navRow">
        <div
          v-for="(cat, index) in categories"
          :key="index"
:ref="el => navItems[index] = (el as HTMLElement | null)"

          class="nav-item"
          :class="{ active: activeCategory === cat }"
          @click="selectCategory(cat)"
        >
          <span>{{ cat }}</span>
        </div>
        <div class="slider-bar" :style="sliderStyle"></div>
      </div>
      <div class="nav-menu-btn" @click="showDrawer = true">
        <img src="/icons/menu.svg" alt="菜单" />
      </div>
    </div>

    <div class="sub-row">
      <div class="search-bar" @click="goToSearch">
  <input type="text" :placeholder="placeholder" readonly />
  <span class="search-icon">🔍</span>
</div>


      <div class="icon-btn" @click="goToVip">
        <img src="/icons/vip1.svg" alt="VIP" />
      </div>

      <div class="icon-btn" @click="goToMyShelf">
        <img src="/icons/shelf.svg" alt="书架" />
      </div>
    </div>

    <SideDrawer
      :visible="showDrawer"
      :list="drawerList"
      :active="activeCategory"
      @close="showDrawer = false"
      @select="onDrawerSelect"
    />
  </div>
</template>
<script setup lang="ts">
import { ref, computed, watch, nextTick, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import SideDrawer from '@/components/SideDrawer.vue'

interface DrawerItem {
  name: string
}

const props = defineProps<{
  categories: string[]
  activeCategory: string
  placeholder?: string
  mainTab: string
}>()
const emit = defineEmits<{
  (e: 'categoryChange', name: string): void
  (e: 'beforeSearch'): void
}>()

const router = useRouter()

// navItems是一个数组，里面每个是HTMLElement或undefined
const navItems: Ref<(HTMLElement | null)[]> = ref([])
const navRow = ref<HTMLElement | null>(null)
const showDrawer = ref(false)

const drawerList = computed<DrawerItem[]>(() => {
  return props.categories.map(item => ({ name: item }))
})

function selectCategory(name: string) {
  emit('categoryChange', name)
}

function onDrawerSelect(name: string) {
  selectCategory(name)
  showDrawer.value = false
}
function goToSearch() {
  // ---- 只清理搜一搜tab缓存，不影响库tab和入口页缓存 ----
  clearSearchTabCache()
  
  // 记录入口来源，照旧
  sessionStorage.setItem('search-entry-path', window.location.pathname + window.location.search)
  sessionStorage.setItem('search-entry-scroll', (window.scrollY || document.documentElement.scrollTop || 0) + '')
  sessionStorage.setItem('acg-return-tab', props.mainTab)
  sessionStorage.setItem('acg-return-sub', props.activeCategory)
  
  // 跳转
  router.push({
    path: '/search-main',
    query: { activeTab: props.mainTab }
  })
}

// 新增：只清理“搜一搜”tab的缓存（你页面用到哪些就写哪些）
function clearSearchTabCache() {
  // sessionStorage 部分
  sessionStorage.removeItem('search-main-searching')
  sessionStorage.removeItem('search-main-search-list')
  sessionStorage.removeItem('search-main-search-keyword')
  sessionStorage.removeItem('search-main-search-page')
  sessionStorage.removeItem('search-main-search-total')
  // ... 其它你搜一搜页面缓存用到的 key，都可以一起加进来

  // localStorage 搜索历史（如果你想进入页就清空历史，可以加下面几行。不想清空就不加）
  // localStorage.removeItem('searchHistory_漫画')
  // localStorage.removeItem('searchHistory_小说')
  // localStorage.removeItem('searchHistory_动漫')
  // localStorage.removeItem('searchHistory_有声')
}

function goToMyShelf() {
  router.push({ name: 'MyFavorites' })
}


function goToVip() {
  router.push('/vip')
}

watch(
  () => props.activeCategory,
  (newName) => {
    const idx = props.categories.findIndex(cat => cat === newName)
    if (idx >= 0) {
      nextTick(() => scrollActiveIntoView(idx))
    }
  },
  { immediate: true }
)

function scrollActiveIntoView(index: number) {
  const el = navItems.value[index]
  const parent = navRow.value
  if (el && parent) {
    const parentRect = parent.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const offset =
      el.offsetLeft -
      parent.offsetLeft -
      parentRect.width / 2 +
      elRect.width / 2
    parent.scrollTo({ left: offset, behavior: 'smooth' })
  }
}

const sliderStyle = computed(() => {
  const index = props.categories.findIndex(cat => cat === props.activeCategory)
  const el = navItems.value[index]
  if (!el) return { width: '0px' }

  const fixedWidthPx = 20 // 固定像素，可改
  const centerX = el.offsetLeft + el.offsetWidth / 2

  return {
    width: `${fixedWidthPx}px`,
    left: `${centerX - fixedWidthPx / 2}px`,
    transition: 'left 0.3s ease, width 0.3s ease'
  }
})


</script>
<style scoped>
.acg-top-bar {
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1000;
  margin-top: -1vw; /* 👈 这里就是整体往上移 */
}

.nav-container {
  display: flex;
  align-items: center;
  padding: 1.0667vw 3.2vw; /* 4px 12px */
}
.nav-row {
  display: flex;
  overflow-x: auto;
  flex: 1;
  gap: 3vw; /* 18px */
  position: relative;
}
.nav-row::-webkit-scrollbar {
  display: none;
}
.nav-item {
  font-size: 4.2667vw; /* 16px */
  line-height: 1.4;
  font-weight: 400;
  white-space: nowrap;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #222;
}
.nav-item.active {
  color: #f12c2c;
  font-weight: 600;
  font-size: 4.8vw; /* 18px */
}
.slider-bar {
  height: 0.8vw; /* 3px */
  background-color: #f12c2c;
  border-radius: 0.5333vw; /* 2px */
  position: absolute;
  bottom: 0;
  transition: all 0.3s ease;
}
.nav-menu-btn {
  flex-shrink: 0;
  margin-left: 2.6667vw; /* 10px */
  width: 8.5333vw; /* 32px */
  height: 8.5333vw;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-menu-btn img {
  width: 5.8667vw; /* 22px */
  height: 5.8667vw;
  opacity: 0.85;
}
.sub-row {
  display: flex;
  align-items: center;
  padding: 1.8vw 3.2vw;
  gap: 2.6667vw;
  margin-top: -2vw;
}

.search-bar {
  flex: 1;
  background: #f5f5f5;
  border-radius: 5.3333vw; /* 20px */
  padding: 1.6vw 3.2vw; /* 6px 12px */
  display: flex;
  align-items: center;
  font-size: 3.7333vw; /* 14px */
  color: #666;
  cursor: pointer;
}
.search-bar input {
  border: none;
  outline: none;
  background: transparent;
  flex: 1;
  color: inherit;
}
.search-icon {
  margin-right: 1.6vw; /* 6px */
}
.icon-btn img {
  width: 7.4667vw; /* 28px */
  height: 7.4667vw;
  border-radius: 1.6vw; /* 6px */
}
.search-bar input::placeholder {
  color: #aaa;          /* 浅灰色 */
  font-size: 3.4667vw;  /* 稍微小一点的字号 */
  font-weight: 400;     /* 常规字重 */
}

</style>
