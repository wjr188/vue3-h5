<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="show" class="mask" @click.self="close">
        <div class="dialog">
          <!-- 顶部图片 -->
          <div class="hero-full">
            <img :src="bannerUrl" alt="banner" />
          </div>

          <!-- 文本 + 复制按钮 -->
          <div class="body">
            <div class="content">
              <div class="line" v-for="(ln, i) in noticeLines" :key="i">
                <div class="line-text" v-html="ln.html"></div>
                <!-- 复制按钮 -->
                <div v-if="ln.canCopy" class="copy-btn-container">
                  <button
                    class="copy-btn"
                    @click.stop="copyText(ln.copyValue)"
                  >
                    复制
                  </button>
                </div>
              </div>
            </div>

            <div class="actions">
              <button class="btn ghost" @click="goAppCenter">应用中心</button>
              <button class="btn primary" @click="close">我知道了</button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 自定义复制成功提示 -->
    <transition name="toast">
      <div v-if="showCopyTip" class="custom-toast">
        {{ copyMessage }}
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watchEffect } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePopupConfigStore } from '@/store/popupConfigStore'
import { showToast } from 'vant'

const router = useRouter()
const route = useRoute()
const popupStore = usePopupConfigStore()
const show = ref(false)

// 自定义提示状态
const showCopyTip = ref(false)
const copyMessage = ref('')

onMounted(async () => {
  // ✅ 修改：和 Profile.vue 完全一样的逻辑
  await popupStore.loadPopupConfig('notice')
  
  // ✅ 修改：只弹一次（刷新后还会弹）
  if (popupStore.configs.length > 0 && !sessionStorage.getItem('hasShownNoticePopup')) {
    show.value = true
    sessionStorage.setItem('hasShownNoticePopup', '1')
  }

  // ✅ 修改：刷新/关闭页面时清掉
  window.addEventListener('beforeunload', () => {
    sessionStorage.removeItem('hasShownNoticePopup')
  })
})

watchEffect(() => {
  document.body.style.overflow = show.value ? 'hidden' : ''
})

const cfg = computed<Record<string, any>>(
  () => popupStore.getFirstConfig()?.parsedValue ?? {}
)

const bannerUrl = computed(() => cfg.value.image_url || '/static/gonggao.png')

const textLines = computed<string[]>(() => {
  const v = cfg.value || {}
  if (Array.isArray(v.contents)) return v.contents
  return [v.content1, v.content2, v.content3, v.content4, v.content5, v.content6, v.content7].filter(Boolean)
})

const noticeLines = computed(() => {
  const urlReG = /(https?:\/\/[^\s]+)/g
  const emailReG = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g

  return textLines.value.map((s) => {
    const html = s
      .replace(urlReG, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(emailReG, '<a href="mailto:$&">$&</a>')

    const mUrl = s.match(urlReG)
    const mEmail = s.match(emailReG)
    const copyValue = mUrl?.[0] ?? mEmail?.[0] ?? ''
    const canCopy = !!copyValue
    return { html, canCopy, copyValue }
  })
})

function close() { show.value = false }
function goAppCenter() {
  show.value = false
  const url = cfg.value.app_center_url
  if (typeof url === 'string' && url.startsWith('http')) {
    window.open(url, '_blank')
  } else {
    // 改这里 ↓
    router.push('/benefit-page?tab=recommend')
    // 或者等价写法：
    // router.push({ path: '/benefit-page', query: { tab: 'recommend' } })
  }
}

// ✅ 修改：恢复使用自定义提示
const showCustomTip = (message: string, duration = 600) => {
  copyMessage.value = message
  showCopyTip.value = true
  setTimeout(() => {
    showCopyTip.value = false
  }, duration)
}

const copyText = async (text: string) => {
  const trimmedText = text.trim()
  if (!trimmedText) return

  try {
    await navigator.clipboard.writeText(trimmedText)
    showCustomTip('复制成功')
  } catch (error) {
    console.warn('现代复制API失败，尝试降级方案:', error)
    
    try {
      const textArea = document.createElement('textarea')
      textArea.value = trimmedText
      textArea.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        opacity: 0;
        pointer-events: none;
      `
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (successful) {
        showCustomTip('复制成功')
      } else {
        throw new Error('execCommand 复制失败')
      }
    } catch (fallbackError) {
      console.error('所有复制方法都失败了:', fallbackError)
      showCustomTip('复制失败，请手动复制', 1500)
    }
  }
}
</script>

<style scoped>
/* 遮罩与过渡 */
.mask{
  position:fixed;inset:0;background:rgba(0,0,0,.55);
  display:flex;align-items:center;justify-content:center;z-index:9999;
}
.fade-enter-active,.fade-leave-active{transition:opacity .2s ease}
.fade-enter-from,.fade-leave-to{opacity:0}

.dialog{
  --img-over: 25vw;
  --img-space: 26vw;
  width:82vw;max-width:420px;background:#fff;border-radius:5.3vw;
  box-shadow:0 2.7vw 8vw rgba(0,0,0,.2);
  position:relative;overflow:visible;
  padding: var(--img-space) 4.3vw 3.2vw;
}

.hero-full{
  position:absolute;left:50%;transform:translateX(-50%);
  top: calc(-1 * var(--img-over));
  width:100%;
  background:transparent;border:none;box-shadow:none;border-radius:0;
}
.hero-full img{ display:block;width:100%;height:auto; }

.body{ 
  padding: 3.2vw 4.3vw 3.2vw;
}

.content{
  color:#333; font-size:3.7vw; line-height:1.45;
  max-height:25vh;
  overflow:auto; 
  word-break:break-word;
  padding: 0.8vw 0;
  margin-bottom: 2.7vw;
}

.content::-webkit-scrollbar {
  width: 1.1vw;
}

.content::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 0.5vw;
}

.content::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #ff6b9d, #e91e63);
  border-radius: 0.5vw;
  transition: background 0.3s ease;
}

.content::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #e91e63, #c2185b);
}

.content {
  scrollbar-width: thin;
  scrollbar-color: #e91e63 #f0f0f0;
}

.content a{ color:#1677ff; text-decoration:underline; text-underline-offset:0.5vw; }

.line{ 
  display:flex; 
  align-items:center; 
  gap:2.1vw;
  padding: 0.2vw 0;
  position: relative;
  padding-right: 16vw;
  margin-bottom: 0;
}
.line-text{ 
  flex:1; 
  padding-right: 2.1vw;
}

.copy-btn-container {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

.copy-btn {
  background: linear-gradient(90deg, #e54482, #de2a81);
  color: #fff !important;
  border: none;
  border-radius: 2vw;
  font-size: clamp(2vw, 2.6vw, 12px);
  font-weight: bold;
  height: clamp(4vw, 7vw, 28px);
  padding: 0 clamp(2vw, 4vw, 14px);
  line-height: clamp(4vw, 7vw, 28px);
  white-space: nowrap;
  box-shadow: 0 0.5vw 1.5vw rgba(237, 5, 56, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  min-height: 5.9vw;
  min-width: 13.3vw;
  cursor: pointer;
}

.copy-btn:active {
  transform: scale(0.97);
  box-shadow: 0 0.3vw 1vw rgba(244, 67, 54, 0.3);
}

.copy-btn:hover {
  background: linear-gradient(90deg, #e54482, #de2a81);
  box-shadow: 0 0.7vw 2vw rgba(244, 67, 54, 0.3);
}

.actions{
  display:flex;
  gap:3.2vw;
  margin-top:2.7vw;
  padding-top: 1.1vw;
}

.btn{
  flex:1;height:11.7vw;
  border-radius:2.7vw;
  border:none;
  font-weight:700;cursor:pointer;font-size:4.3vw;
}
.btn.primary{
  background:#ee7f00;color:#fff;
  box-shadow:0 0.5vw 2.1vw rgba(255,138,0,.28);
}
.btn.ghost{
  background:#e94da5;color:#fff;
  box-shadow:0 0.5vw 2.1vw rgba(255,72,176,.35);
}
.btn:active{transform:translateY(0.3vw)}

.custom-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  padding: 3.2vw 5.3vw;
  border-radius: 2.1vw;
  font-size: 3.7vw;
  font-weight: 500;
  z-index: 10001;
  pointer-events: none;
  box-shadow: 0 1.1vw 3.2vw rgba(0, 0, 0, 0.3);
}

.toast-enter-active, .toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.8);
}

.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(1.1);
}
</style>
