<template>
  <div class="play-page">
    <div class="back-btn" @click="goBack">
      <img src="/icons/back1.svg" alt="返回" />
    </div>

    <VideoPlayer
      ref="playerRef"
      :src="videoUrl"
      :poster="videoDetail?.cover_url || ''"
      @requestPlay="handlePlay"
      @play="saveViewRecord"
      @previewEnded="showMask = true"
    />

    <div class="info-box">
      <div class="video-title">{{ videoDetail?.title || '视频标题加载中...' }}</div>
      <div class="tags">
        <span class="tag" v-for="tag in videoDetail?.tags || []" :key="tag">#{{ tag }}</span>
        <div class="switch-line-btn" @click="showLineSelector = true">
          <img src="/icons/line-switch.svg" class="icon" alt="线路图标" />
          切换线路
        </div>
      </div>
      <div class="meta">
        播放量：{{ formatViews(views) }} &nbsp;&nbsp; 推荐率：100%
      </div>
      <div
  class="meta"
  style="position: relative; display: flex; align-items: center; min-height: 32px;"
>
  <div style="flex:1;">
    剩余观看次数：
    <span v-if="isRemainingLoading">加载中...</span>
    <span v-else>{{ userStore.longVideoRemaining }}</span>
  </div>
  <!-- VIP角标 -->
  <CardCornerIcon
    v-if="showVipCorner"
    :showVipTip="true"
    :coinAmount="videoDetail?.coin"
    @vipClick="showVipModal = true"
    class="corner-absolute"
  />
  <!-- 金币角标 -->
  <CardCornerIcon
    v-else-if="showCoinCorner"
    :showCoinTip="true"
    :coinAmount="videoDetail?.coin"
    @coinClick="showCoinModal = true"
    class="corner-absolute"
  />
</div>
    </div>

    <div class="actions">
      <div class="action" @click="toggleLike">
        <img :src="isLiked ? '/icons/like7.svg' : '/icons/like6.svg'" class="action-icon" />
        <div class="action-text">{{ formatViews(likeCount) }}</div>
      </div>
      <div class="action" @click="toggleFavorite">
        <img :src="isFavorited ? '/icons/star7.svg' : '/icons/star6.svg'" class="action-icon" />
        <div class="action-text">
          {{ favoriteCount === null ? '加载中...' : formatViews(favoriteCount) }}
        </div>
      </div>
      <div class="action" @click="goShare">
        <img src="/icons/share2.svg" class="action-icon" />
        <div class="action-text">分享</div>
      </div>
    </div>

    <!-- 1. 猜你喜欢组件调用 -->
    <GuessYouLike :videoId="videoDetail?.id || 0" :type="videoDetail?.type || 'long'" @play="goToPlay" />
      
    

    <div v-if="showLineSelector" class="overlay" @click.self="showLineSelector = false">
      <div class="line-popup">
        <div class="popup-option title">选择线路</div>
        <div
          class="popup-option"
          :class="{ active: selectedLine === 'normal' }"
          @click="selectLine('normal')"
        >普通线路</div>
        <div
          class="popup-option"
          :class="{ active: selectedLine === 'vip' }"
          @click="selectLine('vip')"
        >VIP线路</div>
        <div class="popup-option cancel" @click="showLineSelector = false">取消</div>
      </div>
    </div>

    <div v-if="showVipModal" class="vip-modal-mask" @click.self="showVipModal = false">
      <div class="vip-modal">
        <div class="vip-title">温馨提示</div>
        <div class="vip-desc">
          视频免费观看解锁次数已用完，开通VIP可畅享免费解锁<br />
          邀请好友注册立刻送3天VIP
        </div>
        <div class="vip-actions">
          <button class="btn orange" @click="goInvite">分享得VIP</button>
          <button class="btn red" @click="goVip">立即开通VIP</button>
        </div>
      </div>
    </div>

    <!-- 金币购买底部弹窗（简洁风格） -->
    <div v-if="showCoinModal && !videoDetail?.unlocked" class="coin-sheet-mask" @click.self="showCoinModal = false">
      <div class="coin-sheet-simple">
        <div class="coin-sheet-title">购买单部金币视频</div>
        <div class="coin-sheet-row">
          <span>金币余额：{{ userStore.userInfo.goldCoins || '0.00' }}</span>
          <button class="coin-sheet-btn" @click="goRecharge">立即充值</button>
        </div>
        <div class="coin-sheet-row">
          <span>支付金额</span>
          <span class="coin-sheet-amount">{{ videoDetail?.coin }}金币</span>
        </div>
        <div class="coin-sheet-row coin-sheet-discount">
          <span>您当前不享受折扣优惠</span>
          <span class="coin-sheet-vip" @click="goVip">购买VIP享受折扣</span>
        </div>
        <div class="coin-sheet-row">
          <span>实际支付</span>
          <span class="coin-sheet-amount">{{ videoDetail?.coin }}金币</span>
        </div>
        <button class="coin-sheet-buy-btn" @click="buySingleCoin">立即购买</button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import VideoPlayer from '@/components/VideoPlayer.vue'
import GuessYouLike from '@/components/GuessYouLike.vue'
import CardCornerIcon from '@/components/CardCornerIcon.vue'
import { useHistoryStore } from '@/store/useHistoryStore'
import { showToast, showConfirmDialog } from 'vant'
import { useUserStore } from '@/store/user'
import { useLongVideoStore } from '@/store/longVideoStore'
import { encode, decode } from '@/utils/base62'
import { trackLongVideoAction } from '@/api/longVideo.api'; // 导入 API 方法
import { useDarknetStore } from '@/store/darknet.store'
import { unlockStarVideo, unlockAnimeVideo } from '@/api/unlock.api'
import { likeContent, collectContent, unlikeContent, uncollectContent, getActionStatus } from '@/api/userAction.api'
const route = useRoute()
const router = useRouter()
const historyStore = useHistoryStore()
const userStore = useUserStore()
const longVideoStore = useLongVideoStore()
const isRemainingLoading = ref(false);
// 播放器实例引用
const playerRef = ref<InstanceType<typeof VideoPlayer> | null>(null)

// 详情数据
const videoDetail = ref<any>(null)

// 播放地址 - 初始化为null而不是空字符串
const videoUrl = ref<string | null>(null)

// 标签、播放量等显示字段
const tags = ref<string[]>([])
const views = ref<number>(0)
const likeCount = ref<number>(0); // 初始值为 0
const favoriteCount = ref<number | null>(null)

// 弹窗状态
const showLineSelector = ref(false)
const showVipModal = ref(false)
const showMask = ref(false)
const showCoinModal = ref(false)

const userId = userStore.uuid

// 点赞收藏状态
const isLiked = ref(false);
const isFavorited = ref(false);

const type = computed(() => route.query.type || videoDetail.value?.type || 'long')

async function loadVideoDetail() {
  try {
    const videoId = Number(route.params.id);
    if (isNaN(videoId) || videoId <= 0) {
      showToast('视频ID无效');
      return;
    }
    await longVideoStore.loadDetail(videoId, userStore.uuid || 'guest', type.value);
    videoDetail.value = longVideoStore.detail;
    

    if (!videoDetail.value) {
      showToast('视频详情加载失败')
      return
    }

    // 更新显示数据
    tags.value = videoDetail.value.tags || []
    views.value = videoDetail.value.play || 0
    likeCount.value = videoDetail.value.like || 0;
    favoriteCount.value = videoDetail.value.collect ?? videoDetail.value.collect_count ?? 0

  } catch (err: any) {
    console.error('加载视频详情失败', err)
    showToast(err.message || '加载失败')
  }
}
async function handlePlay() {
  try {
    const videoId = Number(route.params.id);
    if (isNaN(videoId) || videoId <= 0) {
      showToast('视频ID无效');
      return;
    }
    const res = await longVideoStore.fetchPlayUrl({
      video_id: videoId,
      userId: userStore.uuid || 'guest',
      type: type.value,
    });

    const canViewVip = userStore.userInfo.can_view_vip_video === 1;
    const canWatchCoin = userStore.userInfo.can_watch_coin === 1;
    const isCoinVideo = videoDetail.value?.coin > 0;
    const isVipVideo = videoDetail.value?.vip;
    const isFreeVideo = !isVipVideo && !isCoinVideo;
    const canTryWatch = !userStore.isVIP && userStore.longVideoRemaining > 0;

    // 免费视频直接播放
    if (isFreeVideo) {
      if (!res || !res.url) {
        showToast('播放地址获取失败，请稍后重试');
        return;
      }
      videoUrl.value = res.url;
      playerRef.value?.handleFirstPlay();
      return;
    }

    // 已解锁直接播放
    if (res && res.unlocked && res.url) {
      videoUrl.value = res.url;
      playerRef.value?.handleFirstPlay();
      return;
    }

    // 【关键】试看次数作为万能钥匙 - 优先检查
    if (canTryWatch) {
      console.log('使用试看次数播放，剩余次数:', userStore.longVideoRemaining);
      if (!res || !res.url) {
        showToast('播放地址获取失败，请稍后重试');
        return;
      }
      videoUrl.value = res.url;
      playerRef.value?.handleFirstPlay();
      return;
    }

    // 没有权限且没有剩余次数，弹窗拦截
    if (
      (!canViewVip && isVipVideo && !canTryWatch) ||
      (!canWatchCoin && isCoinVideo && !canTryWatch)
    ) {
      showVipModal.value = true;
      return;
    }

    // 金币视频未解锁且不能看金币，弹金币弹窗
    if (isCoinVideo && !canWatchCoin && !res?.unlocked && !canTryWatch) {
      showCoinModal.value = true;
      return;
    }

    // VIP视频专门处理 - 保留一个就够了
    if (isVipVideo && !canViewVip && !canTryWatch) {
      showVipModal.value = true;
      return;
    }
    // 其它情况
    if (!res || res.code === 403) {
      await showConfirmDialog({
        title: '温馨提示',
        message: res?.msg || '长视频观看次数已用完，请开通VIP',
        confirmButtonText: '立即开通',
        cancelButtonText: '取消',
        className: 'vip-dialog',
        closeOnClickOverlay: true,
      })
        .then(() => {
          router.push('/vip');
        })
        .catch(() => {
          console.log('用户取消了开通VIP弹窗');
        });
      return;
    }

    if (!res.url) {
      showToast('播放地址获取失败，请稍后重试');
      return;
    }

    videoUrl.value = res.url;
    playerRef.value?.handleFirstPlay();
  } catch (err) {
    showToast('播放失败，请稍后重试');
  }
}
// 获取内容类型 - 只处理长视频、暗网、动漫
function getContentType(): string {
  // 1. 优先使用路由查询参数中的 from 或 type
  const routeFrom = route.query.from as string;
  const routeType = route.query.type as string;
  
  // 2. 根据来源页面确定类型
  if (routeFrom === 'darknet' || routeType === 'darknet') {
    return 'darknet'; // Darknet 独立类型
  }
  if (routeFrom === 'anime' || routeType === 'anime') {
    return 'anime'; // 动漫保持独立类型
  }
  if (routeFrom === 'star' || routeType === 'star') return 'star';   // ★ 新增
  
  // 3. 根据视频详情的 type 字段判断
  const videoType = videoDetail.value?.type;
  if (videoType === 4 || videoType === 'darknet') {
    return 'darknet'; // Darknet 独立类型
  }
  if (videoType === 'anime') {
    return 'anime'; // 动漫保持独立类型
  }
  if (videoType === 8 || videoType === 'star') return 'star';          // ★ 新增
  
  // 4. 默认为长视频
  return 'long_video';
}

function toggleLike() {
  const videoId = Number(route.params.id);
  if (isNaN(videoId) || videoId <= 0) {
    showToast('视频ID无效');
    return;
  }

  const contentType = getContentType();
  const currentLiked = isLiked.value;
  
  // 先更新UI，提供即时反馈
  isLiked.value = !currentLiked;
  likeCount.value += currentLiked ? -1 : 1;
  
  // 调用真实API
  const apiCall = currentLiked ? unlikeContent(videoId, contentType) : likeContent(videoId, contentType);
  
  apiCall
    .then(() => {
      showToast(isLiked.value ? '点赞成功' : '取消点赞');
    })
    .catch((err) => {
      console.error('点赞操作失败', err);
      // 如果API调用失败，回滚UI状态
      isLiked.value = currentLiked;
      likeCount.value += currentLiked ? 1 : -1;
      showToast('操作失败，请重试');
    });

  // 保留原有埋点逻辑 - 只记录操作行为，不区分取消
  trackLongVideoAction({ 
    id: videoId, 
    type: contentType, 
    action: 'like',
    user_uuid: userStore.uuid // 可选：记录用户信息用于统计
  })
    .catch(err => console.error('点赞埋点触发失败', err));
}

function toggleFavorite() {
  const videoId = Number(route.params.id);
  if (isNaN(videoId) || videoId <= 0) {
    showToast('视频ID无效');
    return;
  }

  const contentType = getContentType();
  const currentFavorited = isFavorited.value;
  
  // 先更新UI，提供即时反馈
  isFavorited.value = !currentFavorited;
  favoriteCount.value += currentFavorited ? -1 : 1;
  
  // 调用真实API
  const apiCall = currentFavorited ? uncollectContent(videoId, contentType) : collectContent(videoId, contentType);
  
  apiCall
    .then(() => {
      showToast(isFavorited.value ? '已加入收藏' : '取消收藏');
    })
    .catch((err) => {
      console.error('收藏操作失败', err);
      // 如果API调用失败，回滚UI状态
      isFavorited.value = currentFavorited;
      favoriteCount.value += currentFavorited ? 1 : -1;
      showToast('操作失败，请重试');
    });

  // 保留原有埋点逻辑 - 只记录操作行为，不区分取消
  trackLongVideoAction({ 
    id: videoId, 
    type: contentType, 
    action: 'collect',
    user_uuid: userStore.uuid // 可选：记录用户信息用于统计
  })
    .catch(err => console.error('收藏埋点触发失败', err));
}

function goShare() {
  router.push({ name: 'PromotionShare' });
}
function goBack() {
  const from = sessionStorage.getItem('return-from')
  if (from === 'star') {
    sessionStorage.removeItem('return-from')
    sessionStorage.removeItem('last-star')
    router.back()
  } else if (from === 'darknet') {
    sessionStorage.removeItem('return-from')
    router.replace({ name: 'Darknet' })
  } else if (from === 'anime') {
    sessionStorage.removeItem('return-from')
    router.replace({ name: 'Acg' })
  } else {
    router.back()
  }
}

const selectedLine = ref<'normal' | 'vip'>('normal') // 默认普通线路

function selectLine(type: 'vip' | 'normal') {
  if (type === 'vip') {
    if (userStore.userInfo.vip_status === 1) {
      selectedLine.value = 'vip' // VIP用户才高亮
      if (route.query.vipSrc) {
        videoUrl.value = route.query.vipSrc as string
      }
      showLineSelector.value = false
      showMask.value = false
      return
    }
    // 普通用户，弹VIP弹窗，不高亮
    showVipModal.value = true
    return
  }
  // 普通线路
  selectedLine.value = 'normal'
  videoUrl.value = videoDetail.value?.url || null
  showLineSelector.value = false
  showMask.value = false
}
function goVip() {
  showVipModal.value = false
  router.push({ name: 'Vip' })
}
function goInvite() {
  router.push({ name: 'PromotionShare' })
}

interface RecommendedItem {
  id: number
  src: string
  cover: string
  title: string
  tag: string
  type?: string
}
function goToPlay(item: RecommendedItem) {
  if (!sessionStorage.getItem('first-play-from')) {
    sessionStorage.setItem('first-play-from', location.pathname + location.search)
  }
  router.replace({
    path: `/play/${encode(item.id)}`,
    query: { type: item.type || 'long' },
  });
}

function saveViewRecord() {
  historyStore.addRecord({
    id: videoUrl.value,
    type: 'video',
    time: new Date().toLocaleString(),
    data: {
      title: videoDetail.value?.title || '未知标题',
      cover: videoDetail.value?.cover_url || '',
    },
  })
}

function formatViews(val: number | string): string {
  const n = Number(val)
  if (isNaN(n)) return String(val)
  if (n >= 10000) return (n / 10000).toFixed(2) + 'w'
  else if (n >= 1000) return (n / 1000).toFixed(2) + 'k'
  else return n.toString()
}

// 获取用户操作状态
async function getUserActionStatus() {
  try {
    // 检查用户是否登录
    if (!userStore.uuid) {
      console.log('用户未登录，跳过获取操作状态');
      return;
    }
    
    const videoId = Number(route.params.id);
    if (isNaN(videoId) || videoId <= 0) {
      console.log('视频ID无效，跳过获取操作状态');
      return;
    }
    
    const contentType = getContentType();
    console.log('获取用户操作状态 - videoId:', videoId, 'contentType:', contentType);
    
    const res = await getActionStatus(videoId, contentType);
    console.log('获取用户操作状态响应:', res);
    
    // 兼容多种返回格式
    let dataSource = null;
    if (res && res.data) {
      dataSource = res.data;
    } else if (res && (res.isLiked !== undefined || res.liked !== undefined)) {
      dataSource = res;
    }
    
    if (dataSource) {
      // 支持多种字段名格式：isLiked/isCollected, is_liked/is_collected, liked/collected
      const isLikedField = dataSource.isLiked !== undefined ? dataSource.isLiked : 
                          (dataSource.is_liked !== undefined ? dataSource.is_liked : dataSource.liked);
      const isCollectedField = dataSource.isCollected !== undefined ? dataSource.isCollected : 
                              (dataSource.is_collected !== undefined ? dataSource.is_collected : dataSource.collected);
      
      // 确保布尔值转换正确
      const newIsLiked = Boolean(isLikedField);
      const newIsFavorited = Boolean(isCollectedField);
      
      console.log('解析状态 - isLiked:', newIsLiked, 'isFavorited:', newIsFavorited);
      console.log('原始字段值 - isLikedField:', isLikedField, 'isCollectedField:', isCollectedField);
      
      isLiked.value = newIsLiked;
      isFavorited.value = newIsFavorited;
    } else {
      console.log('API返回数据格式不正确:', res);
    }
  } catch (err) {
    console.error('获取用户操作状态失败', err);
    // 获取状态失败不影响页面正常使用
  }
}

const recommended = ref<RecommendedItem[]>(
  [
    {
      id: 1,
      src: 'https://zh.sydneyssong.net/001/xxx/xxx.m3u8',
      cover: 'https://dummyimage.com/360x202/333/fff&text=推荐1',
      title: '标题1',
      tag: '表表',
    },
    {
      id: 2,
      src: 'https://zh.sydneyssong.net/001/yyy/yyy.m3u8',
      cover: 'https://dummyimage.com/360x202/555/fff&text=推荐2',
      title: '标题2',
      tag: '表表2',
    },
  ]
)

onMounted(async () => {
  console.log('PlayPage mounted - 开始初始化');
  
  // 重置状态
  isLiked.value = false;
  isFavorited.value = false;
  
  isRemainingLoading.value = true;
  await userStore.fetchUserInfo();
  const idStr = route.params.id as string;
  if (idStr) {
    console.log('加载视频详情 - videoId:', idStr);
    await loadVideoDetail();
    // 加载完视频详情后，获取用户操作状态
    console.log('获取用户操作状态...');
    await getUserActionStatus();
  }

  if (videoDetail.value?.unlocked) {
    isRemainingLoading.value = false;
    return;
  }

  const videoId = Number(route.params.id);
  if (!isNaN(videoId) && videoId > 0) {
    const type = videoDetail.value?.type || 'long';
    trackLongVideoAction({ 
      id: videoId, 
      type, 
      action: 'view',
      user_uuid: userStore.uuid // 添加用户UUID，同时记录浏览记录
    })
      .catch(err => console.error('浏览埋点触发失败', err));
  }
  isRemainingLoading.value = false;

  // 细致弹窗逻辑
  const canViewVip = userStore.userInfo.can_view_vip_video === 1;
  const canWatchCoin = userStore.userInfo.can_watch_coin === 1;
  const isCoinVideo = videoDetail.value?.coin > 0;
  const isVipVideo = videoDetail.value?.vip;
  const isFreeVideo = !isVipVideo && !isCoinVideo;
  const canTryWatch = !userStore.isVIP && userStore.longVideoRemaining > 0; // 新增

  // ★★★ 只加这一段，免费视频不弹窗 ★★★
  if (isFreeVideo) {
    return;
  }

  // 1. 既不能看VIP也不能看金币，且没有剩余次数，弹VIP弹窗
  if (!canViewVip && !canWatchCoin && !canTryWatch) {
    showVipModal.value = true;
    return;
  }
  // 2. VIP视频，普通用户有剩余次数，可以试看
  if (isVipVideo && !canViewVip && canTryWatch) {
    // 允许试看，不弹窗
    return;
  }
  // 3. VIP视频，普通用户没剩余次数，弹VIP弹窗
  if (isVipVideo && !canViewVip && !canTryWatch) {
    showVipModal.value = true;
    return;
  }
  // 4. 普通试看用户且次数为0，弹VIP弹窗
  if (!userStore.isVIP && userStore.longVideoRemaining === 0) {
    showConfirmDialog({
      title: '温馨提示',
      message: '今日试看次数已用完，请开通VIP',
      confirmButtonText: '立即开通',
      cancelButtonText: '取消',
      className: 'vip-dialog',
      closeOnClickOverlay: true,
    })
      .then(() => {
        router.push('/vip');
      })
      .catch(() => {
        console.log('用户取消了开通VIP弹窗');
      });
  }
})

// 监听 userStore.uuid，当可用时调用剩余次数接口
watch(() => userStore.uuid, (newUuid) => {
  if (newUuid) {
    userStore.fetchLongVideoRemaining()
  }
}, { immediate: true })

watch(videoUrl, (val) => {
  // 可以在这里添加必要的逻辑
})

// 监听路由ID变化，每次都重新load
watch(
  () => [route.params.id, route.query.type],
  async ([newId, newType]) => {
    if (newId) {
      // 先重置点赞收藏状态
      isLiked.value = false;
      isFavorited.value = false;
      
      await loadVideoDetail()
      // 重新获取用户操作状态
      await getUserActionStatus()
      videoUrl.value = null
    }
  },
  { immediate: false }
)

const testId = 13
const encoded = encode(testId)
const decoded = decode(encoded)

async function buySingleCoin() {
  if (userStore.userInfo.goldCoins < videoDetail.value.coin) {
    showToast('金币余额不足，请先充值')
    return
  }
  try {
    // 判断暗网视频（type为4或'darknet'）
    if (videoDetail.value?.type === 4 || type.value === 'darknet') {
      const darknetStore = useDarknetStore()
      await darknetStore.unlockVideo(videoDetail.value.id)
    } else if (
      type.value === 'anime' ||
      videoDetail.value?.type === 'anime' ||
      videoDetail.value?.type === 5          // 兼容数值型
    ) {
      await unlockAnimeVideo({ video_id: videoDetail.value.id })  // ★ 新增动漫解锁
    } else if (type.value === 'star' || videoDetail.value?.type === 'star' || videoDetail.value?.type === 8) {
      await unlockStarVideo({ video_id: videoDetail.value.id })             // ★ 新增星际解锁
    } else {
      await longVideoStore.buySingleVideo({
        videoId: videoDetail.value.id,
        coin: videoDetail.value.coin,
        userId: userStore.uuid
      })
    }
    showToast('购买成功，已解锁！')
    showCoinModal.value = false
    videoDetail.value.unlocked = true
    await userStore.fetchUserInfo()
  } catch (e) {
    console.error('购买失败', e)
    showToast('购买失败，请重试')
  }
}

function goRecharge() {
  router.push({ path: '/vip', query: { tab: 'coin' } })
}

const isVipCard = computed(() =>
  userStore.userInfo.can_view_vip_video === 1 && userStore.userInfo.can_watch_coin !== 1
)
const isCoinCard = computed(() =>
  userStore.userInfo.can_watch_coin === 1 && userStore.userInfo.can_view_vip_video !== 1
)
const isSuperCard = computed(() =>
  userStore.userInfo.can_view_vip_video === 1 && userStore.userInfo.can_watch_coin === 1
)
const isNormalUser = computed(() =>
  userStore.userInfo.can_view_vip_video !== 1 && userStore.userInfo.can_watch_coin !== 1
)

const isVipVideo = computed(() => videoDetail.value?.vip)
const isCoinVideo = computed(() => videoDetail.value?.coin > 0)
const isUnlocked = computed(() => videoDetail.value?.unlocked)

const showVipCorner = computed(() =>
  userStore.userInfo &&
  !isSuperCard.value &&
  (
    (isCoinCard.value && isVipVideo.value) ||
    (isNormalUser.value && isVipVideo.value)
  )
)

const showCoinCorner = computed(() =>
  userStore.userInfo &&
  !isSuperCard.value &&
  (
    (isVipCard.value && isCoinVideo.value && !isUnlocked.value) ||
    (isNormalUser.value && isCoinVideo.value && !isUnlocked.value)
  )
)


</script>

<style scoped>
.play-page {
  background: #fff;
  padding-bottom: 16vw; /* 约 60px */
  min-height: 100vh;
  position: relative;
}
.video {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: contain;
  background-color: black;
}
.back-btn {
  position: fixed;
  top: 7vw;   /* 约 26px */
  left: 1.5vw; /* 约 6px */
  z-index: 9999;
  pointer-events: auto;
}
.back-btn img {
  width: 6vw;
  height: 6vw;
  cursor: pointer;
}
.preview-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  font-size: 4vw;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 5vw;
  z-index: 10;
}
.info-box {
  padding: 2.7vw 3.2vw;
}
.video-title {
  font-size: 4.2vw;
  font-weight: bold;
  color: #111;
  margin-bottom: 1.6vw;

  /* 只显示两行，超出省略 */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.35;
  max-height: 2.7em;
  word-break: break-all;
}
.tags {
  display: flex;
  align-items: center;
  gap: 1.6vw;
  flex-wrap: wrap;
  position: relative;
}
.tag {
  font-size: 3vw;
  color: #fff;
  background-color: #f12c2c;
  border-radius: 2.6vw;
  padding: 0.5vw 2.1vw;
}
.switch-line-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  font-size: 3vw;
  color: #fff;
  background: rgba(0, 0, 0, 0.5);
  padding: 1vw 2.7vw;
  border-radius: 3.2vw;
  cursor: pointer;
}
.switch-line-btn .icon {
  width: 4vw;
  height: 4vw;
  margin-right: 1vw;
}
.meta {
  font-size: 3.5vw;
  color: #666;
  margin-top: 1.6vw;
}
.actions {
  display: flex;
  justify-content: space-around;
  padding: 2.7vw 0;
  background: #fafafa;
  border-top: 0.27vw solid #eee;
  border-bottom: 0.27vw solid #eee;
}
.action {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}
.action-icon {
  width: 6vw;
  height: 6vw;
}
.action-text {
  margin-top: 1vw;
  font-size: 3vw;
  color: #666;
}
.section-title {
  font-size: 4.2vw;
  font-weight: bold;
  color: #222;
  padding: 3.2vw;
}
.recommend-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2.7vw;
  padding: 0 3.2vw;
}
.card {
  display: flex;
  flex-direction: column;
  cursor: pointer;
}
.thumb-wrapper {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 1.6vw;
  background: #ccc;
}
.thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.text {
  margin-top: 1vw;
  font-size: 3.2vw;
  color: #111;
  line-height: 1.4;

  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
}
.mini-tag {
  display: inline-block;
  font-size: 3vw;
  color: #fff;
  background-color: #f12c2c;
  border-radius: 2.7vw;
  padding: 0.5vw 2.1vw;
  margin-top: 1vw;
  width: fit-content;
}
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 99;
  display: flex;
  justify-content: center;
  align-items: flex-end;
}
.line-popup {
  background: #fff;
  width: 100%;
  padding: 2.7vw 0;
  border-radius: 3.2vw 3.2vw 0 0;
  animation: slideUp 0.25s ease-out;
}
.popup-option {
  text-align: center;
  font-size: 4vw;
  padding: 3.2vw 0;
  cursor: pointer;
  color: #333; /* 默认灰色 */
  transition: color 0.2s;
}
.popup-option.active {
  color: #f12c2c; /* 选中时红色 */
  font-weight: bold;
}
.popup-option.title {
  font-weight: bold;
  cursor: default;
}
.popup-option.cancel {
  color: #666;
}
.vip-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: center;
}
.vip-modal {
  background: #fff;
  border-radius: 3.2vw;
  width: 80vw;
  max-width: 380px;
  padding: 5vw;
  text-align: center;
}
.vip-title {
  font-size: 4.8vw;
  font-weight: bold;
  margin-bottom: 2.7vw;
}
.vip-desc {
  font-size: 3.7vw;
  color: #333;
  margin-bottom: 5vw;
}
.vip-actions {
  display: flex;
  justify-content: space-between;
  gap: 2.7vw;
}
.btn {
  flex: 1;
  padding: 2.7vw 0;
  border-radius: 1.5vw;
  font-size: 3.7vw;
  font-weight: bold;
  border: none;
  cursor: pointer;
}
.btn.orange {
  background: linear-gradient(to right, #ffc14c, #ff8800);
  color: white;
}
.btn.red {
  background: linear-gradient(to right, #ff4d4d, #ff0066);
  color: white;
}
/* 只影响详情页的角标定位 */
.meta .vip-corner {
  position: static !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  justify-content: flex-end;
  padding-right: 0;
}
.corner-absolute {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}
.coin-sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: flex-end;
}
.coin-sheet-simple {
  width: 100vw;
  max-width: 480px;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 24px 20px 16px 20px;
  box-sizing: border-box;
  animation: slideUp 0.25s cubic-bezier(.4,0,.2,1);
}
.coin-sheet-title {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 18px;
}
.coin-sheet-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}
.coin-sheet-row:last-child {
  border-bottom: none;
}
.coin-sheet-btn {
  background: linear-gradient(90deg, #ffc14c, #ff8800);
  color: #fff;
  border: none;
  border-radius: 16px;
  padding: 4px 16px;
  font-size: 13px;
  cursor: pointer;
}
.coin-sheet-amount {
  color: #ff4d4d;
  font-weight: bold;
}
.coin-sheet-discount {
  color: #ff4dcb;
  font-size: 13px;
  border-bottom: none;
  padding-bottom: 0;
}
.coin-sheet-discount span:first-child {
  color: #ff4d4d;
  font-size: 13px;
  font-weight: normal;
}
.coin-sheet-vip {
  color: #ff4dcb;
  border: 1px solid #ff4dcb;
  border-radius: 6px;
  padding: 2px 8px;
  margin-left: 8px;
  font-size: 13px;
  cursor: pointer;
  background: #fff0fa;
}
.coin-sheet-buy-btn {
  width: 100%;
  margin-top: 20px;
  background: linear-gradient(90deg, #ff4d4d, #ff8800);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 12px 0;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}
@keyframes slideUp {
  from { transform: translateY(100%);}
  to { transform: translateY(0);}
}
</style>
