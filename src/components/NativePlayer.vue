<template>
  <div class="video-wrapper" ref="wrapperRef">
    <video
      ref="videoRef"
      class="native-player"
      :poster="cover"
      playsinline
      webkit-playsinline
      x5-video-player-type="h5"
      x5-video-player-fullscreen="true"
      preload="auto"
      muted
      :controls="forceUseNativeControls"
    ></video>

    <!-- 中间暂停图标（在播放时短暂显示反馈） -->
    <div
      v-if="!forceUseNativeControls && showCenterIcon"
      class="center-icon show"
    >
      <img :src="isPlaying ? '/icons/pause.svg' : '/icons/play1.svg'" />
    </div>

    <!-- iOS 限制提示 -->
    <div v-if="showIosBrowserTip" class="tip-mask">
      <div class="tip-box">
        <div class="tip-text">
          当前浏览器限制播放体验<br />
          请使用 <span class="highlight">Safari</span> 或
          <span class="highlight">Chrome</span> 打开观看
        </div>
        <div class="close-btn" @click.stop="showIosBrowserTip = false">✕</div>
      </div>
    </div>

    <!-- Android 限制提示 -->
    <div v-if="showAndroidBrowserTip" class="tip-mask">
      <div class="tip-box">
        <div class="tip-text">
          当前浏览器限制播放体验<br />请使用其他浏览器打开
        </div>
        <div class="close-btn" @click.stop="showAndroidBrowserTip = false">✕</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, defineExpose } from 'vue'
import Hls from 'hls.js'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'

// Props & Emits
const props = defineProps<{
  src: string
  cover: string
  shouldPlay: boolean
}>()

const emit = defineEmits<{
  (e: 'requestPlay'): void
  (e: 'timeUpdate', payload: {
    currentTime: number
    duration: number
    buffered: TimeRanges
  }): void
  (e: 'played'): void
}>()

// Refs
const videoRef = ref<HTMLVideoElement | null>(null)
const wrapperRef = ref<HTMLDivElement | null>(null)

// 播放状态
const isPlaying = ref(false)
const showCenterIcon = ref(false)

// 环境判断
const ua = navigator.userAgent
const isAndroid = /Android/i.test(ua)
const isIOS = /iP(hone|od|ad)/i.test(ua)
const isIOSRestricted = /UCBrowser|Quark|Baidu|QQBrowser/i.test(ua)
const isAndroidRestricted = isAndroid && /QQBrowser|360/i.test(ua)
const forceUseNativeControls = isIOS && isIOSRestricted
const showIosBrowserTip = ref(forceUseNativeControls)
const showAndroidBrowserTip = ref(isAndroidRestricted)

const canPlayHLSNatively = (): boolean => {
  const testVideo = document.createElement('video')
  return testVideo.canPlayType('application/vnd.apple.mpegurl') !== ''
}
const useNativeHLS = isIOS && canPlayHLSNatively()

// Hls 实例
let hls: Hls | null = null
let rafId: number | null = null
let iconTimer: ReturnType<typeof setTimeout> | null = null
// 新增：用于避免并发 play()
let playingPromise: Promise<void> | null = null

// 图标 0.5 秒后隐藏
const showIconTemporarily = () => {
  showCenterIcon.value = true
  if (iconTimer) clearTimeout(iconTimer)
  iconTimer = setTimeout(() => {
    showCenterIcon.value = false
  }, 500)
}

// 播放（最小改动：去重、忽略 AbortError）
const play = async () => {
  const video = videoRef.value
  if (!video || forceUseNativeControls) return
  // 已经在播放或正在发起 play 时不重复触发
  if (!video.paused || playingPromise) return
  try {
    playingPromise = video.play()
    await playingPromise
    isPlaying.value = true
    showIconTemporarily()
    updateProgress()
    emit('played')
  } catch (e: any) {
    // 常见并发导致的中断错误，忽略即可
    if (!(e && (e.name === 'AbortError' || e.code === 20))) {
      console.warn('播放失败', e)
    }
  } finally {
    playingPromise = null
  }
}

// 暂停（小改动：已暂停时不重复）
const pause = () => {
  const video = videoRef.value
  if (!video || forceUseNativeControls) return
  if (video.paused) return
  video.pause()
  isPlaying.value = false
  showIconTemporarily()
  stopProgress()
}

// 点击视频区域
const togglePlay = () => {
  if (forceUseNativeControls) return
  
  // 如果没有播放地址，请求父组件获取播放地址
  if (!videoRef.value?.src) {
    emit('requestPlay')
    return
  }
  
  // 如果有播放地址，则直接切换播放/暂停
  if (isPlaying.value) {
    pause() // 直接暂停
  } else {
    play() // 直接播放
  }
}

// 进度上报
const updateProgress = () => {
  const video = videoRef.value
  if (video && !video.paused) {
    emit('timeUpdate', {
      currentTime: video.currentTime,
      duration: video.duration,
      buffered: video.buffered,
    })
    rafId = requestAnimationFrame(updateProgress)
  }
}
const stopProgress = () => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

// 监听 shouldPlay
watch(
  () => props.shouldPlay,
  (val) => {
    val ? play() : pause()
  }
)

// 监听 src
watch(
  () => props.src,
  (newSrc) => {
    loadVideo(newSrc)
  }
)

// 加载视频（最小改动：用 canplay 一次性触发播放，删除 setTimeout 播放）
const loadVideo = (source: string) => {
  const video = videoRef.value
  if (!video || !source) return

  stopProgress()
  if (hls) {
    hls.destroy()
    hls = null
  }

  video.removeEventListener('loadeddata', onLoadedData)
  video.removeEventListener('error', onError)

  if (
    Hls.isSupported() &&
    source.trim().endsWith('.m3u8') &&
    !useNativeHLS &&
    !forceUseNativeControls
  ) {
    hls = new Hls()
    hls.loadSource(source.trim())
    hls.attachMedia(video)
  } else {
    video.src = source.trim()
  }

  video.addEventListener('loadeddata', onLoadedData)
  video.addEventListener('error', onError)

  // 仅在 canplay 后播放一次，避免与其他地方的 play 竞态
  if (props.shouldPlay) {
    const handleCanPlay = () => {
      video.removeEventListener('canplay', handleCanPlay)
      // 再次确认当前仍需播放
      if (props.shouldPlay) play()
    }
    video.addEventListener('canplay', handleCanPlay)
  }
}

function onLoadedData() {}
function onError() {
  console.error('视频加载失败')
}

// 生命周期
onMounted(() => {
  loadVideo(props.src)
  if (wrapperRef.value) {
    wrapperRef.value.addEventListener('click', togglePlay)
  }
})

onBeforeUnmount(() => {
  const video = videoRef.value
  if (video) {
    video.pause()
    stopProgress()
    video.removeEventListener('loadeddata', onLoadedData)
    video.removeEventListener('error', onError)
    video.removeAttribute('src')
    video.load()
  }
  if (hls) {
    hls.destroy()
    hls = null
  }
})

// 暴露给父组件
defineExpose({
  seekTo(time: number) {
    const video = videoRef.value
    if (!video) return
    video.currentTime = time
    if (video.paused) play()
  },
  play,
  pause,
})

</script>
<style scoped>
.video-wrapper {
  position: relative;
  width: 100%;
  height: 100vh;
  background: #000;
  overflow: hidden;
}

/* 视频全屏适配 */
.native-player {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: black;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 100%;
  min-height: 100%;
}

/* 中心播放/暂停按钮 */
.center-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 19.2vw; /* 72px */
  height: 19.2vw;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  pointer-events: auto; /* ← 改成 auto，按钮可点击 */
}
.center-icon img {
  width: 7.5vw; /* 28px */
  height: 7.5vw;
}

/* 提示遮罩 */
.tip-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tip-box {
  background: white;
  padding: 6.4vw 8.5vw; /* 24px 32px */
  border-radius: 4.3vw; /* 16px */
  position: relative;
  max-width: 80%;
  text-align: center;
  font-size: 4.3vw; /* 16px */
  color: #333;
  box-shadow: 0 2.1vw 6.4vw rgba(0, 0, 0, 0.2); /* 8px 24px */
}
.tip-text {
  line-height: 1.6;
}
.tip-text .highlight {
  color: #ff4d4f;
  font-weight: bold;
}
.close-btn {
  position: absolute;
  top: 2.1vw; /* 8px */
  right: 3.2vw; /* 12px */
  font-size: 5.3vw; /* 20px */
  color: #999;
  cursor: pointer;
}
.center-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 19.2vw;
  height: 19.2vw;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  opacity: 0;
  transition: opacity 0.2s;
}
.center-icon.show {
  opacity: 1;
}
</style>
