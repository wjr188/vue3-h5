<template>
  <div class="mobile-wrapper">
    <SafeWrapper>
      <div class="scroll-wrapper">
        <router-view v-slot="{ Component, route }">
          <keep-alive :include="keepAlivePages">
            <component 
              :is="Component" 
              :key="route.name === 'VideoRankPage' ? 'VideoRankPage' : route.fullPath"
            />
          </keep-alive>
        </router-view>
      </div>
    </SafeWrapper>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import SafeWrapper from '@/components/SafeWrapper.vue'
import { useUserStore } from '@/store/user'

// 1. 定义需要缓存的页面（按路由的name）
const keepAlivePages = ref([
  'SearchPopup',
  'ComicDetail',
  'AcgComicRecommend',
  'AcgNovelRecommend',
  'AcgAnimeRecommend',
  'AllCategories',
  'VideoRankPage', // 加上你的榜单页路由name
  'Darknet',
  'Tiktok', // 添加 Tiktok 主页面
  'TiktokDiscover',
])

// 2. 动态生成缓存Key（兼容params和query）
const getRouteCacheKey = (route) => {
  const { name, params, query } = route
  // 示例生成格式: "AcgComicRecommend_type=comic" 或 "ComicDetail_123"
  return `${String(name)}_${JSON.stringify(params)}_${JSON.stringify(query)}`
}
const userStore = useUserStore()
onMounted(async () => {
  console.log('页面初次加载，token:', localStorage.getItem('token'))
  // 只有 token 和 uuid 都没有才自动注册游客
  const localUuid = localStorage.getItem('uuid')
  if (!userStore.token && !localUuid) {
    await userStore.autoRegisterIfNeed()
  }
  // 有 token 但没 userInfo 拉一次
  if (userStore.token && !userStore.userInfo) {
    await userStore.fetchUserInfo()
  }


  // 你原有的 UA 适配代码 ↓
  const ua = navigator.userAgent
  const isIOS = /iP(hone|od|ad)/i.test(ua)
  const isCriOS = /CriOS/i.test(ua)        // iOS Chrome
  const isFxiOS = /FxiOS/i.test(ua)        // iOS Firefox
  const isEdgiOS = /EdgiOS/i.test(ua)      // iOS Edge
  const isQQ = /QQ\//i.test(ua) || /QQBrowser/i.test(ua)
  const isWeixin = /MicroMessenger/i.test(ua)
  const isUC = /UCBrowser/i.test(ua)
  const isQuark = /Quark/i.test(ua)
  const isShellBrowser = isQQ || isWeixin || isUC || isQuark || isFxiOS || isEdgiOS
  const isSafari = (
    /Safari/i.test(ua) &&
    !/Chrome/i.test(ua) &&
    !/CriOS/i.test(ua) &&
    !isShellBrowser
  )
  if (isIOS && (isSafari || isCriOS)) {
    document.body.classList.add('ios-browser')
  }
})
</script>

<style>
/* 放这里，全局生效，覆盖所有页面 toast */
.global-toast.van-toast {
  z-index: 999999 !important;
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  pointer-events: auto !important;
  opacity: 1 !important;
}

html, body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  overflow-x: hidden;
  overflow-y: auto;
  background: #000;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  min-height: 100vh;
  width: 100%;
  overflow: visible;
}

.scroll-wrapper {
  min-height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  -webkit-tap-highlight-color: transparent;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-right: 1px;
}
.scroll-wrapper::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
}

/* ✅ 默认移动端样式 */
.mobile-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

/* ✅ PC 模拟手机样式，仅 PC 生效 */
@media screen and (min-width: 768px) {
  .mobile-wrapper {
    width: 430px;
    height: 100vh;
    margin: 0 auto;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  .scroll-wrapper {
    height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding-right: 1px;
    max-width: 430px;
    margin: 0 auto;
  }
  .scroll-wrapper::-webkit-scrollbar {
    display: none !important;
  }

  .mobile-wrapper * {
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  .top-bar,
  .top-nav,
  .tab-bar,
  .tabbar,
  header,
  footer {
    left: 0 !important;
    right: 0 !important;
    max-width: 430px !important;
    margin-left: auto !important;
    margin-right: auto !important;
  }

  .search-wrapper,
  .category-tabs {
    max-width: 430px !important;
    margin: 0 auto !important;
    left: 0 !important;
    right: 0 !important;
  }

  .scroll-content,
  .top-category-fixed,
  .sub-category-fixed,
  .slide-content {
    max-width: 430px !important;
    margin: 0 auto !important;
  }

  .top-category-bar,
  .category-tabs,
  .top-nav-tabs {
    display: flex !important;
    flex-wrap: nowrap !important;
    justify-content: center !important;
    overflow-x: auto !important;
  }
  .top-category-bar::-webkit-scrollbar,
  .category-tabs::-webkit-scrollbar {
    display: none !important;
  }

  .search-bar,
  .search-bar-container {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    padding: 0 8px;
    max-width: 430px;
    margin: 0 auto;
  }

  .search-input {
    flex: 1 !important;
    min-width: 0 !important;
    max-width: calc(100% - 80px) !important;
  }

  .search-icon,
  .vip-icon,
  .level-icon {
    flex-shrink: 0 !important;
    width: 24px !important;
    height: 24px !important;
    margin-left: 8px !important;
  }

  .tabbar img,
  .tabbar span,
  .tab-bar img,
  .tab-bar span {
    max-width: 100% !important;
    height: auto !important;
    font-size: 12px !important;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
