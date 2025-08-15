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
import SafeWrapper from '@/components/SafeWrapper.vue'
import { useUserStore } from '@/store/user'

const keepAlivePages = ref([
  'SearchPopup',
  'ComicDetail',
  'AcgComicRecommend',
  'AcgNovelRecommend',
  'AcgAnimeRecommend',
  'AllCategories',
  'VideoRankPage',
  'Darknet',
  'Tiktok',
  'TiktokDiscover',
  'MyFavorites',
  'BrowseHistory',
])

const userStore = useUserStore()

onMounted(async () => {
  console.log('页面初次加载，token:', localStorage.getItem('token'))
  
  const localUuid = localStorage.getItem('uuid')
  if (!userStore.token && !localUuid) {
    await userStore.autoRegisterIfNeed()
  }
  
  if (userStore.token && !userStore.userInfo) {
    await userStore.fetchUserInfo()
  }

  // UA 适配代码
  const ua = navigator.userAgent
  const isIOS = /iP(hone|od|ad)/i.test(ua)
  const isCriOS = /CriOS/i.test(ua)
  const isFxiOS = /FxiOS/i.test(ua)
  const isEdgiOS = /EdgiOS/i.test(ua)
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
/* 全局 Toast 样式 */
.global-toast.van-toast {
  z-index: 999999 !important;
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  pointer-events: auto !important;
  opacity: 1 !important;
}

/* 基础样式 */
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

.mobile-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
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
</style>
