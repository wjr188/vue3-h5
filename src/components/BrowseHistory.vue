<template>
  <div class="favorites-page">
    <!-- 顶部导航栏 - 添加吸顶效果 -->
    <van-nav-bar
      title="浏览记录"
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
                 <!-- ✅ 封面图 - 添加懒加载 -->
                 <div class="video-cover">
                   <img v-lazy="item.cover" alt="封面" />
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
                 <img v-lazy="'/icons/loading.svg'" alt="加载中..." class="custom-spinner" />
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
                 description="暂无浏览记录"
                 :image="'/icons/empty.webp'"
               />
             </template>
           </div>

          <!-- 抖音tab：使用独立子组件 Browsekapian 渲染竖屏卡片（独立分支） -->
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
                   <Browsekapian
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
                   <img v-lazy="'/icons/loading.svg'" alt="加载中..." class="custom-spinner" />
                   <div class="loading-text">加载中...</div>
                 </div>

                 <!-- 没有更多 -->
                 <div v-if="isFinished" class="no-more-text">
                   没有更多了
                 </div>
               </template>
               
               <template v-else>
                 <van-empty description="暂无浏览记录" :image="'/icons/empty.webp'" />
               </template>
             </div>

          <!-- 漫画tab：使用Browsekapian渲染卡片（独立分支） -->
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
                   <Browsekapian
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
                   <img v-lazy="'/icons/loading.svg'" alt="加载中..." class="custom-spinner" />
                   <div class="loading-text">加载中...</div>
                 </div>

                 <!-- 没有更多 -->
                 <div v-if="isFinished" class="no-more-text">
                   没有更多了
                 </div>
               </template>
               
               <template v-else>
                 <van-empty description="暂无浏览记录" :image="'/icons/empty.webp'" />
               </template>
             </div>

          <!-- 小说tab：使用Browsekapian渲染卡片（独立分支） -->
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
                   <Browsekapian
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
                   <img v-lazy="'/icons/loading.svg'" alt="加载中..." class="custom-spinner" />
                   <div class="loading-text">加载中...</div>
                 </div>

                 <!-- 没有更多 -->
                 <div v-if="isFinished" class="no-more-text">
                   没有更多了
                 </div>
               </template>
               
               <template v-else>
                 <van-empty description="暂无浏览记录" :image="'/icons/empty.webp'" />
               </template>
             </div>

          <!-- 有声小说tab：使用Browsekapian渲染卡片（独立分支） -->
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
                   <Browsekapian
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
                   <img v-lazy="'/icons/loading.svg'" alt="加载中..." class="custom-spinner" />
                   <div class="loading-text">加载中...</div>
                 </div>

                 <!-- 没有更多 -->
                 <div v-if="isFinished" class="no-more-text">
                   没有更多了
                 </div>
               </template>
               
               <template v-else>
                 <van-empty description="暂无浏览记录" :image="'/icons/empty.webp'" />
               </template>
             </div>

          <!-- Only圈视频tab：使用横屏视频卡片（独立分支） -->
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
                 <!-- 横屏长条卡片列表 -->
                 <div
                   v-for="item in onlyVideoItems"
                   :key="item.id"
                   class="video-card horizontal"
                   :class="{ selected: selectedIds.includes(item.id) }"
                   @click="isManaging ? toggleItemSelect(item.id) : goToOnlyVideoDetail(item)"
                 >
                   <!-- ✅ 封面图 - 添加懒加载 -->
                   <div class="video-cover">
                     <img v-lazy="item.cover" alt="封面" />
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
                         class="type-badge star" 
                         style="background-color: #ff6b9d;"
                       >
                         Only圈
                       </span>
                     </div>
                   </div>
                   
                   <!-- 管理状态下的删除按钮 -->
                   <van-icon
                     v-if="isManaging"
                     name="cross"
                     class="delete-icon"
                     @click.stop="removeItem('star', item.id)"
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
                   <img v-lazy="'/icons/loading.svg'" alt="加载中..." class="custom-spinner" />
                   <div class="loading-text">加载中...</div>
                 </div>

                 <!-- 没有更多 -->
                 <div v-if="isFinished" class="no-more-text">
                   没有更多了
                 </div>
               </template>
               
               <template v-else>
                 <van-empty description="暂无浏览记录" :image="'/icons/empty.webp'" />
               </template>
             </div>

          <!-- Only圈图片tab：使用现有的Browsekapian组件 -->
          <div v-if="tab.key === 'only_img'">
               <!-- 管理状态下显示全选按钮 -->
               <div v-if="isManaging" class="select-actions">
                 <span @click="toggleSelectAll">{{ isAllSelected ? '取消全选' : '全选' }}</span>
               </div>
               
               <!-- 首次加载状态 -->
               <van-loading 
                 v-if="isLoading && onlyImageItems.length === 0" 
                 size="24px" 
                 vertical
                 style="margin: 50px auto;"
               >
                 加载中...
               </van-loading>
               
               <template v-else-if="onlyImageItems.length > 0">
                 <!-- 使用现有的网格布局 -->
                 <div class="douyin-grid">
                   <Browsekapian
                     v-for="item in onlyImageItems"
                     :key="item.id"
                     :item="item"
                     :selected="selectedIds.includes(item.id)"
                     :managing="isManaging"
                     @cardClick="goToOnlyImageDetail(item)"
                     @delete="removeItem('star_image', item.id)"
                   />
                 </div>
                 
                 <!-- 懒加载触发器 -->
                 <div 
                   v-if="!isFinished && !isLoading" 
                   ref="onlyImageLoadTrigger"
                   class="load-more-trigger"
                 ></div>

                 <!-- 加载提示 -->
                 <div v-if="isLoading" class="loading-tip">
                   <img v-lazy="'/icons/loading.svg'" alt="加载中..." class="custom-spinner" />
                   <div class="loading-text">加载中...</div>
                 </div>

                 <!-- 没有更多 -->
                 <div v-if="isFinished" class="no-more-text">
                   没有更多了
                 </div>
               </template>
               
               <template v-else>
                 <van-empty description="暂无浏览记录" :image="'/icons/empty.webp'" />
               </template>
             </div>
           
          <!-- 其他tab的卡片列表（保持原样，独立分支） -->
          <template v-if="tab.key !== 'video' && tab.key !== 'douyin' && tab.key !== 'comic' && tab.key !== 'novel' && tab.key !== 'audio' && tab.key !== 'only_video' && tab.key !== 'only_img'">
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
                 <div class="meta">浏览时间：{{ item.time }}</div>
               </div>
             </template>

             <!-- 空状态 -->
             <template v-else>
               <van-empty
                 description="暂无浏览记录"
                 :image="'/icons/empty.webp'"
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
import { useBrowseHistoryStore } from '@/store/browseHistory.store' // 🚀 使用新的浏览记录 store
import { useUserStore } from '@/store/user' // 🚀 添加用户 store
import type { BrowseHistoryItem } from '@/api/browseHistory.api' // 🚀 仅导入类型，避免未使用的值
import Browsekapian from './Browsekapian.vue'

/** 分类类型 */
interface Category {
  label: string
  key: string
}

/** 浏览项类型 */
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

/** 浏览数据结构 */
type FavoritesMap = Record<string, FavoriteItem[]>

/** 滚动位置记忆接口 */
interface ScrollPosition {
  top: number
  tabIndex: number
  filterKey: string
}

const browseHistoryStore = useBrowseHistoryStore() // 🚀 使用浏览记录 store
const userStore = useUserStore() // 🚀 添加用户 store
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

// 防重复请求标记
const loadingFlags = ref<Record<string, boolean>>({})

// swipe 组件引用
const swipeRef = ref<any>(null)

// 滚动监听相关
const loadTrigger = ref<HTMLElement | null>(null)
const douyinLoadTrigger = ref<HTMLElement | null>(null)
const comicLoadTrigger = ref<HTMLElement | null>(null)
const novelLoadTrigger = ref<HTMLElement | null>(null)
const audioLoadTrigger = ref<HTMLElement | null>(null)
const onlyVideoLoadTrigger = ref<HTMLElement | null>(null)
const onlyImageLoadTrigger = ref<HTMLElement | null>(null)
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
  browseHistoryStore.clearCache() // 🚀 修复：使用正确的 browseHistoryStore
  
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

// 将 API 数据转换为组件所需格式 - 适配新的浏览记录接口格式
// 修改 transformApiData 函数，添加去重保护
const transformApiData = (apiData: BrowseHistoryItem[], filterForVideo = false): FavoriteItem[] => {
  let filteredData = apiData
  
  if (filterForVideo) {
    const videoTypes = ['long_video', 'darknet', 'anime']
    filteredData = apiData.filter(item => videoTypes.includes(item.content_type))
  }
  
  // ✅ 添加：按 id 和 content_id + content_type 组合去重
  const uniqueData = filteredData.filter((item, index, arr) =>
    arr.findIndex(other => 
      other.id === item.id || 
      (other.content_id === item.content_id && other.content_type === item.content_type)
    ) === index
  )
  
  return uniqueData.map(item => ({
    id: item.id,
    content_id: item.content_id,
    content_type: item.content_type,
    title: item.video?.title || item.comic?.title || item.novel?.title || item.audio?.title || item.image?.title || '未知标题',
    time: item.created_at, // 使用 created_at 作为浏览时间
    cover: item.video?.cover || item.comic?.cover || item.novel?.cover || item.audio?.cover || item.image?.cover || '',
    duration: item.content_type === 'star_image' || item.content_type === 'image' ? 
              undefined : 
              (item.video?.duration || '00:00'),
    chapters: item.comic?.chapter_count !== undefined ? item.comic.chapter_count : 
              item.novel?.chapter_count !== undefined ? item.novel.chapter_count :
              item.audio?.chapter_count !== undefined ? item.audio.chapter_count : 0,
    chapter_count: item.comic?.chapter_count !== undefined ? item.comic.chapter_count : 
                   item.audio?.chapter_count !== undefined ? item.audio.chapter_count : 0,
    author: '', // 浏览记录不包含作者信息
    likes: item.video?.likes || item.comic?.likes || item.novel?.likes || 0
  }))
}

// 获取当前筛选后的视频列表（严格限定 video 分类）
const filteredVideos = computed(() => {
  const currentCategory = categories[activeCategoryIndex.value]
  if (currentCategory.key !== 'video') return []
  const currentFilter = activeVideoFilter.value === 'all' ? undefined : activeVideoFilter.value
  return transformApiData(browseHistoryStore.getBrowseHistoryByType(currentFilter), true) // 传入true表示过滤视频类型
})

// 计算属性：抖音列表
const douyinItems = computed(() => {
  const currentCategory = categories[activeCategoryIndex.value]
  if (currentCategory.key !== 'douyin') return []
  
  // 从store获取抖音数据，使用'douyin'作为type参数
  return transformApiData(browseHistoryStore.getBrowseHistoryByType('douyin'))
})

// 计算属性：漫画列表
const comicItems = computed(() => {
  const currentCategory = categories[activeCategoryIndex.value]
  if (currentCategory.key !== 'comic') return []
  
  // 从store获取漫画数据，使用'comic'作为type参数
  return transformApiData(browseHistoryStore.getBrowseHistoryByType('comic'))
})

// 计算属性：小说列表
const novelItems = computed(() => {
  const currentCategory = categories[activeCategoryIndex.value]
  if (currentCategory.key !== 'novel') return []
  
  // 从store获取小说数据，使用'novel'作为type参数（统一与后端一致）
  return transformApiData(browseHistoryStore.getBrowseHistoryByType('novel'))
})

// 计算属性：有声小说列表
const audioItems = computed(() => {
  const currentCategory = categories[activeCategoryIndex.value]
  if (currentCategory.key !== 'audio') return []
  
  // 从store获取有声小说数据，使用'audio'作为type参数（统一与后端一致）
  return transformApiData(browseHistoryStore.getBrowseHistoryByType('audio'))
})

// 计算属性：Only圈视频列表
const onlyVideoItems = computed(() => {
  const currentCategory = categories[activeCategoryIndex.value]
  if (currentCategory.key !== 'only_video') return []
  
  // 从store获取OnlyFans视频数据，使用'star'作为type参数
  return transformApiData(browseHistoryStore.getBrowseHistoryByType('star'))
})

// 计算属性：Only圈图片列表
const onlyImageItems = computed(() => {
  const currentCategory = categories[activeCategoryIndex.value]
  if (currentCategory.key !== 'only_img') return []
  
  // 从store获取OnlyFans图片数据，使用'star_image'作为type参数
  return transformApiData(browseHistoryStore.getBrowseHistoryByType('star_image'))
})

// Tab点击时同步swipe
function onTabChange(index: number) {
  // 保存当前tab的滚动位置
  saveScrollPosition()
  
  activeCategoryIndex.value = index
  activeCategory.value = categories[index].key
  
  // 手动切换 swipe 到对应位置
  if (swipeRef.value) {
    swipeRef.value.swipeTo(index)
  }
  
  // 根据tab类型加载对应数据
  if (activeCategory.value === 'douyin') {
    loadDouyinFavorites()
  } else if (activeCategory.value === 'comic') {
    loadComicFavorites()
  } else if (activeCategory.value === 'novel') {
    loadNovelFavorites()
  } else if (activeCategory.value === 'audio') {
    loadAudioFavorites()
  } else if (activeCategory.value === 'only_video') {
    loadOnlyVideoFavorites()
  } else if (activeCategory.value === 'only_img') {
    loadOnlyImageFavorites()
  }
  
  // 重新设置滚动监听器到新的容器
  setTimeout(() => {
    setupScrollListener()
  }, 100)
}

// Swipe滑动时同步tab
function onSwipeChange(index: number) {
  // 保存当前tab的滚动位置
  saveScrollPosition()
  
  activeCategoryIndex.value = index
  activeCategory.value = categories[index].key
  
  // 根据tab类型加载对应数据
  if (activeCategory.value === 'douyin') {
    loadDouyinFavorites()
  } else if (activeCategory.value === 'comic') {
    loadComicFavorites()
  } else if (activeCategory.value === 'novel') {
    loadNovelFavorites()
  } else if (activeCategory.value === 'audio') {
    loadAudioFavorites()
  } else if (activeCategory.value === 'only_video') {
    loadOnlyVideoFavorites()
  } else if (activeCategory.value === 'only_img') {
    loadOnlyImageFavorites()
  }
  
  // 重新设置滚动监听器到新的容器
  setTimeout(() => {
    setupScrollListener()
  }, 100)
}

// 获取类型标签显示文本和颜色
function getTypeLabel(contentType: string) {
  const typeMap = {
    'douyin': { label: '抖音', color: '#ff2c55' },
    'long_video': { label: '长视频', color: '#ff6b6b' },
    'darknet': { label: '暗网', color: '#4ecdc4' },
    'anime': { label: '动漫', color: '#45b7d1' },
    'comic': { label: '漫画', color: '#9c27b0' }
  }
  return typeMap[contentType] || { label: '视频', color: '#95a5a6' }
}

// 加载浏览数据 - 重构版本
async function loadFavorites(refresh = false) {
  const currentCategory = categories[activeCategoryIndex.value]
  console.log('🚀 loadFavorites 被调用:', {
    currentCategoryKey: currentCategory.key,
    activeCategoryIndex: activeCategoryIndex.value,
    refresh
  })
  
  if (currentCategory.key !== 'video') {
    console.log('❌ 当前不是视频分类，跳过加载')
    return
  }
  
  // 防止重复调用
  const loadKey = `video_${activeVideoFilter.value || 'all'}`
  if (loadingFlags.value[loadKey]) {
    console.log('❌ 正在加载中，跳过重复请求')
    return
  }
  
  try {
    loadingFlags.value[loadKey] = true
    console.log('🚀 开始加载视频类型的浏览记录')
    isLoading.value = true
    const result = await browseHistoryStore.loadBrowseHistory(undefined, 1, refresh)
    console.log('✅ 浏览记录加载结果:', result)
    
    // 根据 store 的状态设置组件状态
    isFinished.value = !browseHistoryStore.hasMore(undefined)
    console.log('🚀 加载状态更新:', {
      isFinished: isFinished.value,
      hasMore: browseHistoryStore.hasMore(undefined),
      dataLength: browseHistoryStore.getBrowseHistoryByType(undefined).length
    })
  } catch (error) {
    console.error('❌ 加载浏览记录失败:', error)
    showToast('加载失败')
    isFinished.value = true
  } finally {
    isLoading.value = false
    loadingFlags.value[loadKey] = false
  }
}

// 加载抖音浏览数据
async function loadDouyinFavorites(refresh = false) {
  // 防止重复调用
  if (loadingFlags.value['douyin']) {
    console.log('❌ 抖音数据正在加载中，跳过重复请求')
    return
  }
  
  try {
    loadingFlags.value['douyin'] = true
    isLoading.value = true
    const result = await browseHistoryStore.loadBrowseHistory('douyin', 1, refresh)
    
    // 根据 store 的状态设置组件状态
    isFinished.value = !browseHistoryStore.hasMore('douyin')
  } catch (error) {
    console.error('加载抖音浏览失败:', error)
    showToast('加载失败')
    isFinished.value = true
  } finally {
    isLoading.value = false
    loadingFlags.value['douyin'] = false
  }
}

// 加载漫画浏览数据
async function loadComicFavorites(refresh = false) {
  // 防止重复调用
  if (loadingFlags.value['comic']) {
    console.log('❌ 漫画数据正在加载中，跳过重复请求')
    return
  }
  
  try {
    loadingFlags.value['comic'] = true
    isLoading.value = true
    const result = await browseHistoryStore.loadBrowseHistory('comic', 1, refresh)
    
    // 根据 store 的状态设置组件状态
    isFinished.value = !browseHistoryStore.hasMore('comic')
  } catch (error) {
    console.error('加载漫画浏览失败:', error)
    showToast('加载失败')
    isFinished.value = true
  } finally {
    isLoading.value = false
    loadingFlags.value['comic'] = false
  }
}

// 加载小说浏览数据
async function loadNovelFavorites(refresh = false) {
  // 防止重复调用
  if (loadingFlags.value['novel']) {
    console.log('❌ 小说数据正在加载中，跳过重复请求')
    return
  }
  
  try {
    loadingFlags.value['novel'] = true
    isLoading.value = true
    const result = await browseHistoryStore.loadBrowseHistory('novel', 1, refresh)
    
    // 根据 store 的状态设置组件状态
    isFinished.value = !browseHistoryStore.hasMore('novel')
  } catch (error) {
    console.error('加载小说浏览失败:', error)
    showToast('加载失败')
    isFinished.value = true
  } finally {
    isLoading.value = false
    loadingFlags.value['novel'] = false
  }
}

// 加载有声小说浏览数据
async function loadAudioFavorites(refresh = false) {
  // 防止重复调用
  if (loadingFlags.value['audio']) {
    console.log('❌ 有声小说数据正在加载中，跳过重复请求')
    return
  }
  
  try {
    loadingFlags.value['audio'] = true
    isLoading.value = true
    const result = await browseHistoryStore.loadBrowseHistory('audio', 1, refresh)
    
    // 根据 store 的状态设置组件状态
    isFinished.value = !browseHistoryStore.hasMore('audio')
  } catch (error) {
    console.error('加载有声小说浏览失败:', error)
    showToast('加载失败')
    isFinished.value = true
  } finally {
    isLoading.value = false
    loadingFlags.value['audio'] = false
  }
}

// 加载Only圈视频浏览数据
async function loadOnlyVideoFavorites(refresh = false) {
  // 防止重复调用
  if (loadingFlags.value['only_video']) {
    console.log('❌ Only圈视频数据正在加载中，跳过重复请求')
    return
  }
  
  try {
    loadingFlags.value['only_video'] = true
    isLoading.value = true
    const result = await browseHistoryStore.loadBrowseHistory('star', 1, refresh)
    
    // 根据 store 的状态设置组件状态
    isFinished.value = !browseHistoryStore.hasMore('star')
  } catch (error) {
    console.error('加载Only圈视频浏览失败:', error)
    showToast('加载失败')
    isFinished.value = true
  } finally {
    isLoading.value = false
    loadingFlags.value['only_video'] = false
  }
}

// 加载Only圈图片浏览数据
async function loadOnlyImageFavorites(refresh = false) {
  // 防止重复调用
  if (loadingFlags.value['only_img']) {
    console.log('❌ Only圈图片数据正在加载中，跳过重复请求')
    return
  }
  
  try {
    loadingFlags.value['only_img'] = true
    isLoading.value = true
    const result = await browseHistoryStore.loadBrowseHistory('star_image', 1, refresh)
    
    // 根据 store 的状态设置组件状态
    isFinished.value = !browseHistoryStore.hasMore('star_image')
  } catch (error) {
    console.error('加载Only圈图片浏览失败:', error)
    showToast('加载失败')
    isFinished.value = true
  } finally {
    isLoading.value = false
    loadingFlags.value['only_img'] = false
  }
}

// 设置滚动监听
function setupScrollListener() {
  setTimeout(() => {
    // 找到当前激活的滚动容器
    const swiperItems = document.querySelectorAll('.swipe-content')
    const newScrollContainer = swiperItems[activeCategoryIndex.value] as HTMLElement
    
    if (!newScrollContainer) {
      return
    }
    
    // 更新全局滚动容器引用
    scrollContainer = newScrollContainer

    // 移除所有容器的旧监听器
    swiperItems.forEach((item) => {
      item.removeEventListener('scroll', handleScroll)
    })
    
    // 只给当前激活的容器添加监听器
    scrollContainer.addEventListener('scroll', handleScroll)
    
    // 立即尝试恢复滚动位置
    if (needRestoreScroll.value) {
      restoreScrollPosition()
    }
  }, 10)
}

// 滚动处理函数
function handleScroll(event: Event) {
  const el = event.target as HTMLElement
  if (!el || isRestoringScroll.value) {
    return
  }
  
  // 保存当前滚动位置
  saveScrollPosition()
  
  // 计算距离底部的距离
  const bottomOffset = el.scrollHeight - el.scrollTop - el.clientHeight
  
  // 距离底部200px时触发加载
  if (bottomOffset < 200 && !isLoading.value && !isFinished.value) {
    loadMore()
  }
}

// 懒加载函数 - 简化版本
async function loadMore() {
  if (isLoading.value || isFinished.value) {
    return
  }
  
  isLoading.value = true
  
  try {
    const currentCategory = categories[activeCategoryIndex.value]
    
    if (currentCategory.key === 'video') {
      const filterType = activeVideoFilter.value === 'all' ? undefined : activeVideoFilter.value
      const result = await browseHistoryStore.loadMore(filterType)
      
      if (result === false) {
        isFinished.value = true
      }
    } else if (currentCategory.key === 'douyin') {
      const result = await browseHistoryStore.loadMore('douyin')
      
      if (result === false) {
        isFinished.value = true
      }
    } else if (currentCategory.key === 'comic') {
      const result = await browseHistoryStore.loadMore('comic')
      
      if (result === false) {
        isFinished.value = true
      }
    } else if (currentCategory.key === 'novel') {
      const result = await browseHistoryStore.loadMore('novel')
      
      if (result === false) {
        isFinished.value = true
      }
    } else if (currentCategory.key === 'audio') {
      const result = await browseHistoryStore.loadMore('audio')
      
      if (result === false) {
        isFinished.value = true
      }
    } else if (currentCategory.key === 'only_video') {
      const result = await browseHistoryStore.loadMore('star')
      
      if (result === false) {
        isFinished.value = true
      }
    } else if (currentCategory.key === 'only_img') {
      const result = await browseHistoryStore.loadMore('star_image')
      
      if (result === false) {
        isFinished.value = true
      }
    }
  } catch (error) {
    console.error('加载失败:', error)
    isFinished.value = true
  } finally {
    isLoading.value = false
  }
}

// 筛选变化时加载对应数据
async function onFilterChange(filterKey: string) {
  // 保存当前筛选的滚动位置
  saveScrollPosition()
  
  activeVideoFilter.value = filterKey
  isFinished.value = false
  isLoading.value = true
  
  const filterType = filterKey === 'all' ? undefined : filterKey
  const cachedData = browseHistoryStore.getBrowseHistoryByType(filterType)
  
  if (cachedData.length > 0) {
    isFinished.value = !browseHistoryStore.hasMore(filterType)
    isLoading.value = false
    
    // 延迟确保 DOM 更新完成后恢复位置
    setTimeout(() => {
      restoreScrollPosition()
    }, 200)
    return
  }
  
  try {
    await browseHistoryStore.refreshBrowseHistory(filterType)
    isFinished.value = !browseHistoryStore.hasMore(filterType)
  } catch (error) {
    console.error('加载失败:', error)
    showToast('加载失败')
    isFinished.value = true
  } finally {
    isLoading.value = false
    
    // 延迟确保 DOM 更新完成后恢复位置
    setTimeout(() => {
      restoreScrollPosition()
    }, 200)
  }
}

function toggleManage(): void {
  isManaging.value = !isManaging.value
  if (!isManaging.value) {
    selectedIds.value = []
  }
}

function toggleItemSelect(id: number): void {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter(item => item !== id)
  } else {
    selectedIds.value.push(id)
  }
}

const isAllSelected = computed<boolean>(() => {
  const currentCategory = categories[activeCategoryIndex.value]
  const currentItems = currentCategory.key === 'video' 
    ? filteredVideos.value 
    : currentCategory.key === 'douyin'
      ? douyinItems.value
      : currentCategory.key === 'comic'
        ? comicItems.value
        : currentCategory.key === 'novel'
          ? novelItems.value
          : currentCategory.key === 'audio'
            ? audioItems.value
            : (favorites.value[currentCategory.key] || [])
  return currentItems.length > 0 && selectedIds.value.length === currentItems.length
})

function toggleSelectAll(): void {
  const currentCategory = categories[activeCategoryIndex.value]
  const currentItems = currentCategory.key === 'video' 
    ? filteredVideos.value 
    : currentCategory.key === 'douyin'
      ? douyinItems.value
      : currentCategory.key === 'comic'
        ? comicItems.value
        : currentCategory.key === 'novel'
          ? novelItems.value
          : currentCategory.key === 'audio'
            ? audioItems.value
            : (favorites.value[currentCategory.key] || [])
  const currentIds = currentItems.map(item => item.id)
  if (isAllSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = [...currentIds]
  }
}

// 删除浏览项（视频/抖音/漫画/小说/有声小说通用）- 改为删除浏览记录
async function removeItem(type: string, id: number): Promise<void> {
  const currentItems = type === 'video' 
    ? filteredVideos.value 
    : type === 'douyin'
      ? douyinItems.value
      : type === 'comic'
        ? comicItems.value
        : type === 'novel'
          ? novelItems.value
          : type === 'audio'
            ? audioItems.value
            : (favorites.value[type] || [])
  
  const item = currentItems.find(x => x.id === id)
  if (!item) {
    showToast('找不到要删除的项目')
    return
  }

  console.log(`[删除] 准备删除浏览记录: ID=${id}, Type=${type}, ContentId=${item.content_id}, ContentType=${item.content_type}`)

  // 直接删除浏览记录，不需要确认对话框
  try {
    // TODO: 这里应该调用删除浏览记录的接口，暂时只做界面删除
    console.log(`[删除] 删除浏览记录 ID=${id}`)
    
    // 成功后立即从界面删除
    if (type === 'video') {
      const cacheType = activeVideoFilter.value === 'all' ? undefined : activeVideoFilter.value
      browseHistoryStore.removeFromBrowseHistory(id, cacheType)
    } else if (type === 'douyin') {
      browseHistoryStore.removeFromBrowseHistory(id, 'douyin')
    } else if (type === 'comic') {
      browseHistoryStore.removeFromBrowseHistory(id, 'comic')
    } else if (type === 'novel') {
      browseHistoryStore.removeFromBrowseHistory(id, 'novel')
    } else if (type === 'audio') {
      browseHistoryStore.removeFromBrowseHistory(id, 'audio')
    } else {
      // 其他类型从本地假数据中删除
      favorites.value[type] = (favorites.value[type] || []).filter(i => i.id !== id)
    }
    selectedIds.value = selectedIds.value.filter(x => x !== id)
    showToast('已删除浏览记录')
  } catch (error) {
    console.error('删除浏览记录失败:', error)
    showToast('操作失败')
  }
}

function goToVideoDetail(item: FavoriteItem): void {
  if (!item || !item.content_id) {
    showToast('视频信息无效')
    return
  }

  // 跳转前保存滚动位置
  saveScrollPosition()

  // 根据 content_type 确定跳转参数
  let routeQuery: any = {}
  
  // 设置 from 参数，表示来源于浏览页
  routeQuery.from = 'favorites'
  
  // 根据内容类型设置 type 参数
  switch (item.content_type) {
    case 'long_video':
      routeQuery.type = 'long'
      break
    case 'darknet':
      routeQuery.type = 'darknet'
      break
    case 'anime':
      routeQuery.type = 'anime'
      break
    default:
      routeQuery.type = 'long' // 默认为长视频
  }

  // 直接使用数字 ID，不进行 base62 编码
  // PlayPage.vue 期望接收数字 ID: Number(route.params.id)
  
  // 跳转到播放页面
  router.push({
    path: `/play/${item.content_id}`,
    query: routeQuery
  })
}

function goToDouyinDetail(item: FavoriteItem): void {
  if (!item || !item.content_id) {
    showToast('视频信息无效')
    return
  }

  // 🚀 跳转前强制保存滚动位置
  console.log('🚀 跳转到抖音播放页前保存滚动位置')
  saveScrollPosition()

  // 抖音视频跳转到抖音播放页
  router.push({
    name: 'PlayPageTikTok', // 使用现有的抖音播放页路由
    query: {
      id: item.content_id, // 将视频ID作为查询参数传递
      from: 'favorites', // 标记来源于浏览页
      type: 'douyin'
    }
  })
}

function goToComicDetail(item: FavoriteItem): void {
  if (!item || !item.content_id) {
    showToast('漫画信息无效')
    return
  }

  // 跳转前保存滚动位置
  saveScrollPosition()

  // 漫画跳转到漫画详情页
  router.push({
    path: `/comic/${item.content_id}`, // 假设漫画详情页路由
    query: {
      from: 'favorites', // 标记来源于浏览页
      type: 'comic'
    }
  })
}

function goToNovelDetail(item: FavoriteItem): void {
  if (!item || !item.content_id) {
    showToast('小说信息无效')
    return
  }

  // 跳转前保存滚动位置
  saveScrollPosition()

  // 小说跳转到小说详情页
  router.push({
    path: `/novel/${item.content_id}`, // 小说详情页路由
    query: {
      from: 'favorites', // 标记来源于浏览页
      type: 'novel'
    }
  })
}

function goToAudioDetail(item: FavoriteItem): void {
  if (!item || !item.content_id) {
    showToast('有声小说信息无效')
    return
  }

  // 跳转前保存滚动位置
  saveScrollPosition()

  // 有声小说跳转到音频播放器
  router.push({
    path: `/audio-player/${item.content_id}`, // 有声小说播放器路由
    query: {
      from: 'favorites', // 标记来源于浏览页
      type: 'audio'
    }
  })
}

function goToOnlyVideoDetail(item: FavoriteItem): void {
  if (!item || !item.content_id) {
    showToast('Only圈视频信息无效')
    return
  }

  // 跳转前保存滚动位置
  saveScrollPosition()

  // Only圈视频跳转到播放页
  router.push({
    path: `/play/${item.content_id}`, // 视频播放页路由
    query: {
      from: 'star', // 标记来源于OnlyFans
      type: 'star'  // 标记视频类型为OnlyFans
    }
  })
}

function goToOnlyImageDetail(item: FavoriteItem): void {
  if (!item || !item.content_id) {
    showToast('Only圈图片信息无效')
    return
  }

  // 跳转前保存滚动位置
  saveScrollPosition()

  // Only圈图片跳转到图片详情页，构造StarImageDetail期望的数据格式
  const payload = { 
    star: { 
      id: item.content_id, 
      name: item.title, 
      avatar: item.cover 
    }, 
    album: { 
      id: item.content_id,
      title: item.title,
      cover: item.cover
    } 
  }
  
  router.push({ 
    name: 'StarImageDetail', 
    params: { 
      data: encodeURIComponent(JSON.stringify(payload)) 
    }
  })
}

// 根据当前激活的分类，统一调度加载函数
function loadDataForCurrentTab(refresh = false) {
  const key = categories[activeCategoryIndex.value]?.key
  switch (key) {
    case 'video':
      return loadFavorites(refresh)
    case 'douyin':
      return loadDouyinFavorites(refresh)
    case 'comic':
      return loadComicFavorites(refresh)
    case 'novel':
      return loadNovelFavorites(refresh)
    case 'audio':
      return loadAudioFavorites(refresh)
    case 'only_video':
      return loadOnlyVideoFavorites(refresh)
    case 'only_img':
      return loadOnlyImageFavorites(refresh)
    default:
      return Promise.resolve()
  }
}

// 组件挂载时加载数据
onMounted(async () => {
  console.log('🚀 BrowseHistory 组件挂载')
  
  // 检查路由参数，支持直接跳转到指定tab
  const initialTab = route.query.tab as string
  if (initialTab) {
    const tabIndex = categories.findIndex(cat => cat.key === initialTab)
    if (tabIndex >= 0 && tabIndex !== activeCategoryIndex.value) {
      console.log(`🚀 从路由参数切换到tab: ${initialTab} (index: ${tabIndex})`)
      activeCategoryIndex.value = tabIndex
      activeCategory.value = initialTab
    }
  }
  
  // 尝试初始化用户信息
  try {
    await userStore.initUser()
    const newUuid = userStore.uuid
    console.log('🚀 初始化后用户UUID:', newUuid)
    if (newUuid) {
      console.log('✅ 用户初始化成功，开始加载浏览记录')
      // 首次加载强制刷新当前分类
      await loadDataForCurrentTab(true)
    } else {
      console.error('❌ 用户初始化失败')
      showToast('用户初始化失败')
    }
  } catch (error) {
    console.error('❌ 用户初始化出错:', error)
    showToast('用户初始化失败')
  }
  
  // 延迟设置滚动监听，确保DOM已渲染
  setTimeout(() => {
    setupScrollListener()
  }, 100)
})

// 🚀 keep-alive 激活时的处理 - 超强版 + 详细调试
onActivated(() => {
  console.log('🔄 MyFavorites 组件激活，开始恢复状态')
  console.log('  当前状态:', {
    activeCategoryIndex: activeCategoryIndex.value,
    activeVideoFilter: activeVideoFilter.value,
    needRestoreScroll: needRestoreScroll.value,
    scrollContainer: !!scrollContainer,
    scrollPositions: Array.from(scrollPositions.value.entries())
  })
  
  // 🚀 立即标记需要恢复滚动
  needRestoreScroll.value = true
  console.log('✅ 已标记 needRestoreScroll = true')
  
  // 🚀 第一次尝试 - 快速恢复
  setTimeout(() => {
    console.log('🚀 第一次尝试设置滚动监听器 (50ms)')
    setupScrollListener()
  }, 50)
  
  // 🚀 第二次尝试 - 确保 DOM 完全渲染
  setTimeout(() => {
    console.log('🚀 第二次尝试设置滚动监听器 (200ms)')
    setupScrollListener()
  }, 200)
  
  // 🚀 第三次尝试 - 最后的保障
  setTimeout(() => {
    console.log('🚀 第三次尝试设置滚动监听器 (500ms)')
    setupScrollListener()
    
    // 🚀 强制恢复滚动位置
    if (scrollContainer && needRestoreScroll.value) {
      const key = `${activeCategoryIndex.value}_${activeVideoFilter.value}`
      const saved = scrollPositions.value.get(key)
      console.log('🚀 第三次尝试 - 强制恢复:', {
        key,
        saved,
        scrollContainer: !!scrollContainer,
        needRestoreScroll: needRestoreScroll.value
      })
      if (saved) {
        console.log(`🔄 强制恢复滚动位置: ${saved.top}`)
        scrollContainer.scrollTop = saved.top
        
        // 验证恢复结果
        setTimeout(() => {
          const actualScrollTop = scrollContainer?.scrollTop || 0
          console.log(`🔍 强制恢复验证: 期望=${saved.top}, 实际=${actualScrollTop}, 成功=${Math.abs(actualScrollTop - saved.top) <= 20}`)
        }, 100)
      }
    }
  }, 500)
})

// 🚀 keep-alive 失活时的处理
onDeactivated(() => {
  console.log('💾 MyFavorites 组件失活，保存状态')
  
  // ❌ 不在这里保存滚动位置！因为此时滚动容器可能已经被重置
  // 滚动位置应该在跳转前保存（goToVideoDetail中已经做了）
  console.log('ℹ️ 跳过在失活时保存滚动位置（避免覆盖正确的位置）')
})

// 组件销毁时清理
onBeforeUnmount(() => {
  console.log('🗑️ MyFavorites 组件销毁')
  
  // 保存滚动位置
  saveScrollPosition()
  
  // 清理所有滚动监听器
  const swiperItems = document.querySelectorAll('.swipe-content')
  swiperItems.forEach(item => {
    item.removeEventListener('scroll', handleScroll)
  })
})
</script>

<style scoped>
.favorites-page {
  background: #f8f8f8;
  min-height: 100vh;
  touch-action: manipulation; /* 支持触摸操作 */
  -webkit-overflow-scrolling: touch; /* iOS 优化 */
}

.nav-placeholder {
  height: 46px; /* 导航栏高度 */
}

.swipe-content {
  height: calc(100vh - 46px - 44px); /* 总高度 - 导航栏 - tabs高度 */
  overflow-y: scroll !important; /* 强制滚动 */
  -webkit-overflow-scrolling: touch; /* iOS 滑动优化 */
  touch-action: pan-y; /* 只允许垂直滑动 */
  position: relative; /* 确保滑动上下文 */
  will-change: scroll-position; /* 优化滚动性能 */
}

.favorites-list {
  padding: 3.7vw; /* 14px */
  min-height: calc(100vh - 46px - 44px + 100px); /* 确保内容足够长可以滚动 */
  touch-action: pan-y; /* 允许垂直滑动 */
  -webkit-overflow-scrolling: touch; /* iOS 惯性滚动 */
}

.select-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 2.7vw; /* 10px */
  padding-right: 2.7vw; /* 10px */
  font-size: 3.7vw; /* 14px */
  color: #f14b4b;
  font-weight: bold;
  cursor: pointer;
}

.favorite-card {
  background: #fff;
  border-radius: 3.2vw; /* 12px */
  border: 0.27vw solid #d2a96a; /* 1px */
  padding: 3.7vw; /* 14px */
  margin-bottom: 3.7vw; /* 14px */
  box-shadow: 0 0.53vw 1.6vw rgba(212, 167, 95, 0.1); /* 0 2px 6px */
  position: relative;
}

.favorite-card.selected {
  border-color: #f14b4b;
  box-shadow: 0 0 0 0.53vw rgba(241, 75, 75, 0.2); /* 0 0 0 2px */
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.1vw; /* 8px */
}

.title {
  font-weight: bold;
  font-size: 4.3vw; /* 16px */
  color: #333;
}

.meta {
  font-size: 3.5vw; /* 13px */
  color: #666;
  margin-top: 1.1vw; /* 4px */
}

.delete-icon {
  position: absolute;
  top: 1.1vw; /* 4px */
  right: 1.1vw; /* 4px */
  font-size: 4.8vw; /* 18px */
  color: #f14b4b;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  width: 6.4vw; /* 24px */
  height: 6.4vw; /* 24px */
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0.53vw 1.6vw rgba(0, 0, 0, 0.1); /* 0 2px 6px */
  transition: all 0.2s ease;
  z-index: 10;
}

.delete-icon:hover {
  background: rgba(241, 75, 75, 0.1);
  transform: scale(1.1);
}

/* 视频二级筛选样式 */
.video-filters {
  margin-bottom: 3.7vw; /* 14px */
}

.delete-icon:hover {
  background: rgba(241, 75, 75, 0.1);
  transform: scale(1.1);
}

/* 视频二级筛选样式 */
.video-filters {
  margin-bottom: 3.7vw; /* 14px */
}

.filter-tabs {
  display: flex;
  gap: 2.1vw; /* 8px */
  padding: 0 1vw;
}

.filter-tab {
  padding: 1.6vw 3.2vw; /* 6px 12px */
  background: #fff;
  border-radius: 5.3vw; /* 20px */
  font-size: 3.7vw; /* 14px */
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
  border: 0.27vw solid #e5e5e5; /* 1px */
}

.filter-tab.active {
  background: #f14b4b;
  color: #fff;
  border-color: #f14b4b;
}

/* 视频卡片样式 */
.video-card {
  display: flex;
  background: #fff;
  border-radius: 2.1vw; /* 8px */
  overflow: hidden;
  margin-bottom: 2.7vw; /* 10px */
  box-shadow: 0 0.53vw 2.1vw rgba(0, 0, 0, 0.08); /* 0 2px 8px */
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
}

.video-card:hover {
  box-shadow: 0 1.1vw 4.3vw rgba(0, 0, 0, 0.12); /* 0 4px 16px */
}

.video-card:active {
  transform: scale(0.98);
}

.video-card.selected {
  border: 0.53vw solid #f14b4b; /* 2px */
  box-shadow: 0 1.1vw 3.2vw rgba(241, 75, 75, 0.2); /* 0 4px 12px */
}

.video-cover {
  position: relative;
  width: 40vw; /* 150px - 增加封面宽度 */
  height: 20vw; /* 75px - 减少高度让卡片更紧凑 */
  flex-shrink: 0;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.video-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.video-card:hover .video-cover img {
  transform: scale(1.05);
}

.duration-badge {
  position: absolute;
  bottom: 1.1vw; /* 4px */
  right: 1.1vw; /* 4px */
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 0.5vw 1.6vw; /* 2px 6px */
  border-radius: 1.1vw; /* 4px */
  font-size: 2.7vw; /* 10px */
  font-weight: 500;
}

.select-checkbox {
  position: absolute;
  top: 1.1vw; /* 4px */
  right: 1.1vw; /* 4px */
  width: 5.3vw; /* 20px */
  height: 5.3vw; /* 20px */
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2.1vw); /* 8px */
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-info {
  flex: 1;
  padding: 2.4vw; /* 9px - 减少内边距让卡片更紧凑 */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.video-title {
  font-size: 3.7vw; /* 14px */
  font-weight: 600;
  color: #1f2937;
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  margin-bottom: 1.6vw; /* 6px - 减少底边距让布局更紧凑 */
}

.video-meta {
  display: flex;
  flex-direction: column;
  gap: 1.1vw; /* 4px */
}

.collect-time {
  color: #9ca3af;
  font-size: 2.9vw; /* 11px */
}

.type-badge {
  padding: 0.5vw 2.1vw; /* 2px 8px */
  border-radius: 3.2vw; /* 12px */
  font-size: 2.7vw; /* 10px */
  color: #fff;
  font-weight: 500;
  align-self: flex-start;
}

/* 加载和提示样式 */
.load-more-trigger {
  height: 50px;
  margin-top: 20px;
}

.loading-tip {
  text-align: center;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.custom-spinner {
  width: 24px;
  height: 24px;
  margin-bottom: 8px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  color: #666;
  font-size: 14px;
}

.no-more-text {
  text-align: center;
  color: #999;
  padding: 20px 0;
  font-size: 14px;
}

::v-deep(.van-nav-bar__title) {
  font-size: 5.1vw !important; /* 19px */
  font-weight: bold !important;
  color: #333 !important;
}

::v-deep(.van-icon-arrow-left) {
  font-size: 6.9vw !important; /* 26px */
  color: #333 !important;
}

::v-deep(.van-tab__text) {
  font-weight: 500;
  font-size: 4vw; /* 15px */
}

::v-deep(.van-tab--active .van-tab__text) {
  color: #f14b4b !important;
  font-size: 4.3vw !important; /* 16px */
  font-weight: bold !important;
}

.douyin-grid { display:grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (min-width: 540px) { .douyin-grid { grid-template-columns: repeat(3, 1fr); } }

/* ✅ 新增：横屏视频卡片专用样式 */
.video-card.horizontal {
  height: 22vw !important; /* 固定卡片高度，约82px */
  min-height: 22vw !important;
  max-height: 22vw !important;
}

.video-card.horizontal .video-cover {
  width: 40vw !important; /* 封面宽度保持不变 */
  height: 22vw !important; /* 封面高度等于卡片高度 */
  min-height: 22vw !important;
  max-height: 22vw !important;
}

.video-card.horizontal .video-cover img {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important; /* 确保图片填满容器 */
  object-position: center !important; /* 居中裁剪 */
}

.video-card.horizontal .video-info {
  padding: 2.1vw 2.4vw !important; /* 减少内边距适应更小高度 */
  height: 22vw !important; /* 信息区域高度等于卡片高度 */
  overflow: hidden !important; /* 防止内容溢出 */
}

.video-card.horizontal .video-title {
  font-size: 2.9vw !important; /* 稍微减小字体 */
  line-height: 1.3 !important;
  -webkit-line-clamp: 2 !important; /* 限制2行 */
 line-clamp: 2 !important; /* 限制2行 */
  margin-bottom: 1.1vw !important; /* 减少底边距 */
}

.video-card.horizontal .video-meta {
  gap: 0.8vw !important; /* 减少间距 */
}

.video-card.horizontal .collect-time,
.video-card.horizontal .type-badge {
  font-size: 2.7vw !important; /* 稍微减小字体 */
}

.video-card.horizontal .type-badge {
  padding: 0.4vw 1.8vw !important; /* 减小标签内边距 */
}

.video-card.horizontal .duration-badge {
  bottom: 0.8vw !important; /* 调整位置 */
  right: 0.8vw !important;
  padding: 0.4vw 1.3vw !important; /* 减小内边距 */
  font-size: 2.4vw !important; /* 减小字体 */
}

.video-card.horizontal .select-checkbox {
  top: 0.8vw !important; /* 调整选择框位置 */
  right: 0.8vw !important;
  width: 4.8vw !important; /* 稍微减小 */
  height: 4.8vw !important;
}

.video-card.horizontal .delete-icon {
  top: 0.5vw !important; /* 调整删除按钮位置 */
  right: 0.5vw !important;
  width: 5.6vw !important; /* 稍微减小 */
  height: 5.6vw !important;
  font-size: 4.3vw !important;
}

/* ✅ 防止卡片被内容撑开 */
.video-card.horizontal * {
  box-sizing: border-box !important;
}

/* ✅ 修改：同时应用到普通 video-card 和 video-card.horizontal */
.video-card,
.video-card.horizontal {
  height: 22vw !important; /* 固定卡片高度 */
  min-height: 22vw !important;
  max-height: 22vw !important;
}

.video-card .video-cover,
.video-card.horizontal .video-cover {
  width: 40vw !important;
  height: 22vw !important; /* 封面高度等于卡片高度 */
  min-height: 22vw !important;
  max-height: 22vw !important;
}

.video-card .video-cover img,
.video-card.horizontal .video-cover img {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important; /* 确保图片填满容器 */
  object-position: center !important; /* 居中裁剪 */
}

.video-card .video-info,
.video-card.horizontal .video-info {
  padding: 2.1vw 2.4vw !important;
  height: 22vw !important;
  overflow: hidden !important;
}

.video-card .video-title,
.video-card.horizontal .video-title {
  font-size: 2.9vw !important; /* 调小标题字体 */
  line-height: 1.3 !important;
  -webkit-line-clamp: 2 !important;
  line-clamp: 2 !important;
  margin-bottom: 1.1vw !important;
}

.video-card .video-meta,
.video-card.horizontal .video-meta {
  gap: 0.8vw !important;
}

.video-card .collect-time,
.video-card.horizontal .collect-time,
.video-card .type-badge,
.video-card.horizontal .type-badge {
  font-size: 2.7vw !important;
}

.video-card .type-badge,
.video-card.horizontal .type-badge {
  padding: 0.4vw 1.8vw !important;
}

.video-card .duration-badge,
.video-card.horizontal .duration-badge {
  bottom: 0.8vw !important;
  right: 0.8vw !important;
  padding: 0.4vw 1.3vw !important;
  font-size: 2.4vw !important;
}

.video-card .select-checkbox,
.video-card.horizontal .select-checkbox {
  top: 0.8vw !important;
  right: 0.8vw !important;
  width: 4.8vw !important;
  height: 4.8vw !important;
}

.video-card .delete-icon,
.video-card.horizontal .delete-icon {
  top: 0.5vw !important;
  right: 0.5vw !important;
  width: 5.6vw !important;
  height: 5.6vw !important;
  font-size: 4.3vw !important;
}
</style>
