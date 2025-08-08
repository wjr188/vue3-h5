<template>
  <div :class="['top-bar', { 'darknet-top-bar': darkMode }]">
    <!-- 分类导航 -->
    <div class="nav-container">
      <div class="nav-row" ref="navRow">
        <div
          v-for="(cat, index) in categories"
          :key="index"
          :ref="el => navItems[index] = el as HTMLElement"
          class="nav-item"
          :class="{ active: activeIndex === index }"
          @click="selectCategory(index, cat.name)"
        >
          <span>{{ cat.name }}</span>
          <img v-if="cat.icon" :src="`/icons/${cat.icon}`" class="icon" />
        </div>
      </div>
      <div class="nav-menu-btn" @click="showDrawer = true">
        <img src="/icons/menu.svg" alt="菜单" />
      </div>
    </div>

    <div class="sub-row">
      <div class="search-bar">
        <input
          type="text"
          v-model="searchInput"
          readonly
          @focus="goToSearch"
        />
        <div class="placeholder" v-if="!searchInput">
          {{ placeholderTexts[currentPlaceholder] }}
        </div>
        <span class="search-icon">🔍</span>
      </div>
      <div class="icon-btn" @click="goToVip">
        <img src="/icons/vip1.svg" alt="VIP" />
      </div>
      <div class="icon-btn" @click="goToAllCategories">
        <img src="/icons/app.svg" alt="导航" />
      </div>
    </div>

    <SideDrawer
      :visible="showDrawer"
      :list="categories"
      :active="categories[activeIndex]?.name"
      @close="showDrawer = false"
      @select="onDrawerSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed, type CSSProperties, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import SideDrawer from './SideDrawer.vue'

interface Category {
  name: string
  icon?: string
}

const props = defineProps<{
  categories: Category[]
  activeCategory?: string
  darkMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'categoryChange', name: string): void
}>()

const router = useRouter()

const activeIndex = ref(0)
const navItems = ref<(HTMLElement | null)[]>([])
const showDrawer = ref(false)
const navRow = ref<HTMLElement | null>(null)

function selectCategory(index: number, name: string) {
  activeIndex.value = index
  scrollActiveIntoView(index)
  emit('categoryChange', name)
}

function onDrawerSelect(name: string) {
  const index = props.categories.findIndex(c => c.name === name)
  if (index !== -1) {
    selectCategory(index, name)
  }
}

function goToSearch() {
  // 判断当前是否暗网模式
  if (props.darkMode) {
    router.push({ path: '/search-popup', query: { type: 'darknet' } })
  } else {
    router.push({ path: '/search-popup', query: { type: 'long' } })
  }
}
function goToVip() {
  router.push('/vip')
}
function goToAllCategories() {
  if (props.darkMode) {
    router.push({ path: '/all-categories', query: { type: 'darknet' } })
  } else {
    router.push({ path: '/all-categories', query: { type: 'long' } })
  }
}

function scrollActiveIntoView(index: number) {
  const el = navItems.value[index]
  const parent = navRow.value
  if (el && parent) {
    const parentRect = parent.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const offset = el.offsetLeft - parent.offsetLeft - (parentRect.width / 2) + (elRect.width / 2)
    parent.scrollTo({ left: offset, behavior: 'smooth' })
  }
}

watch(
  () => props.activeCategory,
  (newName) => {
    const idx = props.categories.findIndex(cat => cat.name === newName)
    if (idx >= 0 && idx !== activeIndex.value) {
      activeIndex.value = idx
      nextTick(() => scrollActiveIntoView(idx))
    }
  }
)

let startX = 0

onMounted(() => {
  if (props.activeCategory) {
    const idx = props.categories.findIndex(cat => cat.name === props.activeCategory)
    if (idx >= 0) {
      activeIndex.value = idx
      nextTick(() => scrollActiveIntoView(idx))
    }
  }

  const area = document.querySelector('.top-bar') as HTMLElement | null
  if (area) {
    area.addEventListener('touchstart', (e: TouchEvent) => {
      startX = e.touches[0].clientX
    }, { passive: true })

    area.addEventListener('touchend', (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX
      const diff = endX - startX
      if (Math.abs(diff) < 12) return
      if ((e.target as HTMLElement).closest('.nav-row') || (e.target as HTMLElement).closest('.sub-row')) return
      if (diff < -12 && activeIndex.value < props.categories.length - 1) {
        selectCategory(activeIndex.value + 1, props.categories[activeIndex.value + 1].name)
      } else if (diff > 12 && activeIndex.value > 0) {
        selectCategory(activeIndex.value - 1, props.categories[activeIndex.value - 1].name)
      }
    }, { passive: true })
  }
})

const sliderStyle = computed<CSSProperties>(() => {
  const el = navItems.value[activeIndex.value]
  if (!el) return { width: '0' }
  return {
    width: '5.33vw',
    height: '0.8vw',
    backgroundColor: '#f12c2c',
    borderRadius: '0.53vw',
    position: 'absolute',
    bottom: '0',
    left: `${el.offsetLeft + (el.offsetWidth / 2) - 2.66}px`,
    transition: 'left 0.3s ease'
  }
})

// 搜索占位轮播
const placeholderTexts = [
  '黑料·吃瓜·破解·流出',
  '偷拍·学生·缅北·破处',
  '母子·父女·换妻·孕妇',
  '男同·女同·小萝莉·原神',
  '兽父·重口·猎奇·迷奸'
]
const currentPlaceholder = ref(0)
const searchInput = ref('')
let timer: number | undefined

onMounted(() => {
  timer = window.setInterval(() => {
    currentPlaceholder.value = (currentPlaceholder.value + 1) % placeholderTexts.length
  }, 3000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.top-bar {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  background: #8c3b3b;
  z-index: 1000;
}
.darknet-top-bar {
  background-color: rgba(0,0,0,0.6);
  backdrop-filter: blur(2.66vw);
  -webkit-backdrop-filter: blur(2.66vw);
  color: white;
}
.nav-container {
  display: flex;
  align-items: center;
  padding: 1vw 3.2vw 0;
}
.nav-row {
  display: flex;
  overflow-x: auto;
  flex: 1;
  gap: 4.8vw;
  position: relative;
}
.nav-row::-webkit-scrollbar {
  display: none;
}
.nav-item {
  font-size: 4.26vw;
  line-height: 1.4;
  font-weight: 400;
  white-space: nowrap;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #fff;
}
.darknet-top-bar .nav-item {
  color: #fff;
}
.nav-item.active {
  color: #fbeee0;
  font-weight: 600;
  font-size: 4.8vw;
}
.icon {
  width: 4.26vw;
  height: 4.26vw;
  margin-left: 1.06vw;
}
.nav-menu-btn {
  flex-shrink: 0;
  margin-left: 2.66vw;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 8.53vw;
  height: 8.53vw;
}
.nav-menu-btn img {
  width: 5.86vw;
  height: 5.86vw;
  opacity: 0.85;
  display: block;
}
.sub-row {
  display: flex;
  align-items: center;
  padding: 2vw 3.2vw;
  gap: 2.66vw;
}
.search-bar {
  position: relative;
  flex: 1;
  background: #f5f5f5;
  border-radius: 5.33vw;
  padding: 1.6vw 3.2vw;
  display: flex;
  align-items: center;
  font-size: 3.73vw;
  color: #666;
}
.darknet-top-bar .search-bar {
  background: rgba(255,255,255,0.2);
  color: white;
}
.search-bar input {
  border: none;
  outline: none;
  background: transparent;
  flex: 1;
  color: inherit;
  z-index: 1;
}
.placeholder {
  position: absolute;
  left: 3.2vw;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #999;
  font-size: 3.73vw;
  white-space: nowrap;
  animation: fadein 0.3s ease;
}
@keyframes fadein {
  from { opacity: 0; }
  to { opacity: 1; }
}
.search-icon {
  margin-left: 1.6vw;
}
.icon-btn img {
  width: 8vw;
  height: 8vw;
  border-radius: 1.6vw;
}
</style>
