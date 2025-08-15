<template>
  <div
    class="video-wrapper"
    @click="handleWrapperClick"
    :class="{ fullscreen: isFullscreen }"
    ref="wrapperRef"
  >
    <video
      v-if="hasPlayed"
      ref="video"
      class="video"
      :poster="props.poster"
      playsinline
      webkit-playsinline
      preload="metadata"
      :controls="showNativeControls"
      controlslist="nodownload noremoteplayback"
      @contextmenu.prevent
      @loadeddata="onLoaded"
      @webkitbeginfullscreen="onEnterNativeFullscreen"
      @webkitendfullscreen="onExitNativeFullscreen"
      @play="onNativePlay"
      @error="onVideoError"
      tabindex="-1"
      :style="videoStyle"
    />

    <img
      v-else
      class="video-poster"
      v-lazy="props.poster"
      @click.stop="emit('requestPlay')"
      style="width:100%;height:100%;object-fit:contain;cursor:pointer;"
    />

    <div v-if="!hasPlayed" class="center-icon" @click.stop="emit('requestPlay')">
      <img src="/icons/play1.svg" class="play-icon" />
    </div>

    <template v-if="hasPlayed && !showNativeControls">
      <transition name="fade">
        <div class="control-bar" v-show="showControls" @click.stop>
          <button class="btn" @click.stop="seek(-10)">
            <img src="/icons/rewind.svg" class="icon" />
          </button>
          <button class="btn" @click.stop="togglePlay">
            <img :src="isPlaying ? '/icons/pause.svg' : '/icons/play1.svg'" class="icon" />
          </button>
          <button class="btn" @click.stop="seek(10)">
            <img src="/icons/forward.svg" class="icon" />
          </button>

          <div class="time">{{ formatTime(isDragging ? progressValue : currentTime) }} / {{ formatTime(duration) }}</div>

          <div class="progress-container" :class="{ dragging: isDragging }">
            <div class="buffered" :style="bufferStyle"></div>
            <input
              type="range"
              class="progress"
              min="0"
              :max="duration"
              step="0.1"
              v-model="progressValue"
              @input="onSeeking"
              @change="onSeekEnd"
              :class="{ dragging: isDragging }"
            />
          </div>

          <button class="btn" @click.stop="toggleMute">
            <img :src="isMuted ? '/icons/volume-mute.svg' : '/icons/volume.svg'" class="icon" />
          </button>

          <div class="btn speed-selector" @click.stop="toggleSpeedPanel">
            <span>{{ playbackRate.toFixed(2) }}x</span>
            <div v-if="showSpeedPanel" class="speed-panel">
              <div v-for="rate in speedOptions" :key="rate" class="speed-option" @click="changeSpeed(rate)">
                {{ rate }}x
              </div>
            </div>
          </div>

          <button class="btn" @click.stop="handleFullscreen">
            <img :src="isFullscreen ? '/icons/exit-fullscreen.svg' : '/icons/fullscreen.svg'" class="icon" />
          </button>
        </div>
      </transition>
    </template>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, defineEmits, CSSProperties, watch } from 'vue'
import { useRouter } from 'vue-router'
import Hls from 'hls.js'
import { showToast } from 'vant'

const props = defineProps<{
  src?: string
  poster?: string
}>()

const emit = defineEmits<{
  (e: 'play'): void
  (e: 'requestPlay'): void
}>()


const video = ref<HTMLVideoElement | null>(null)
const wrapperRef = ref<HTMLDivElement | null>(null)
const hls = ref<Hls | null>(null)
const isPlaying = ref(false)
const isFullscreen = ref(false)
const isMuted = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const progressValue = ref(0)
const bufferedEnd = ref(0)
let isDragging = false
const hasPlayed = ref(false)
const showNativeControls = ref(false)
const showControls = ref(false)
let controlBarTimeout: ReturnType<typeof setTimeout> | null = null
// 新增：防并发的播放 Promise
let playingPromise: Promise<void> | null = null

const showSpeedPanel = ref(false)
const speedOptions = [0.75, 1.0, 1.25, 1.75, 2.0]
const playbackRate = ref(1.0)

const toggleSpeedPanel = () => (showSpeedPanel.value = !showSpeedPanel.value)
const changeSpeed = (rate: number) => {
  playbackRate.value = rate
  if (video.value) video.value.playbackRate = rate
  showSpeedPanel.value = false
}

function canPlayHLSNatively() {
  const testVideo = document.createElement('video')
  return testVideo.canPlayType('application/vnd.apple.mpegurl') !== ''
}

const ua = navigator.userAgent
const isAndroid = /Android/i.test(ua)
const isIOS = /iP(hone|od|ad)/i.test(ua)
const isMobile = /Android|webOS|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(ua)
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
const isCNBrowser = /Quark|QQBrowser|UCBrowser|UBrowser|VivoBrowser|HuaweiBrowser|MiuiBrowser|Sogou|360|Baidu|HeyTapBrowser|OPPO|Qiyu|MetaSr/i.test(ua)
const isUseNative = isMobile && (isCNBrowser || canPlayHLSNatively())

const videoStyle = computed<CSSProperties>(() => {
  return showNativeControls.value
    ? {}
    : { pointerEvents: hasPlayed.value ? 'auto' : 'none' }
})


function handleWrapperClick() {
  if (!hasPlayed.value) {
  emit('requestPlay')
  return
}
  if (!showNativeControls.value) toggleControlBar()
}

async function handleFirstPlay() {
  hasPlayed.value = true;

  nextTick(() => {
    const el = video.value;
    if (!el || !props.src) return;

    el.removeAttribute('src');
    el.load();

    if (!isUseNative && Hls.isSupported() && props.src.endsWith('.m3u8')) {
      if (hls.value) hls.value.destroy();
      hls.value = new Hls();
      hls.value.loadSource(props.src);
      hls.value.attachMedia(el);
      console.log('[VideoPlayer] hls.js 初始化:', props.src);
      // HLS 就绪后再播放，避免并发中断
      hls.value.on(Hls.Events.MANIFEST_PARSED, () => {
        safePlay();
      });
    } else {
      if (hls.value) {
        hls.value.destroy();
        hls.value = null;
      }
      el.src = props.src;
      console.log('[VideoPlayer] 原生src初始化:', props.src);
      // 原生等 canplay 再播一次
      el.addEventListener('canplay', () => safePlay(), { once: true });
    }

    el.style.pointerEvents = 'auto';
    el.playbackRate = playbackRate.value;

    showNativeControls.value = isUseNative;
    if (!isUseNative) {
      showControls.value = true;
      startAutoHideControlBar();
    }
  });
}

// 封装安全播放，避免并发 & 忽略 AbortError
async function safePlay() {
  const el = video.value;
  if (!el) return;
  if (!el.paused || playingPromise) return; // 已在播或正在发起播放
  try {
    playingPromise = el.play();
    await playingPromise;
    isPlaying.value = true;
  } catch (e: any) {
    if (!(e && (e.name === 'AbortError' || e.code === 20))) {
      console.warn('[VideoPlayer] 播放失败:', e);
    }
  } finally {
    playingPromise = null;
  }
}

function safePause() {
  const el = video.value;
  if (!el) return;
  if (el.paused) return;
  el.pause();
  isPlaying.value = false;
}

const seek = (seconds: number) => {
  if (!video.value) return
  video.value.currentTime = Math.min(Math.max(0, video.value.currentTime + seconds), duration.value)
  startAutoHideControlBar()
}

const togglePlay = () => {
  if (!video.value) return
  if (video.value.paused) {
    safePlay()
    isPlaying.value = true
  } else {
    safePause()
  }
  startAutoHideControlBar()
}

const toggleMute = () => {
  if (!video.value) return
  video.value.muted = !video.value.muted
  isMuted.value = video.value.muted
  startAutoHideControlBar()
}

const onLoaded = () => {
  duration.value = video.value?.duration || 0
}

const onSeeking = () => {
  isDragging = true
  clearTimeout(controlBarTimeout!)
}

const onSeekEnd = () => {
  if (!video.value) return
  video.value.currentTime = progressValue.value
  isDragging = false
  startAutoHideControlBar()
}

const formatTime = (t: number) => {
  const m = String(Math.floor(t / 60)).padStart(2, '0')
  const s = String(Math.floor(t % 60)).padStart(2, '0')
  return `${m}:${s}`
}

const bufferStyle = computed(() => {
  const played = (progressValue.value / duration.value) * 100
  const buffered = (bufferedEnd.value / duration.value) * 100
  return {
    background: `linear-gradient(to right, #f00 0%, #f00 ${played}%, #aaa ${played}%, #aaa ${buffered}%, #444 ${buffered}%, #444 100%)`
  }
})

const rafUpdate = () => {
  if (
    video.value &&
    !isDragging &&
    !showNativeControls.value &&
    !video.value.paused
  ) {
    currentTime.value = video.value.currentTime
    duration.value = video.value.duration
    progressValue.value = video.value.currentTime
    const buf = video.value.buffered
    if (buf.length) bufferedEnd.value = buf.end(buf.length - 1)
  }
  requestAnimationFrame(rafUpdate)
}
rafUpdate()

function toggleControlBar() {
  showControls.value = true
  startAutoHideControlBar()
}

function startAutoHideControlBar() {
  clearTimeout(controlBarTimeout!)
  controlBarTimeout = setTimeout(() => (showControls.value = false), 2500)
}

function handleFullscreen() {
  const el = wrapperRef.value
  if (!el) return
  if (!document.fullscreenElement) {
    el.requestFullscreen()
    showNativeControls.value = false
  } else {
    document.exitFullscreen()
  }
}

function onEnterNativeFullscreen() {
  isFullscreen.value = true
  showNativeControls.value = isUseNative
}

function onExitNativeFullscreen() {
  isFullscreen.value = false
  showNativeControls.value = isUseNative
  if (document.fullscreenElement) document.exitFullscreen()
}

function onNativePlay() {
  hasPlayed.value = true
  isPlaying.value = true
  emit('play')
}

// 添加错误处理函数
function onVideoError(e: Event) {
  console.error('视频加载错误', e)
  if (video.value) {
    // 重置播放状态
    hasPlayed.value = false
    isPlaying.value = false
    // 显示错误信息
    showToast('视频加载失败，请重试')
  }
}

onMounted(() => {
  const el = video.value
  if (!el) return

  el.addEventListener('error', onVideoError)

  showNativeControls.value = isUseNative
  if (!isUseNative && Hls.isSupported() && props.src && props.src.endsWith('.m3u8')) {
    hls.value = new Hls()
    hls.value.loadSource(props.src)
    hls.value.attachMedia(el)
  } else {
    el.src = props.src || ''
  }

  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement
  })
})

onBeforeUnmount(() => {
  if (video.value) {
    // ✅ 移除错误监听
    video.value.removeEventListener('error', onVideoError)
    video.value.pause()
    video.value.removeAttribute('src')
    video.value.load()
  }
  hls.value?.destroy()
  clearTimeout(controlBarTimeout!)
})
defineExpose({
  handleFirstPlay
})
// 👇 关键watch，彻底解决切换问题
watch(
  () => props.src,
  (newSrc) => {
    const el = video.value;
    if (!el || !newSrc) return;

    console.log('[VideoPlayer] 监听到src变化:', newSrc);

    // 清空 src，确保浏览器重置
    el.removeAttribute('src');
    el.load();

    if (!isUseNative && Hls.isSupported() && newSrc.endsWith('.m3u8')) {
      if (hls.value) {
        hls.value.destroy();
      }
      hls.value = new Hls();
      hls.value.loadSource(newSrc);
      hls.value.attachMedia(el);
      console.log('[VideoPlayer] hls.js 已加载新地址:', newSrc);
    } else {
      if (hls.value) {
        hls.value.destroy();
        hls.value = null;
      }
      el.src = newSrc;
      console.log('[VideoPlayer] 直接使用原生src:', newSrc);
    }
  },
  { immediate: false }
);

</script>
<style scoped>
.video-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: black;
}
.video-wrapper.fullscreen,
.video-wrapper:fullscreen {
  width: 100vw !important;
  height: 100vh !important;
  background: #000;
  pointer-events: auto;
  z-index: 1;
  overflow: visible;
}
.video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.video-poster {
  width: 100%;
  height: 100%;
  object-fit: contain;
  cursor: pointer;
}
.center-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.5);
  border-radius: 50%;
  width: 19.2vw;
  height: 19.2vw;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  cursor: pointer;
  pointer-events: auto;
}
.play-icon {
  width: 8.53vw;
  height: 8.53vw;
}
.spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8vw;
  height: 8vw;
  border: 0.8vw solid rgba(255,255,255,0.3);
  border-top: 0.8vw solid white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  transform: translate(-50%, -50%);
  z-index: 4;
}
@keyframes spin {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}
.control-bar {
  display: flex;
  align-items: center;
  gap: 2.66vw;
  padding: 1.6vw 3.2vw;
  background: rgba(0,0,0,0.7);
  color: white;
  font-size: clamp(12px, 3.46vw, 16px);  /* 小屏不小于12px */
  z-index: 20;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  border-radius: 0 0 3.2vw 3.2vw;
  opacity: 1;
  transition: opacity 0.3s;
}
.control-bar[style*="display: none"] {
  opacity: 0;
  pointer-events: none;
}
.progress-container {
  position: relative;
  flex: 1;
  height: 3.2vw;
  display: flex;
  align-items: center;
}
.progress-container.dragging .buffered {
  height: 2.66vw;
}
.buffered {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  height: 1.06vw;
  border-radius: 1.06vw;
  background: #444;
  pointer-events: none;
  z-index: 1;
  transition: height 0.2s ease;
}
.progress {
  width: 100%;
  background: transparent;
  appearance: none;
  position: relative;
  z-index: 2;
  height: 1.06vw;
  margin: 0;
  padding: 0;
  cursor: pointer;
  transition: height 0.2s ease;
}
.progress.dragging {
  height: 2.66vw;
}
.progress::-webkit-slider-thumb {
  width: 3.73vw;
  height: 3.73vw;
  background: white;
  border-radius: 50%;
  appearance: none;
  margin-top: -0.8vw;
  transition: transform 0.2s ease;
}
.progress.dragging::-webkit-slider-thumb {
  transform: scale(1.2);
}
.time {
  font-size: clamp(12px, 3.2vw, 16px);
  color: white;
  min-width: 12vw;
  text-align: center;
}
.btn {
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.icon {
  width: 5.33vw;
  height: 5.33vw;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity .2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.speed-selector {
  position: relative;
  padding: 0 2.13vw;
  cursor: pointer;
  user-select: none;
}
.speed-panel {
  position: absolute;
  bottom: 8vw;
  left: 0;
  /* ✅ 用 clamp 实现大小范围 */
  width: clamp(140px, 40vw, 240px);
  background: #000;
  border-radius: 0.5rem;
  box-shadow: 0 0.3rem 0.8rem rgba(0,0,0,0.5);
  z-index: 999;
  padding: 0.5rem 0; /* 上下留白 */
}
.speed-option {
  padding: 0.6rem 1rem;
  font-size: clamp(14px, 3vw, 18px);
  color: white;
  cursor: pointer;
}
.speed-option:hover {
  background: rgba(255,255,255,0.1);
}

</style>
