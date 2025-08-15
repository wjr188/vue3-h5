<template>
  <div class="favorites-page">
    <!-- 顶部导航栏 - 添加吸顶效果 -->
    <van-nav-bar
      title="我的收藏"
      left-arrow
      fixed
      @click-left="$router.back()"
    >
      <template #right>
        <span class="nav-btn" @click="toggleManage">
          {{ isManaging ? '完成' : '管理' }}
        </span>
      </template>
    </van-nav-bar>

    <!-- 添加顶部占位，避免内容被固定导航栏遮挡 -->
    <div class="nav-placeholder"></div>

    <!-- 分类横滑标签 -->
    <van-tabs
      v-model:active="activeCategoryIndex"
      background="#f8f8f8"
      line-width="20px"
      color="#f14b4b"
      @change="onTabChange"
    >
      <van-tab v-for="(tab, index) in categories" :title="tab.label" :key="index" :name="index">
      </van-tab>
    </van-tabs>

    <!-- 分类内容滑动区域 - 修复触摸冲突 -->
    <van-swipe
      ref="swipeRef"
      v-model="activeCategoryIndex"
      :loop="false"
      :lazy-render="false"
      :touchable="true"
      :show-indicators="false"
      :prevent-default="false"
      @change="onSwipeChange"
    >
      <van-swipe-item v-for="(tab, index) in categories" :key="tab.key">
        <div class="swipe-content">
          <div class="favorites-list">
            <!-- 视频tab的二级筛选 - 只在当前激活的视频tab显示 -->
            <div v-if="activeCategoryIndex === index && tab.key === 'video'" class="video-filters">
            <div class="filter-tabs">
              <div 
                v-for="filter in videoFilters" 
                :key="filter.key"
                class="filter-tab"
                :class="{ active: activeVideoFilter === filter.key }"
                @click="onFilterChange(filter.key)"
              >
                {{ filter.label }}
              </div>
            </div>
          </div>

          <!-- 视频tab的卡片列表 - 独立分支 -->
          <div v-if="tab.key === 'video'">
             <!-- 管理状态下显示全选按钮 -->
             <div v-if="isManaging" class="select-actions">
               <span @click="toggleSelectAll">{{ isAllSelected ? '取消全选' : '全选' }}</span>
             </div>
             
             <!-- 首次加载状态 -->
             <van-loading 
               v-if="isLoading && filteredVideos.length === 0" 
               size="24px" 
               vertical
               style="margin: 50px auto;"
             >
               加载中...
             </van-loading>
             
             <template v-else-if="filteredVideos.length > 0">
               <!-- 视频卡片列表 - 无van-list包装 -->
               <div
                 v-for="item in filteredVideos"
                 :key="item.id"
                 class="video-card"
                 :class="{ selected: selectedIds.includes(item.id) }"
                 @click="isManaging ? toggleItemSelect(item.id) : goToVideoDetail(item)"
               >
                 <!-- 封面图 -->
                 <div class="video-cover">
                   <img :src="item.cover" alt="封面" />
                   <div class="duration-badge">{{ item.duration }}</div>
                   <!-- 管理状态下的选择框 -->
                   <div v-if="isManaging" class="select-checkbox">
                     <van-icon 
                       :name="selectedIds.includes(item.id) ? 'checked' : 'circle'"
                       :color="selectedIds.includes(item.id) ? '#f14b4b' : '#ccc'"
                     />
                   </div>
                 </div>
                 
                 <!-- 视频信息 -->
                 <div class="video-info">
                   <div class="video-title">{{ item.title }}</div>
                   <div class="video-meta">
                     <span class="collect-time">{{ item.time }}</span>
                     <span 
                       class="type-badge" 
                       :style="{ backgroundColor: getTypeLabel(item.content_type).color }"
                     >
                       {{ getTypeLabel(item.content_type).label }}
                     </span>
                   </div>
                 </div>
                 
                 <!-- 管理状态下的删除按钮 -->
                 <van-icon
                   v-if="isManaging"
                   name="cross"
                   class="delete-icon"
                   @click.stop="removeItem('video', item.id)"
                 />
               </div>

               <!-- 懒加载触发器 -->
               <div 
                 v-if="!isFinished && !isLoading" 
                 ref="loadTrigger"
                 class="load-more-trigger"
               ></div>

               <!-- 加载提示 -->
               <div v-if="isLoading" class="loading-tip">
                 <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
                 <div class="loading-text">加载中...</div>
               </div>

               <!-- 没有更多 -->
               <div v-if="isFinished" class="no-more-text">
                 没有更多了
               </div>
             </template>
             
             <!-- 空状态 -->
             <template v-else>
               <van-empty
                 description="暂无收藏记录"
                 image="/icons/empty.webp"
               />
             </template>
           </div>

          <!-- 抖音tab：使用独立子组件 DouyinCard 渲染竖屏卡片（独立分支） -->
          <div v-if="tab.key === 'douyin'">
               <!-- 管理状态下显示全选按钮 -->
               <div v-if="isManaging" class="select-actions">
                 <span @click="toggleSelectAll">{{ isAllSelected ? '取消全选' : '全选' }}</span>
               </div>
               
               <!-- 首次加载状态 -->
               <van-loading 
                 v-if="isLoading && douyinItems.length === 0" 
                 size="24px" 
                 vertical
                 style="margin: 50px auto;"
               >
                 加载中...
               </van-loading>
               
               <template v-else-if="douyinItems.length > 0">
                 <div class="douyin-grid">
                   <DouyinCard
                     v-for="item in douyinItems"
                     :key="item.id"
                     :item="item"
                     :selected="selectedIds.includes(item.id)"
                     :managing="isManaging"
                     :compact="true"
                     @cardClick="isManaging ? toggleItemSelect(item.id) : goToDouyinDetail(item)"
                     @delete="removeItem('douyin', item.id)"
                   />
                 </div>
                 
                 <!-- 懒加载触发器 -->
                 <div 
                   v-if="!isFinished && !isLoading" 
                   ref="douyinLoadTrigger"
                   class="load-more-trigger"
                 ></div>

                 <!-- 加载提示 -->
                 <div v-if="isLoading" class="loading-tip">
                   <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
                   <div class="loading-text">加载中...</div>
                 </div>

                 <!-- 没有更多 -->
                 <div v-if="isFinished" class="no-more-text">
                   没有更多了
                 </div>
               </template>
               
               <template v-else>
                 <van-empty description="暂无收藏记录" image="/icons/empty.webp" />
               </template>
             </div>

          <!-- 漫画tab：使用DouyinCard渲染卡片（独立分支） -->
          <div v-if="tab.key === 'comic'">
               <!-- 管理状态下显示全选按钮 -->
               <div v-if="isManaging" class="select-actions">
                 <span @click="toggleSelectAll">{{ isAllSelected ? '取消全选' : '全选' }}</span>
               </div>
               
               <!-- 首次加载状态 -->
               <van-loading 
                 v-if="isLoading && comicItems.length === 0" 
                 size="24px" 
                 vertical
                 style="margin: 50px auto;"
               >
                 加载中...
               </van-loading>
               
               <template v-else-if="comicItems.length > 0">
                 <div class="douyin-grid">
                   <DouyinCard
                     v-for="item in comicItems"
                     :key="item.id"
                     :item="item"
                     :selected="selectedIds.includes(item.id)"
                     :managing="isManaging"
                     :compact="true"
                     @cardClick="isManaging ? toggleItemSelect(item.id) : goToComicDetail(item)"
                     @delete="removeItem('comic', item.id)"
                   />
                 </div>
                 
                 <!-- 懒加载触发器 -->
                 <div 
                   v-if="!isFinished && !isLoading" 
                   ref="comicLoadTrigger"
                   class="load-more-trigger"
                 ></div>

                 <!-- 加载提示 -->
                 <div v-if="isLoading" class="loading-tip">
                   <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
                   <div class="loading-text">加载中...</div>
                 </div>

                 <!-- 没有更多 -->
                 <div v-if="isFinished" class="no-more-text">
                   没有更多了
                 </div>
               </template>
               
               <template v-else>
                 <van-empty description="暂无收藏记录" image="/icons/empty.webp" />
               </template>
             </div>

          <!-- 小说tab：使用DouyinCard渲染卡片（独立分支） -->
          <div v-if="tab.key === 'novel'">
               <!-- 管理状态下显示全选按钮 -->
               <div v-if="isManaging" class="select-actions">
                 <span @click="toggleSelectAll">{{ isAllSelected ? '取消全选' : '全选' }}</span>
               </div>
               
               <!-- 首次加载状态 -->
               <van-loading 
                 v-if="isLoading && novelItems.length === 0" 
                 size="24px" 
                 vertical
                 style="margin: 50px auto;"
               >
                 加载中...
               </van-loading>
               
               <template v-else-if="novelItems.length > 0">
                 <div class="douyin-grid">
                   <DouyinCard
                     v-for="item in novelItems"
                     :key="item.id"
                     :item="item"
                     :selected="selectedIds.includes(item.id)"
                     :managing="isManaging"
                     :compact="true"
                     @cardClick="isManaging ? toggleItemSelect(item.id) : goToNovelDetail(item)"
                     @delete="removeItem('novel', item.id)"
                   />
                 </div>
                 
                 <!-- 懒加载触发器 -->
                 <div 
                   v-if="!isFinished && !isLoading" 
                   ref="novelLoadTrigger"
                   class="load-more-trigger"
                 ></div>

                 <!-- 加载提示 -->
                 <div v-if="isLoading" class="loading-tip">
                   <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
                   <div class="loading-text">加载中...</div>
                 </div>

                 <!-- 没有更多 -->
                 <div v-if="isFinished" class="no-more-text">
                   没有更多了
                 </div>
               </template>
               
               <template v-else>
                 <van-empty description="暂无收藏记录" image="/icons/empty.webp" />
               </template>
             </div>

          <!-- 有声小说tab：使用DouyinCard渲染卡片（独立分支） -->
          <div v-if="tab.key === 'audio'">
               <!-- 管理状态下显示全选按钮 -->
               <div v-if="isManaging" class="select-actions">
                 <span @click="toggleSelectAll">{{ isAllSelected ? '取消全选' : '全选' }}</span>
               </div>
               
               <!-- 首次加载状态 -->
               <van-loading 
                 v-if="isLoading && audioItems.length === 0" 
                 size="24px" 
                 vertical
                 style="margin: 50px auto;"
               >
                 加载中...
               </van-loading>
               
               <template v-else-if="audioItems.length > 0">
                 <div class="douyin-grid">
                   <DouyinCard
                     v-for="item in audioItems"
                     :key="item.id"
                     :item="item"
                     :selected="selectedIds.includes(item.id)"
                     :managing="isManaging"
                     :compact="true"
                     @cardClick="isManaging ? toggleItemSelect(item.id) : goToAudioDetail(item)"
                     @delete="removeItem('audio', item.id)"
                   />
                 </div>
                 
                 <!-- 懒加载触发器 -->
                 <div 
                   v-if="!isFinished && !isLoading" 
                   ref="audioLoadTrigger"
                   class="load-more-trigger"
                 ></div>

                 <!-- 加载提示 -->
                 <div v-if="isLoading" class="loading-tip">
                   <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
                   <div class="loading-text">加载中...</div>
                 </div>

                 <!-- 没有更多 -->
                 <div v-if="isFinished" class="no-more-text">
                   没有更多了
                 </div>
               </template>
               
               <template v-else>
                 <van-empty description="暂无收藏记录" image="/icons/empty.webp" />
               </template>
             </div>

          <!-- Only圈图片tab：使用DouyinCard渲染卡片（独立分支） -->
          <div v-if="tab.key === 'only_img'">
               <!-- 管理状态下显示全选按钮 -->
               <div v-if="isManaging" class="select-actions">
                 <span @click="toggleSelectAll">{{ isAllSelected ? '取消全选' : '全选' }}</span>
               </div>
               
               <!-- 首次加载状态 -->
               <van-loading 
                 v-if="isLoading && onlyImgItems.length === 0" 
                 size="24px" 
                 vertical
                 style="margin: 50px auto;"
               >
                 加载中...
               </van-loading>
               
               <template v-else-if="onlyImgItems.length > 0">
                 <div class="douyin-grid">
                   <DouyinCard
                     v-for="item in onlyImgItems"
                     :key="item.id"
                     :item="item"
                     :selected="selectedIds.includes(item.id)"
                     :managing="isManaging"
                     :compact="true"
                     @cardClick="isManaging ? toggleItemSelect(item.id) : goToOnlyImgDetail(item)"
                     @delete="removeItem('only_img', item.id)"
                   />
                 </div>
                 
                 <!-- 懒加载触发器 -->
                 <div 
                   v-if="!isFinished && !isLoading" 
                   ref="onlyImgLoadTrigger"
                   class="load-more-trigger"
                 ></div>

                 <!-- 加载提示 -->
                 <div v-if="isLoading" class="loading-tip">
                   <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
                   <div class="loading-text">加载中...</div>
                 </div>

                 <!-- 没有更多 -->
                 <div v-if="isFinished" class="no-more-text">
                   没有更多了
                 </div>
               </template>
               
               <template v-else>
                 <van-empty description="暂无收藏记录" image="/icons/empty.webp" />
               </template>
             </div>

          <!-- Only圈视频tab：使用视频卡片渲染（独立分支） -->
          <div v-if="tab.key === 'only_video'">
               <!-- 管理状态下显示全选按钮 -->
               <div v-if="isManaging" class="select-actions">
                 <span @click="toggleSelectAll">{{ isAllSelected ? '取消全选' : '全选' }}</span>
               </div>
               
               <!-- 首次加载状态 -->
               <van-loading 
                 v-if="isLoading && onlyVideoItems.length === 0" 
                 size="24px" 
                 vertical
                 style="margin: 50px auto;"
               >
                 加载中...
               </van-loading>
               
               <template v-else-if="onlyVideoItems.length > 0">
                 <!-- 视频卡片列表 - 无van-list包装 -->
                 <div
                   v-for="item in onlyVideoItems"
                   :key="item.id"
                   class="video-card"
                   :class="{ selected: selectedIds.includes(item.id) }"
                   @click="isManaging ? toggleItemSelect(item.id) : goToOnlyVideoDetail(item)"
                 >
                   <!-- 封面图 -->
                   <div class="video-cover">
                     <img :src="item.cover" alt="封面" />
                     <div class="duration-badge">{{ item.duration }}</div>
                     <!-- 管理状态下的选择框 -->
                     <div v-if="isManaging" class="select-checkbox">
                       <van-icon 
                         :name="selectedIds.includes(item.id) ? 'checked' : 'circle'"
                         :color="selectedIds.includes(item.id) ? '#f14b4b' : '#ccc'"
                       />
                     </div>
                   </div>
                   
                   <!-- 视频信息 -->
                   <div class="video-info">
                     <div class="video-title">{{ item.title }}</div>
                     <div class="video-meta">
                       <span class="collect-time">{{ item.time }}</span>
                       <span 
                         class="type-badge" 
                         style="background-color: #9c27b0"
                       >
                         Only视频
                       </span>
                     </div>
                   </div>
                   
                   <!-- 管理状态下的删除按钮 -->
                   <van-icon
                     v-if="isManaging"
                     name="cross"
                     class="delete-icon"
                     @click.stop="removeItem('only_video', item.id)"
                   />
                 </div>
                 
                 <!-- 懒加载触发器 -->
                 <div 
                   v-if="!isFinished && !isLoading" 
                   ref="onlyVideoLoadTrigger"
                   class="load-more-trigger"
                 ></div>

                 <!-- 加载提示 -->
                 <div v-if="isLoading" class="loading-tip">
                   <img src="/icons/loading.svg" alt="加载中..." class="custom-spinner" />
                   <div class="loading-text">加载中...</div>
                 </div>

                 <!-- 没有更多 -->
                 <div v-if="isFinished" class="no-more-text">
                   没有更多了
                 </div>
               </template>
               
               <template v-else>
                 <van-empty description="暂无收藏记录" image="/icons/empty.webp" />
               </template>
             </div>
           
          <!-- 其他tab的卡片列表（保持原样，独立分支） -->
          <template v-if="tab.key !== 'video' && tab.key !== 'douyin' && tab.key !== 'comic' && tab.key !== 'novel' && tab.key !== 'audio' && tab.key !== 'only_img' && tab.key !== 'only_video'">>>>>
             <!-- 管理状态下显示全选按钮 -->
             <div v-if="isManaging" class="select-actions">
               <span @click="toggleSelectAll">{{ isAllSelected ? '取消全选' : '全选' }}</span>
             </div>
             
             <template v-if="favorites[tab.key] && favorites[tab.key].length > 0">
               <div
                 v-for="item in favorites[tab.key]"
                 :key="item.id"
                 class="favorite-card"
                 :class="{ selected: selectedIds.includes(item.id) }"
                 @click="isManaging && toggleItemSelect(item.id)"
               >
                 <div class="card-header">
                   <div class="title">{{ item.title }}</div>
                   <van-icon
                     name="cross"
                     class="delete-icon"
                     v-if="isManaging"
                     @click.stop="removeItem(tab.key, item.id)"
                   />
                 </div>
                 <div class="meta">收藏时间：{{ item.time }}</div>
               </div>
             </template>

             <!-- 空状态 -->
             <template v-else>
               <van-empty
                 description="暂无收藏记录"
                 image="/icons/empty.webp"
               />
             </template>
           </template>
          </div>
        </div>
      </van-swipe-item>
    </van-swipe>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, onActivated, onDeactivated, watchEffect, watch } from 'vue'
import { showToast } from 'vant'
import { useRouter, useRoute } from 'vue-router'
import { useFavoritesStore } from '@/store/favorites.store'
import { uncollectContent } from '@/api/userAction.api'
import DouyinCard from './DouyinCard.vue'

/** 分类类型 */
interface Category {
  label: string
  key: string
}

/** 收藏项类型 */
interface FavoriteItem {
  id: number
  content_id: string | number
  content_type: string
  title: string
  time: string
  cover?: string
  duration?: string
  chapters?: number // 漫画章节数
  author?: string
  likes?: number
}

/** 收藏数据结构 */
type FavoritesMap = Record<string, FavoriteItem[]>

/** 滚动位置记忆接口 */
interface ScrollPosition {
  top: number
  tabIndex: number
  filterKey: string
}

const favoritesStore = useFavoritesStore()
const router = useRouter()
const route = useRoute()

const activeCategory = ref<string>('video')
const activeCategoryIndex = ref<number>(0) // 用于 van-swipe 的索引
const activeVideoFilter = ref<string>('all') // 视频二级筛选
const isManaging = ref<boolean>(false)
const selectedIds = ref<number[]>([])
const isLoading = ref(false)
const isFinished = ref(false)
// 移除组件自己的页码管理，完全依赖 store

// swipe 组件引用
const swipeRef = ref()

// 滚动监听相关
const loadTrigger = ref<HTMLElement | null>(null)
let scrollContainer: HTMLElement | null = null

// 添加超时重置机制
let loadingTimeout: any = null

// 🚀 新增：滚动位置记忆
const scrollPositions = ref<Map<string, ScrollPosition>>(new Map())
const isRestoringScroll = ref(false)

// 🚀 新增：强制滚动状态管理
const lastScrollTop = ref(0)
const needRestoreScroll = ref(false)

// 保存当前滚动位置
function saveScrollPosition() {
  if (!scrollContainer || isRestoringScroll.value) {
    return
  }
  
  const scrollTop = scrollContainer.scrollTop
  const key = `${activeCategoryIndex.value}_${activeVideoFilter.value}`
  
  // 同时保存到多个地方确保不丢失
  scrollPositions.value.set(key, {
    top: scrollTop,
    tabIndex: activeCategoryIndex.value,
    filterKey: activeVideoFilter.value
  })
  
  // 保存到 sessionStorage
  try {
    const storageKey = `favorites_scroll_${key}`
    sessionStorage.setItem(storageKey, scrollTop.toString())
  } catch (error) {
    console.warn('无法保存到 sessionStorage:', error)
  }
  
  lastScrollTop.value = scrollTop
}

// 恢复滚动位置
function restoreScrollPosition() {
  const key = `${activeCategoryIndex.value}_${activeVideoFilter.value}`
  
  // 优先从 sessionStorage 获取位置
  let saved: ScrollPosition | null = null
  
  try {
    const storageKey = `favorites_scroll_${key}`
    const storedScrollTop = sessionStorage.getItem(storageKey)
    if (storedScrollTop && storedScrollTop !== '0') {
      saved = {
        top: parseFloat(storedScrollTop),
        tabIndex: activeCategoryIndex.value,
        filterKey: activeVideoFilter.value
      }
    }
  } catch (error) {
    console.warn('无法从 sessionStorage 读取:', error)
  }
  
  // 如果 sessionStorage 没有或为0，再尝试从 Map 获取
  if (!saved) {
    const mapSaved = scrollPositions.value.get(key)
    if (mapSaved && mapSaved.top > 0) {
      saved = mapSaved
    }
  }
  
  // 使用最后记录的滚动位置作为最后的备份
  if (!saved && lastScrollTop.value > 0) {
    saved = {
      top: lastScrollTop.value,
      tabIndex: activeCategoryIndex.value,
      filterKey: activeVideoFilter.value
    }
  }
  
  if (!saved || !scrollContainer) {
    return
  }
  
  isRestoringScroll.value = true
  needRestoreScroll.value = true
  
  // 多重保障的恢复机制
  const forceRestore = () => {
    const maxAttempts = 10
    let attempts = 0
    
    const attemptRestore = () => {
      attempts++
      
      if (!scrollContainer || !needRestoreScroll.value) {
        isRestoringScroll.value = false
        return
      }
      
      const targetScroll = saved.top
      const currentScroll = scrollContainer.scrollTop
      

      
      // 🚀 强制设置滚动位置
      scrollContainer.scrollTop = targetScroll
      
      console.log(`  � 滚动后状态: 实际=${scrollContainer.scrollTop}`)
      console.log(`�🔄 尝试 ${attempts}/${maxAttempts}: 当前=${currentScroll}, 目标=${targetScroll}, 实际=${scrollContainer.scrollTop}`)
      
      setTimeout(() => {
        if (!scrollContainer || !needRestoreScroll.value) {
          isRestoringScroll.value = false
          return
        }
        
        const finalScroll = scrollContainer.scrollTop
        const isSuccess = Math.abs(finalScroll - targetScroll) <= 20
        
        if (isSuccess || attempts >= maxAttempts) {
          needRestoreScroll.value = false
          setTimeout(() => {
            isRestoringScroll.value = false
          }, 100)
        } else {
          setTimeout(attemptRestore, 100)
        }
      }, 100)
    }
    
    attemptRestore()
  }
  
  setTimeout(forceRestore, 100)
}

// 重置加载状态的函数 - 彻底重构版本
function resetLoadingState() {
  isLoading.value = false
  isFinished.value = true  // 强制结束加载，阻止死循环
  
  // 清空 store 缓存，重新开始
  favoritesStore.clearCache()
  
  if (loadingTimeout) {
    clearTimeout(loadingTimeout)
    loadingTimeout = null
  }
}

// 视频二级筛选选项
const videoFilters = [
  { label: '全部', key: 'all' },
  { label: '长视频', key: 'long_video' },
  { label: '暗网', key: 'darknet' },
  { label: '动漫', key: 'anime' }
]

const categories: Category[] = [
  { label: '视频', key: 'video' },
  { label: '抖阴', key: 'douyin' },
  { label: 'Only圈视频', key: 'only_video' },
  { label: 'Only圈图片', key: 'only_img' },
  { label: '漫画', key: 'comic' },
  { label: '小说', key: 'novel' },
  { label: '有声', key: 'audio' }
]

// 其他分类的假数据（保持原样）
const favorites = ref<FavoritesMap>({
  video: [], // 这个会被真实数据替换
  douyin: [], // 这个也会被真实数据替换
  only_video: [],
  only_img: [],
  comic: [],
  novel: [],
  audio: []
})

// 切换 tab 时强制重挂载容器的 key，避免跨 tab DOM 复用
const forceKey = ref(0)

// 将 API 数据转换为组件所需格式
const transformApiData 