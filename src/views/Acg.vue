<template>
  <div class="acg-wrapper">
    <!-- 顶部固定栏 -->
    <div class="top-category-fixed">
      <div
        v-for="item in topCategories"
        :key="item"
        :class="['category-item', { active: activeTab === item }]"
        @click="handleTopCategoryChange(item)"
      >
        <div class="star" v-if="activeTab !== item"><img src="/icons/star1.svg" /></div>
        <div class="active-star" v-if="activeTab === item"><img src="/icons/star1.svg" /></div>
        <div class="category-text">{{ item }}</div>
      </div>
    </div>
    <div class="sub-category-fixed">
      <AcgTopNavBar
        :categories="subCategories"
        :activeCategory="activeSubCategory"
        :mainTab="activeTab"
        placeholder="漫画·动漫·小说·有声"
        @categoryChange="handleSubCategoryChange"
        @beforeSearch="saveCurrentScroll"
      />
    </div>

    <!-- Swiper: 每个 slide 独立滚动 -->
    <div class="acg-swiper-wrap">
      <Swiper
        ref="swiperRef"
        :slides-per-view="1"
        :initial-slide="currentIndex"
        :no-swiping="true"
        noSwipingClass="swiper-no-swiping"
        :resistance-ratio="0.35"
        :threshold="20"
        @slideChange="onSlideChange"
        @swiper="onSwiperReady"
      >
        <SwiperSlide v-for="(name, idx) in subCategories" :key="name">
  <div
    class="slide-content"
    :ref="el => setSlideRef(el, idx)"
    @scroll.passive="recordScroll(name, idx)"
  >
    <Banner :key="bannerKey + '-' + name" />
    <NoticeBar />
    <component
      :is="getComponent(name)"
      v-bind="getComponentProps(name, idx)" 
    />
  </div>
</SwiperSlide>

      </Swiper>
    </div>

    <TabBar />
  </div>
</template>
<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, ComponentPublicInstance, onActivated } from 'vue'
import type { Swiper as SwiperInstance } from 'swiper'
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/swiper-bundle.css'

import Banner from '@/components/Banner.vue'
import NoticeBar from '@/components/NoticeBar.vue'
import TabBar from '@/components/TabBar.vue'
import AcgTopNavBar from '@/components/AcgTopNavBar.vue'
import AcgComic from './AcgComic.vue'
import AcgComicRecommend from './AcgComicRecommend.vue'
import AcgAnime from './AcgAnime.vue'
import AcgNovel from './AcgNovel.vue'
import AcgNovelRecommend from './AcgNovelRecommend.vue'
import AcgAudio from './AcgAudio.vue'
import AcgAudioRecommend from './AcgAudioRecommend.vue'
import AcgAnimeRecommend from './AcgAnimeRecommend.vue'

import { useComicCategoryStore } from '@/store/comicCategoryStore'
import { useNovelCategoryStore } from '@/store/novelStore'
import { animeSubCategories } from '@/constants/animeSubCategories.js'
import { audioSubCategories } from '@/constants/audioSubCategories.js'
import { comicSubCategories } from '@/constants/comicSubCategories.js'

const comicModules = import.meta.glob('/src/mock/acg/comic/*.js', { eager: true })
const animeModules = import.meta.glob('/src/mock/acg/anime/*.js', { eager: true })
const audioModules = import.meta.glob('/src/mock/acg/audio/*.js', { eager: true })
const slideRefs = ref<(Element | ComponentPublicInstance | null)[]>([])
function getDefault(mod: unknown): any[] {
  if (!mod) return []
  return (mod as { default: any[] }).default ?? []
}

const topCategories = ['漫画', '动漫', '小说', '有声'] as const
type TopCategory = (typeof topCategories)[number]

const activeTab = ref<TopCategory>('漫画')
const swiperRef = ref()
const swiperInstance = ref<SwiperInstance | null>(null)
const currentIndex = ref<number>(0)
const bannerKey = ref(0)

const categoryStore = useComicCategoryStore()
const novelCategoryStore = useNovelCategoryStore()

// ⭐ 监听tab切换到“小说”才拉小说分类，只拉一次
watch(
  activeTab,
  async (val) => {
    if (
      val === '小说' &&
      novelCategoryStore.mainCategories.length === 0 &&
      !novelCategoryStore.loading
    ) {
      await novelCategoryStore.fetchCategoryList()
    }
  },
  { immediate: false }
)

const subCategories = computed<string[]>(() => {
  if (activeTab.value === '漫画') {
    return ['推荐', ...categoryStore.mainCategories.map(c => c.name)]
  }
  if (activeTab.value === '动漫') {
    return ['推荐', ...animeSubCategories.map(i => (typeof i === 'string' ? i : i.label))]
  }
  if (activeTab.value === '小说') {
    return ['推荐', ...novelCategoryStore.mainCategories.map(i => i.name)]
  }
  if (activeTab.value === '有声') {
    return ['推荐', ...audioSubCategories.map(i => (typeof i === 'string' ? i : i.label))]
  }
  return []
})

const activeSubCategory = computed<string>(() => subCategories.value[currentIndex.value] ?? subCategories.value[0])

function setSlideRef(el: Element | ComponentPublicInstance | null, idx: number) {
  slideRefs.value[idx] = el
}

function recordScroll(name: string, idx: number) {
  const el = slideRefs.value[idx]
  if (el && el instanceof HTMLElement) {
    sessionStorage.setItem(`acg-scroll-${activeTab.value}-${name}`, el.scrollTop.toString())
  }
}
function restoreScroll(idx: number, name: string) {
  nextTick(() => {
    const el = slideRefs.value[idx]
    if (!el || !(el instanceof HTMLElement)) return
    const key = `acg-scroll-${activeTab.value}-${name}`
    const saved = sessionStorage.getItem(key)
    const wantScroll = saved ? parseInt(saved) : 0
    let count = 0
    function tryRestore() {
      if (!el || !(el instanceof HTMLElement)) return
      if (Math.abs(el.scrollTop - wantScroll) < 2 || count > 30) return
      el.scrollTop = wantScroll
      count++
      setTimeout(tryRestore, 32)
    }
    tryRestore()
  })
}
function saveCurrentScroll() {
  const idx = currentIndex.value
  const name = subCategories.value[idx]
  const el = slideRefs.value[idx]
  if (el && el instanceof HTMLElement) {
    sessionStorage.setItem(`acg-scroll-${activeTab.value}-${name}`, el.scrollTop + '')
  }
}

watch(activeTab, () => {
  currentIndex.value = 0
  nextTick(() => {
    swiperInstance.value?.slideTo(0, 0)
    restoreScroll(0, subCategories.value[0])
  })
}, { immediate: true })

function onSwiperReady(swiper: SwiperInstance) {
  swiperInstance.value = swiper
}

function handleTopCategoryChange(item: TopCategory) {
  activeTab.value = item
}
function handleSubCategoryChange(name: string) {
  const idx = subCategories.value.indexOf(name)
  if (idx >= 0) {
    currentIndex.value = idx
    swiperInstance.value?.slideTo(idx, 0)
    bannerKey.value++
    restoreScroll(idx, name)
  }
}
function onSlideChange(swiper: SwiperInstance) {
  currentIndex.value = swiper.activeIndex
  const name = subCategories.value[swiper.activeIndex]
  restoreScroll(swiper.activeIndex, name)

  // 漫画逻辑
  if (activeTab.value === '漫画' && name !== '推荐') {
    const mainCategory = categoryStore.mainCategories.find(c => c.name === name)
    if (mainCategory && !categoryStore.getSubCategories(mainCategory.id).length) {
      categoryStore.loadSubCategoriesWithComics(mainCategory.id, 9)
    }
  }

  // 小说逻辑
  if (activeTab.value === '小说' && name !== '推荐') {
    const mainCategory = novelCategoryStore.mainCategories.find(c => c.name === name)
    if (mainCategory && !novelCategoryStore.categoryNovelMap[name]) {
      novelCategoryStore.loadNovelsByCategory(name, mainCategory.id, 1, 15)
    }
  }
}


const dataMap = computed<Record<string, any[]>>(() => {
  const map: Record<string, any[]> = {}
  if (activeTab.value === '漫画') {
    comicSubCategories.forEach(item => {
      const label = item.label
      const key = item.key
      const path = `/src/mock/acg/comic/${key}.js`
      map[label] = getDefault(comicModules[path])
    })
  }
  if (activeTab.value === '有声') {
    audioSubCategories.forEach(item => {
      const label = item.label
      const key = item.key
      const path = `/src/mock/acg/audio/${key}.js`
      map[label] = getDefault(audioModules[path])
    })
  }
  if (activeTab.value === '动漫') {
    animeSubCategories.forEach(item => {
      const label = item.label
      const key = item.key
      const path = `/src/mock/acg/anime/${key}.js`
      map[label] = getDefault(animeModules[path])
    })
  }
  return map
})

function getComponent(name: string) {
  if (activeTab.value === '漫画') return name === '推荐' ? AcgComicRecommend : AcgComic
  if (activeTab.value === '动漫') return name === '推荐' ? AcgAnimeRecommend : AcgAnime
  if (activeTab.value === '小说') return name === '推荐' ? AcgNovelRecommend : AcgNovel
  if (activeTab.value === '有声') return name === '推荐' ? AcgAudioRecommend : AcgAudio
  return AcgComic
}
function getComponentProps(name: string, idx?: number) {
  const data = dataMap.value[name]
  let parentCategoryId: number | undefined = undefined
  if (activeTab.value === '漫画' && name !== '推荐') {
    const mainCategory = categoryStore.mainCategories.find(c => c.name === name)
    parentCategoryId = mainCategory?.id
  }
  let novels = undefined
  if (activeTab.value === '小说' && name !== '推荐') {
    novels = novelCategoryStore.categoryNovelMap[name] ?? []
  }
  // ⭐ 小说 parentCategoryId（如有需要可参照漫画方式加逻辑）
  return {
    categoryTitle: name,
    activeTab: activeTab.value,
    activeSubCategory: name,
    comics: activeTab.value === '漫画' ? data : undefined,
    animes: activeTab.value === '动漫' ? data : undefined,
    novels: activeTab.value === '小说' ? novels : undefined,
    audios: activeTab.value === '有声' ? data : undefined,
    scrollContainerRef: { value: slideRefs.value[idx!] as HTMLElement | null },
    parentCategoryId: parentCategoryId
  }
}
onActivated(() => {
  const tab = sessionStorage.getItem('acg-return-tab')
  const sub = sessionStorage.getItem('acg-return-sub')

  const cleanup = () => {
    sessionStorage.removeItem('acg-return-tab')
    sessionStorage.removeItem('acg-return-sub')
    sessionStorage.removeItem('acg-more-scroll-top')
  }

  const handleSubCategoryRestore = (sub: string | null) => {
    if (!sub) {
      cleanup()
      return
    }

    const idx = subCategories.value.indexOf(sub)
    if (idx === -1) {
      cleanup()
      return
    }

    if (currentIndex.value !== idx) {
      currentIndex.value = idx
      
      nextTick(() => {
        if (swiperInstance.value?.activeIndex !== idx) {
          swiperInstance.value?.slideTo(idx, 300)
        }
        
        const el = slideRefs.value[idx]
        const savedPos = sessionStorage.getItem('acg-more-scroll-top')
        
        if (el && el instanceof HTMLElement && savedPos) {
          let attempts = 0
          const tryScroll = () => {
            if (attempts > 30) return
            
            if (el.scrollHeight > 100) {
              el.scrollTop = parseInt(savedPos)
              if (Math.abs(el.scrollTop - parseInt(savedPos)) > 5) {
                requestAnimationFrame(tryScroll)
              }
            } else {
              requestAnimationFrame(tryScroll)
            }
            attempts++
          }
          requestAnimationFrame(tryScroll)
        }
        
        cleanup()
      })
    } else {
      cleanup()
    }
  }

  if (tab && activeTab.value !== tab) {
    activeTab.value = tab as TopCategory
    nextTick(() => handleSubCategoryRestore(sub))
  } else if (sub) {
    handleSubCategoryRestore(sub)
  } else {
    cleanup()
  }
})
onMounted(() => {
  restoreScroll(currentIndex.value, subCategories.value[0])
})
onMounted(() => {
  categoryStore.loadCategories({ onlyMain: 1 })
})


</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=ZCOOL+QingKe+HuangYou&display=swap');

.acg-wrapper {
  background: #f8f8f8;
  padding-bottom: 16vw;
  position: relative;
  height: 100vh;
  overflow: hidden; /* 禁止主页面滚动，交给slide-content滚动 */
}
.top-category-fixed {
  position: fixed;
  top: 0;
  z-index: 999;
  background: #fff;
  width: 100%;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 5.3vw 0;
  height: 12.8vw;
}
.sub-category-fixed {
  position: fixed;
  top: 12vw;
  z-index: 998;
  background: #fff;
  width: 100%;
  height: 13.3vw;
}
.acg-swiper-wrap {
  padding-top: 32vw;
  height: calc(100vh - 10vw);
}
.swiper {
  height: 100%;
}
.swiper-slide {
  height: 100%;
  overflow: hidden;
  background: #f8f8f8;
}
.slide-content {
  height: 100%;
  overflow-y: auto;
  background: #f8f8f8;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.slide-content::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
}
.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  position: relative;
  background: none;
  border-radius: 0;
  padding: 0;
}
.star {
  position: absolute;
  top: 1.1vw;
  left: 1.3vw;
  width: 3.2vw;
  height: 3.2vw;
}
.star img {
  width: 100%;
  height: 100%;
}
.category-text {
  font-family: 'ZCOOL QingKe HuangYou', sans-serif;
  font-size: 5.9vw;
  color: #fff;
  transform: scaleX(1.25) scaleY(0.85) translateY(1.1vw);
  margin-top: -2.7vw;
  text-shadow:
    0.5vw 0.5vw 0 #666,
    -0.5vw -0.5vw 0 #666,
    0.5vw -0.5vw 0 #666,
    -0.5vw 0.5vw 0 #666,
    0 0.5vw 0 #666,
    0.5vw 0 0 #666,
    0 -0.5vw 0 #666,
    -0.5vw 0 0 #666;
  padding: 2.7vw 5.3vw;
  z-index: 2;
  position: relative;
}
.category-item.active {
  position: relative;
}
.active-star {
  position: absolute;
  top: -1.9vw;
  left: 50%;
  transform: translateX(-50%) rotate(35deg);
  width: 5.3vw;
  height: 8vw;
  z-index: 10;
}
.category-item.active::before {
  content: "";
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-3deg);
  width: 18.7vw;
  height: 8vw;
  background: #ff4b4b;
  border-radius: 1.3vw;
  z-index: 1;
  box-shadow: 0 1.3vw 0 #ffa500;
}
.category-item.active .category-text {
  color: #fff;
}
</style>
