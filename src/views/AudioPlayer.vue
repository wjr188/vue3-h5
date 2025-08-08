<template>
  <div>
    <div class="audio-player" v-if="audioData">
      <!-- 顶部 -->
      <div class="header">
        <img src="/icons/back3.svg" class="header-icon" @click="goBack" />
        <span class="title">{{ audioData.title }}</span>
        <img src="/icons/share2.svg" class="header-icon" @click="goPromotion" />
      </div>

      <!-- 中间唱片 -->
      <div class="disc-wrapper">
        <div class="disc" :class="{ spinning: playing }">
          <img class="record" src="/icons/vinyl.png" alt="唱片" />
          <img class="cover" :src="audioData.cover" alt="封面" />
        </div>
        <img src="/icons/needle.png" class="needle" :class="{ active: playing }" />
      </div>

      <!-- 作者信息 -->
      <div class="author">
        演播人：{{ audioData.narrator || '未知' }}
        <span class="views-chip">
          <img src="/icons/audio.svg" class="audio-icon" />
          {{ formatViews(audioData.views) }}
        </span>
      </div>

      <div class="bottom-section">
        <!-- 操作按钮 -->
        <div class="actions">
          <div @click="toggleLike">
            <img :src="liked ? '/icons/like7.svg' : '/icons/like6.svg'" class="big-icon" />
            <span>{{ formatViews(audioData.likes) }}</span>
          </div>
          <div @click="toggleFavorite">
            <img :src="favorited ? '/icons/star7.svg' : '/icons/star6.svg'" class="big-icon" />
            <span>{{ formatCount(audioData.collects) }}</span>
          </div>
          <div @click="timerSheetVisible = true">
            <img src="/icons/clock.svg" />
            <span>定时</span>
          </div>
          <div @click="handlePurchase">
  <img src="/icons/cart.svg" />
  <span v-if="audioData?.type === 'vip' && canViewVipAudio">VIP免费看</span>
  <span v-else-if="audioData?.type === 'coin' && canWatchCoinAudio">金币免费看</span>
  <span v-else>{{ audioData?.type === 'vip' ? '开通VIP' : '单章购买' }}</span>
</div>
        </div>

        <!-- 播放进度 -->
        <div class="progress">
          <van-slider
            v-model="currentTime"
            :max="duration"
            @change="seek"
            bar-height="2px"
            button-size="14px"
          />
        </div>
        <div class="time-row">
          <span>{{ formatTime(currentTime) }}</span>
          <span>{{ formatTime(duration) }}</span>
        </div>

        <!-- 播放控制 -->
        <div class="controls">
          <img src="/icons/Table.svg" @click="playlistSheet = true" />
          <img src="/icons/Previous.svg" @click="prev" />
          <img
            :src="playing ? '/icons/pause5.svg' : '/icons/play5.svg'"
            class="play-icon"
            @click="toggle"
          />
          <img src="/icons/Next.svg" @click="next" />
          <img :src="muted ? '/icons/mute.svg' : '/icons/sound.svg'" @click="toggleMute" />
        </div>
      </div>

      <!-- 弹窗、ActionSheet等其他控件，直接放这里，无需修改 -->
      <van-action-sheet
        v-model:show="timerSheetVisible"
        title="定时关闭"
        :actions="timerOptions"
        @select="handleTimerSelect"
        close-on-click-action
        closeable
      />

      <van-action-sheet
        v-model:show="playlistSheet"
        closeable
        close-on-click-overlay
        safe-area-inset-bottom
      >
        <div class="playlist-sheet">
          <div class="playlist-header">
            <div class="sort" @click="toggleSort">
              <img :src="isAsc ? '/icons/sort-asc.svg' : '/icons/sort-desc.svg'" class="sort-icon" />
              <span>{{ isAsc ? '正序' : '倒序' }}</span>
            </div>
            <div class="title-center">播放列表</div>
            <van-icon name="cross" size="20" @click="playlistSheet = false" />
          </div>
          <div
            v-for="(item, idx) in sortedList"
            :key="item.id"
            class="playlist-item"
            :class="{ unlocked: unlockedChapterIds.includes(Number(item.id)) }"
            @click="playItem(item, idx)"
          >
            <div class="left">
  <img src="/icons/list.svg" class="list-icon" />
  <span class="name">{{ item.title }}</span>
  <!-- 免费标签 -->
  <span
    v-if="Number(item.is_vip) === 0 && Number(item.coin) === 0"
    class="badge free"
    style="margin-left: 6px;"
  >免费</span>
  <!-- VIP/金币标签 -->
  <span
    v-else
    class="badge"
    :class="item.is_vip ? 'vip' : 'coin'"
    style="margin-left: 6px;"
  >
    {{ item.is_vip ? 'VIP' : '金币' }}
  </span>
</div>
           <div class="right" v-if="!needBuyChapter(item)">
  <span style="color: #4caf50;">全免/已解锁</span>
</div>
<div class="right" v-else @click.stop="handlePurchase(item, idx)">
  <img src="/icons/cart.svg" />
  <span>购买</span>
</div>
          </div>
        </div>
      </van-action-sheet>

      <van-popup
        v-model:show="coinPopup"
        close-on-click-overlay
        :style="{ maxWidth: '90%', width: '500px', borderRadius: '12px' }"
      >
        <div class="popup-box">
          <h3>温馨提示</h3>
          <p class="popup-text">金币余额不足，是否立即充值</p>
          <div class="popup-actions">
            <button class="gray-btn" @click="coinPopup = false">取消</button>
            <button class="orange-btn" @click="goCoinRecharge">立即充值</button>
          </div>
        </div>
      </van-popup>

      <van-popup
        v-model:show="vipPopup"
        close-on-click-overlay
        :style="{ maxWidth: '90%', width: '500px', borderRadius: '12px' }"
      >
        <div class="popup-box">
          <h3>温馨提示</h3>
          <p class="popup-text">
            有声免费解锁次数已用完，开通VIP可畅享免费解锁<br />邀请好友注册立刻送3天VIP
          </p>
          <div class="popup-actions">
            <button class="gray-btn" @click="goPromotion">分享得VIP</button>
            <button class="orange-btn" @click="goVip">立即开通VIP</button>
          </div>
        </div>
      </van-popup>

      <van-action-sheet
        v-model:show="purchaseSheet"
        closeable
        safe-area-inset-bottom
      >
        <div class="purchase-sheet">
          <h3>购买单章金币有声</h3>
          <div class="row">
            <div>
              金币余额：{{ userStore.userInfo.goldCoins.toFixed(2) }}
            </div>
            <van-button
              type="default"
              plain
              size="small"
              @click="goCoinRecharge"
              style="border-color: #333; color: #333; font-size: 13px; border-radius: 6px; padding: 0 8px;"
            >
              立即充值
            </van-button>
          </div>
          <div class="row">
            <span>支付金额</span>
            <span class="red">{{ Number(audioData.coinPrice || 0).toFixed(2) }}金币</span>
          </div>
          <div class="notice">
            <span :class="{ orange: userDiscount >= 1, red: userDiscount < 1 }">
              {{ userDiscount < 1 ? `您享受 ${(userDiscount * 10).toFixed(1)}折优惠` : '您当前不享受折扣优惠' }}
            </span>
            <van-button type="primary" plain size="small" color="#ff69b4" @click="goVip">
              购买VIP享受折扣
            </van-button>
          </div>
          <div class="divider"></div>
          <div class="row">
            <span>实际支付</span>
            <span class="red">{{ discountedPrice.toFixed(2) }}金币</span>
          </div>
          <van-button
            type="primary"
            block
            color="#f60"
            class="buy-btn"
            @click="confirmPurchase"
          >
            立即购买
          </van-button>
        </div>
      </van-action-sheet>

      <audio
        ref="audio"
        :src="audioData?.audioUrl || ''"
        @loadedmetadata="onLoadedMetadata"
        @timeupdate="updateTime"
        @ended="playing = false"
      />
    </div>
    <!-- v-else 显示 -->
    <div v-else class="empty-data-message">
      找不到音频数据~
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { useAudioNovelCategoryStore } from '@/store/audio-novel.store'
import { useUserStore } from '@/store/user'


interface AudioItem {
  id: string | number
  title: string
  narrator: string
  cover: string
  audioUrl: string
  views: number
  likes: number
  collects: number
  coinPrice: number
  type: 'coin' | 'vip'
}

interface ChapterItem {
  id: string | number
  title: string
  duration: number // 单集时长
  audio_url: string // 播放地址
  is_vip?: number
  coin?: number
}

const router = useRouter()
const route = useRoute()
const chapterList = ref<ChapterItem[]>([])
const currentChapterIdx = ref(0)
const audioStore = useAudioNovelCategoryStore()
const audioId = computed(() => route.params.id as string | number)
const audioData = ref<AudioItem | null>(null)
const audio = ref<HTMLAudioElement | null>(null)
const playing = ref(false)
const muted = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const liked = ref(false)
const favorited = ref(false)
const userStore = useUserStore()
const unlockedChapterIds = ref<number[]>([])
const novelInfo = ref<any>({}) // 小说主信息，章节信息里没有的补展示用
const lastAudioChapterId = ref<number | string | null>(null)
const isCurrentChapterUnlocked = computed(() =>
  unlockedChapterIds.value.includes(Number(chapterList.value[currentChapterIdx.value]?.id))
);
const userDiscount = ref(1) // 默认无折扣
const discountedPrice = computed(() => {
  return audioData.value
    ? Number((audioData.value.coinPrice * userDiscount.value).toFixed(2))
    : 0
})

const isAsc = ref(true)
const playlistSheet = ref(false)
const timerSheetVisible = ref(false)
const purchaseSheet = ref(false)
const coinPopup = ref(false)
const vipPopup = ref(false)
const canViewVipAudio = ref(false)      // 是否VIP免费看
const canWatchCoinAudio = ref(false)    // 是否金币免费看



interface TimerOption { name: string }
const timerOptions: TimerOption[] = [
  { name: '不启用' },
  { name: '播放完当前声音' },
  { name: '10分钟' },
  { name: '20分钟' },
  { name: '30分钟' },
  { name: '40分钟' },
  { name: '60分钟' }
]
let timer: ReturnType<typeof setTimeout> | null = null

async function toggle() {
   console.log('当前播放章节ID:', chapterList.value[currentChapterIdx.value]?.id)
  console.log('已解锁章节ID数组:', unlockedChapterIds.value)

  if (!audio.value) return;

  const chapter = chapterList.value[currentChapterIdx.value];
  if (!chapter) {
    showToast('暂无可播放章节');
    return;
  }

  // ✅ 再次判断是否已解锁
  if (needBuyChapter(chapter)) {
  showToast('该章节尚未解锁，请先购买');
  return;
}

  const shouldReload =
    !audio.value.src ||
    audio.value.src === location.href ||
    lastAudioChapterId.value !== chapter.id;

  if (shouldReload) {
    try {
      const { audio_url } = await audioStore.playChapter(chapter.id);
      if (audio_url) {
        audio.value.src = audio_url;
        audio.value.load();
        lastAudioChapterId.value = chapter.id;
        await audio.value.play();
        playing.value = true;
      } else {
        showToast('无权播放');
        playing.value = false;
      }
    } catch (e: any) {
      showToast(e.msg || '播放失败');
      playing.value = false;
    }
  } else {
    // 切换暂停/播放状态
    if (audio.value.paused) {
      await audio.value.play();
      playing.value = true;
    } else {
      audio.value.pause();
      playing.value = false;
    }
  }
}

const sortedList = computed(() => {
  const list = isAsc.value ? chapterList.value : [...chapterList.value].reverse()
  return list
})

function handleTimerSelect(item: TimerOption) {
  if (timer) clearTimeout(timer)
  if (item.name === '不启用') {
    showToast('定时关闭已取消')
  } else if (item.name === '播放完当前声音') {
    showToast('将在当前音频结束后关闭')
    audio.value?.addEventListener('ended', stopPlaybackOnce, { once: true })
  } else {
    const minutes = parseInt(item.name)
    if (!isNaN(minutes)) {
      const ms = minutes * 60 * 1000
      timer = setTimeout(() => {
        audio.value?.pause()
        showToast('已自动停止播放')
      }, ms)
      showToast(`将在 ${minutes} 分钟后关闭`)
    }
  }
}
function stopPlaybackOnce() {
  audio.value?.pause()
  showToast('已自动停止播放')
}
function toggleLike() {
  liked.value = !liked.value
  showToast(liked.value ? '点赞成功' : '取消点赞')
}
function toggleFavorite() {
  favorited.value = !favorited.value
  showToast(favorited.value ? '收藏成功' : '取消收藏')
}

/**
 * 单章购买弹窗，只认章节 id
 */
function handlePurchase(item?: ChapterItem | Event, idx?: number) {
  // 如果第一个参数是事件对象，则重置为 undefined
  if (item && (item as Event).target !== undefined && !(item as any).id) {
    item = undefined;
  }

  let target: ChapterItem | undefined = item as ChapterItem;
  if (!target) {
    target = chapterList.value[currentChapterIdx.value]
    if (!target || !target.id) {
      target = chapterList.value.find(x => !!x.id)
    }
  }

  if (!target || !target.id) {
    showToast('暂无可购买章节')
    return
  }

  // ✅ 判断是否已解锁
  if (!needBuyChapter(target)) {
  showToast('本章已解锁或全免')
  if (!playing.value) toggle()
  return
}

  currentChapterIdx.value = idx !== undefined ? idx : chapterList.value.findIndex(x => x.id === target!.id)
  audioData.value = makeAudioData(target, novelInfo.value)

  if ((target.is_vip ? 'vip' : 'coin') === 'coin') {
    purchaseSheet.value = true
  } else {
    vipPopup.value = true
  }
}

async function confirmPurchase() {
  // 这里 id 必须是章节 id
  if (!audioData.value || !audioData.value.id) {
    showToast('章节ID异常，无法购买')
    return
  }
  if (userStore.userInfo.goldCoins < discountedPrice.value) {
    purchaseSheet.value = false
    coinPopup.value = true
    return
  }
  try {
    const res = await audioStore.unlockAudioNovelChapter(audioData.value.id)
    showToast('购买成功并解锁')
userStore.userInfo.goldCoins -= discountedPrice.value
if (!unlockedChapterIds.value.includes(Number(audioData.value.id))) {
  unlockedChapterIds.value.push(Number(audioData.value.id))
}
purchaseSheet.value = false

// ✅ 自动开始播放
toggle()
  } catch (e: any) {
    if (e.code === 2) {
      purchaseSheet.value = false
      coinPopup.value = true
    } else {
      showToast(e.msg || '购买失败')
    }
  }
}

function toggleMute() {
  if (audio.value) {
    muted.value = !muted.value
    audio.value.muted = muted.value
  }
}
function updateTime() {
  if (audio.value) {
    currentTime.value = Math.floor(audio.value.currentTime)
    duration.value = Math.floor(audio.value.duration)
  }
}
function seek(val: number) {
  if (audio.value) {
    audio.value.currentTime = val
  }
}
function formatTime(t: number) {
  if (!t || isNaN(t)) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function formatViews(v: number) {
  return v >= 10000 ? (v / 10000).toFixed(1) + 'w' : v.toString()
}
function formatCount(num: number) {
  if (num >= 10000) return (num / 10000).toFixed(2) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(2) + 'k'
  return num.toString()
}
function toggleSort() {
  isAsc.value = !isAsc.value
}

/**
 * 章节信息 + 小说主信息（只用于辅助补充字段，不会混用 id）
 */
function makeAudioData(target: any, novel: any): AudioItem {
  return {
    id: target?.id,
    title: target?.title || novel?.title || '',
    narrator: novel?.narrator || '',
    cover: novel?.cover || '/default.jpg',
    audioUrl: '',
    views: novel?.views ?? 0,
    likes: novel?.likes ?? 0,
    collects: novel?.collects ?? 0,
    coinPrice: Number(target?.coin) || Number(novel?.coin) || 0,
    type: (target?.is_vip ? 'vip' : 'coin') as 'vip' | 'coin'
  }
}
function goBack() {
  // 先读取搜索页返回标记
  if (sessionStorage.getItem('search-main-is-return')) {
    const activeTab = sessionStorage.getItem('search-main-return-tab')
    const currentTab = sessionStorage.getItem('search-main-return-type')
    const keyword = sessionStorage.getItem('search-main-keyword')
    const category = sessionStorage.getItem('search-main-category')
    const tag = sessionStorage.getItem('search-main-tag')
    const sort = sessionStorage.getItem('search-main-sort')
    const scrollTop = sessionStorage.getItem('search-main-scroll-top')

    router.replace({
      name: 'SearchMainPage',
      query: { activeTab, tabType: currentTab, keyword, category, tag, sort, scrollTop }
    })
    sessionStorage.removeItem('search-main-is-return')
    return
  }
  // 其它情况走历史返回
  window.history.back()
}
function goPromotion() { router.push('/promotion-share') }
function goVip() { router.push('/vip') }
function goCoinRecharge() { router.push('/vip?tab=coin') }
function prev() {
  if (currentChapterIdx.value <= 0) {
    showToast('这是第一首哦~');
    return;
  }
  // 切换到上一章，不自动播放
  playItem(chapterList.value[currentChapterIdx.value - 1], currentChapterIdx.value - 1);
}

function next() {
  if (currentChapterIdx.value >= chapterList.value.length - 1) {
    showToast('这是最后一首哦~');
    return;
  }
  // 切换到下一章，不自动播放
  playItem(chapterList.value[currentChapterIdx.value + 1], currentChapterIdx.value + 1);
}

function onLoadedMetadata() {
  if (audio.value) {
    duration.value = Math.floor(audio.value.duration)
  }
}

// **初始化：拉章节列表，只用 novel 字段做 audioData，首条章节播放**
onMounted(async () => {
  await userStore.fetchUserInfo?.(true)
  await audioStore.loadAudioNovelChapterList(audioId.value, { page: 1, pageSize: 50 })
  const cache = audioStore.chapterMap[String(audioId.value)]?.[1] || { list: [], novel: {} }
  chapterList.value = cache.list || []
  novelInfo.value = cache.novel || {}
  const firstChapter = chapterList.value[0]
  // 查询已解锁ID + 权限
  if (userStore.userInfo.uuid) {
    try {
      // unlockRes结构：{ unlocked: [], can_view_vip_video: 0/1, can_watch_coin: 0/1 }
      const unlockRes = await audioStore.getUnlockedAudioNovelChapters(audioId.value)
console.log('解锁权限 unlockRes:', unlockRes);
// 再赋值
unlockedChapterIds.value = (unlockRes.unlocked || []).map(Number)
canViewVipAudio.value = unlockRes.can_view_vip_video == 1
canWatchCoinAudio.value = unlockRes.can_watch_coin == 1
    } catch (e: any) {
      showToast(e.msg || '解锁记录获取失败')
    }
  }
  // 初始化主界面为第一个章节信息
  if (firstChapter) {
    audioData.value = makeAudioData(firstChapter, novelInfo.value)
    duration.value = firstChapter.duration || 0
    currentChapterIdx.value = 0
  } else if (cache.novel) {
    audioData.value = makeAudioData({}, novelInfo.value) // 只传 novel
    duration.value = 0
    currentChapterIdx.value = 0
  }
})

// 切换章节播放
function playItem(item: ChapterItem, idx?: number) {
  if (!item) return;
  currentChapterIdx.value = idx !== undefined ? idx : chapterList.value.findIndex(x => x.id === item.id);
  audioData.value = makeAudioData(item, novelInfo.value)
  duration.value = item.duration || 0;
  currentTime.value = 0;
  playing.value = false;

  if (audio.value) {
    audio.value.pause();
    audio.value.src = ''; // 清空上一个音频地址
    audio.value.load();
  }

  // ✅ 如果已解锁，自动播放
 if (!needBuyChapter(item)) {
  nextTick(() => toggle())
}

  playlistSheet.value = false
}
function needBuyChapter(chapter: ChapterItem) {
  if (!chapter) return false

  // VIP全免
  if (Number(chapter.is_vip) === 1 && canViewVipAudio.value) return false

  // 金币全免
  if (Number(chapter.is_vip) !== 1 && Number(chapter.coin) > 0 && canWatchCoinAudio.value) return false

  // 免费章节
  if (Number(chapter.coin) === 0) return false

  // 已解锁
  if (unlockedChapterIds.value.includes(Number(chapter.id))) return false

  // 其它情况都需要买
  return true
}

</script>

<style scoped>
.audio-player {
  width: 100%;
  margin: 0 auto;
  padding: 2.66vw;
  text-align: center;
  overflow: hidden;
  box-sizing: border-box;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 0.27vw solid #ddd;
  padding: 2.66vw 0;
}
.header-icon {
  width: 6.4vw;
  height: 6.4vw;
}
.title {
  font-weight: bold;
  font-size: 5vw;
}
.disc-wrapper {
  position: relative;
  width: 80%;
  padding-top: 80%;
  margin: 10vh auto 2.66vw;
}
.disc {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
}
.record {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}
.cover {
  position: absolute;
  top: 25%;
  left: 25%;
  width: 50%;
  height: 50%;
  border-radius: 50%;
}
.disc.spinning {
  animation: spin 5s linear infinite;
}
.needle {
  position: absolute;
  top: -12%;
  right: -7%;
  width: 28%;
  height: auto;
  transform-origin: top center;
  transform: rotate(-30deg);
  transition: transform 0.4s ease;
}
.needle.active {
  transform: rotate(0deg);
}
.author {
  margin: 2.66vw 0;
  font-size: 3.73vw;
}
.audio-icon {
  width: 3.73vw;
  vertical-align: middle;
}
.views {
  margin-left: 2.13vw;
  font-size: 3.2vw;
  color: #999;
}
.bottom-section {
  position: fixed;
  bottom: 2vw;
  left: 0;
  width: 100%;
  background: #fff;
  padding: 2.66vw 0;
}
.actions {
  display: flex;
  justify-content: space-between;
  padding: 0 5.33vw;
  margin: 4vw 0;
}
.actions div {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 3.2vw;
}
.actions img {
  width: 6.93vw;
  height: 6.93vw;
}
.actions img.big-icon {
  width: 8vw;
  height: 8vw;
}
.progress {
  display: flex;
  align-items: center;
  gap: 1.6vw;
  margin: 3.2vw 0 1.06vw;
  padding: 0 4.26vw;
}
.controls {
  display: flex;
  justify-content: space-around;
  margin-top: 3.2vw;
}
.controls img {
  width: 6.93vw;
  height: 6.93vw;
}
.controls .play-icon {
  width: 8vw;
  height: 8vw;
}
@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}
.empty-data-message {
  text-align: center;
  padding: 16vw;
  font-size: 4.26vw;
  color: #999;
}
.time-row {
  display: flex;
  justify-content: space-between;
  padding: 0.53vw 4.26vw 0;
  font-size: 3.2vw;
  color: #999;
}
.views-chip {
  display: inline-flex;
  align-items: center;
  background: #eee;
  color: #666;
  border-radius: 3.2vw;
  padding: 0.53vw 1.6vw;
  font-size: 3.2vw;
  margin-left: 2.13vw;
}
.views-chip .audio-icon {
  width: 3.73vw;
  margin-right: 0.8vw;
}
.popup-box {
  padding: 5.33vw;
  text-align: center;
}
.popup-box h3 {
  margin: 0;
  font-size: 4.26vw;
  font-weight: bold;
}
.popup-text {
  font-size: 3.73vw;
  color: #333;
  margin: 3.2vw 0 5.33vw;
}
.popup-actions {
  display: flex;
  gap: 3.2vw;
}
.popup-actions button {
  flex: 1;
  border: none;
  border-radius: 1.06vw;
  padding: 2.66vw 0;
  font-size: 3.73vw;
  cursor: pointer;
}
.gray-btn {
  background: #999;
  color: #fff;
}
.orange-btn {
  background: #f60;
  color: #fff;
}
.purchase-sheet {
  padding: 4.26vw;
}
.purchase-sheet h3 {
  text-align: center;
  font-weight: bold;
  font-size: 4.26vw;
  margin-bottom: 3.2vw;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 2.13vw 0;
  font-size: 4vw;
}
.notice {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 3.46vw;
  margin: 2.66vw 0;
}
.divider {
  height: 0.27vw;
  background: #eee;
  margin: 2.66vw 0;
}
.red {
  color: #f56c6c;
}
.orange {
  color: #f60;
}
.buy-btn {
  margin-top: 4.26vw;
  border-radius: 2.13vw;
}
.playlist-sheet {
  padding: 0;
}
.playlist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3.2vw 4.26vw;
  border-bottom: 0.27vw solid #eee;
}
.playlist-header .sort {
  display: flex;
  align-items: center;
  font-size: 3.73vw;
  color: #333;
  cursor: pointer;
}
.playlist-header .sort-icon {
  width: 4.26vw;
  height: 4.26vw;
  margin-right: 1.06vw;
}
.playlist-header .title-center {
  font-size: 4.26vw;
  font-weight: bold;
}
.playlist-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2.66vw 4.26vw;
  border-bottom: 0.27vw solid #eee;
}
.playlist-item .left {
  display: flex;
  align-items: center;
  flex: 1;
  overflow: hidden;
}
.playlist-item .list-icon {
  width: 4.26vw;
  height: 4.26vw;
  margin-right: 1.6vw;
}
.playlist-item .name {
  font-size: 3.73vw;
  color: #ff6699;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 1.6vw;
}
.badge {
  display: inline-block;
  padding: 0.53vw 1.6vw;
  border-radius: 3.2vw;
  font-size: 3.2vw;
  color: #fff;
}
.badge.coin {
  background: #8000ff;
}
.badge.vip {
  background: #ff69b4;
}
.right {
  display: flex;
  align-items: center;
  font-size: 3.2vw;
  color: #666;
  cursor: pointer;
}
.right img {
  width: 4.26vw;
  height: 4.26vw;
  margin-right: 1.06vw;
}
.badge.free {
  background: #b8e986;
  color: #378b00;
  border-radius: 12px;
  padding: 2px 12px;
  font-size: 3.2vw;
  margin-left: 6px;
  display: inline-block;
}

</style>
