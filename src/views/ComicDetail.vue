<template>
  <div class="comic-detail-wrapper">
    <!-- 顶部返回 -->
    <div class="top-bar">
      <img src="/icons/back3.svg" class="back-icon" @click="goBack" />
      <img src="/icons/share2.svg" class="share-icon" @click="goToShare" />
    </div>

    <!-- 头部封面 -->
    <div class="header" :style="{ backgroundImage: 'url(' + (isNovel ? novel.cover : comic.cover) + ')' }">
      <div class="header-mask"></div>
      <div class="header-content">
        <div class="cover-info">
          <img :src="(isNovel ? novel.cover : comic.cover) || '/images/lanjiazai1.webp'" class="cover-img" />
          <div class="info-text">
            <h2 class="title">{{ isNovel ? novel.title : comic.title }}</h2>
            <div class="sub-info">
              <span class="episode">共{{ isNovel ? novel.chapter_count : comic.chapter_count }}话</span>
              <span class="category">
                {{ (isNovel ? novel.serialization_status : comic.is_serializing) === 1 ? '连载中' : '已完结' }}
              </span>
            </div>
          </div>
        </div>
        <p class="intro">{{ isNovel ? novel.intro : comic.intro }}</p>
        <div class="tags">
          <span class="tag" v-for="tag in (isNovel ? novel.tags : comic.tags)" :key="tag">{{ tag }}</span>
        </div>
      </div>
    </div>

    <!-- 观看数据 -->
    <div class="stats-full-width">
      <div class="stats-left">
        <div class="stat-item">
          <img src="/icons/view.svg" class="stat-icon" />
          <span>{{ formatW(isNovel ? novel.views : comic.views) }}</span>
        </div>
      </div>
      <div class="stats-center">
        <div class="stat-item" @click="handleLikeClick">
  <img src="/icons/like2.svg" class="stat-icon" />
  <span>{{ formatW(isNovel ? novel.likes : comic.likes) }}</span>
</div>
      </div>
      <div class="collect-badge">
        <div class="badge-content">
          <img src="/icons/collect.svg" class="badge-icon" />
          <div class="badge-text">{{ formatW(isNovel ? novel.collects : comic.collects) }}人收藏</div>
        </div>
      </div>
    </div>

    <!-- 促销 -->
    <div class="promo-section-full-width">
      <div class="promo-text">新用户首充特惠</div>
      <div class="promo-countdown">
        <span class="countdown-segment">23</span><span class="countdown-colon">:</span>
        <span class="countdown-segment">59</span><span class="countdown-colon">:</span>
        <span class="countdown-segment">15</span>
      </div>
      <button class="promo-read-btn">立即开通</button>
    </div>

    <div class="tabs-section-single">
      <div class="tab-item-single active">
        {{ props.type === 'novel' ? '小说详情' : '漫画详情' }}
      </div>
    </div>

    <!-- 章节目录 -->
    <div class="content">
      <div class="chapter-header-new">
        <div class="chapter-title-wrapper">
          <span class="chapter-text">目录</span>
          <span class="chapter-episode-tag">共{{ isNovel ? novel.chapter_count : comic.chapter_count }}话</span>
        </div>
        <span v-if="isWholeVip" class="whole-unlock-btn" @click="goVip">
          <img src="/icons/cart.svg" class="cart-icon" />
          开通VIP
        </span>
        <span v-else-if="isWholeCoin" class="whole-unlock-btn" @click="unlockAllChapters">
          <img src="/icons/cart.svg" class="cart-icon" />
          整部解锁
        </span>
      </div>
      <div class="chapter-list">
        <div class="chapter-item"
          v-for="chapter in displayedChapters"
          :key="chapter.id"
          @click="checkPermissionAndRead(chapter)">
          <img v-lazy="chapter.cover || novel.cover" class="chapter-cover-new" />
          <div class="chapter-info">
            <div class="chapter-title">{{ chapter.title }}</div>
          </div>
          <button class="read-btn" :class="{ unlocked: isChapterUnlocked(chapter) }">
            {{ chapter.id === lastReadChapterId ? '上次' : getChapterStatusText(chapter) }}
          </button>
        </div>
      </div>

      <div class="view-all-chapters" v-if="showViewAllChapters" @click="openChapterDrawer">
        <img src="/icons/view-all-icon.svg" class="view-all-icon" />
        <span>查看全部目录</span>
      </div>
<ChapterDrawer
  v-model="isDrawerOpen"
  :chapters="isNovel ? novelStore.chapterList : chapterList"
  :comic-id="isNovel ? props.id : null"  
  :novel-id="isNovel ? props.id : null"  
  :comic-title="isNovel ? novel.title : comic.title"
  :type="props.type"
  :cover="isNovel ? novel.cover : comic.cover"
  :fullScreen="true"
  :unlocked-list="unlockedList"
  @read-chapter-from-drawer="checkPermissionAndRead"
/>
    </div>

    <!-- 最外层统一背景盒子 -->
    <div class="guess-like-wrapper">
      <!-- 顶部波纹遮罩 -->
      <div class="guess-like-wave-wrapper">
        <svg viewBox="0 0 1440 40" preserveAspectRatio="none">
          <path
            d="M0,30 Q30,10 60,30 T120,30 T180,30 T240,30 T300,30 T360,30 T420,30 T480,30 T540,30 T600,30 T660,30 T720,30 T780,30 T840,30 T900,30 T960,30 T1020,30 T1080,30 T1140,30 T1200,30 T1260,30 T1320,30 T1380,30 T1440,30 L1440,0 L0,0 Z"
            fill="#ffffff"
          />
        </svg>
      </div>
      <!-- 内容区域 -->
      <div class="guess-like-section">
        <div class="guess-like-title">看了又看</div>
        <AcgSection
          v-if="guessLikeList.length > 0"
          layoutType="type4"
          :data="guessLikeList"
          @item-click="handleGuessCardClick"
        />
        <div class="change-btn-wrapper">
          <div class="change-btn" @click="changeGuessLike">
            <img src="/static/refresh.png" class="refresh-icon" />
            换一批
          </div>
        </div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <div class="bottom-bar">
  <button class="bottom-left-btn" @click="handleBottomCollectClick">
    <img src="/icons/star2.svg" class="bottom-icon-large" />
    <div class="bottom-icon-text">收藏</div>
  </button>
     <!-- 只动这一行 -->
<button class="bottom-read-btn-big"
  @click="isNovel ? (firstNovelChapter && checkPermissionAndRead(firstNovelChapter)) : (comic.chapters?.[0] && checkPermissionAndRead(comic.chapters[0]))">
  <img src="/icons/view.svg" class="bottom-icon-small" />
  <span>开始阅读</span>
</button>
    </div>

    <!-- VIP弹窗 -->
    <van-popup
      v-model:show="vipPopup"
      close-on-click-overlay
      :style="{ maxWidth: '90%', width: '500px', borderRadius: '12px' }"
    >
      <div class="popup-box">
        <h3>温馨提示</h3>
        <p class="popup-text">
          需要会员才可以观看哦~
        </p>
        <div class="popup-actions">
          <button class="gray-btn" @click="goPromotion">分享得VIP</button>
          <button class="orange-btn" @click="goVip">立即开通VIP</button>
        </div>
      </div>
    </van-popup>

    <!-- 金币弹窗 -->
    <van-popup
      v-model:show="coinPopup"
      close-on-click-overlay
      :style="{ maxWidth: '90%', width: '500px', borderRadius: '12px' }"
    >
      <div class="popup-box">
        <h3>温馨提示</h3>
        <p class="popup-text">
          您当前没有足够的金币，购买章节需要支付金币。<br />立即充值金币并购买。
        </p>
        <div class="popup-actions">
          <button class="gray-btn" @click="goCoinRecharge">取消</button>
          <button class="orange-btn" @click="goCoinShop">立即充值</button>
        </div>
      </div>
    </van-popup>

    <!-- 购买详情抽屉 -->
    <van-action-sheet v-model:show="purchaseSheet" closeable safe-area-inset-bottom>
      <div class="purchase-sheet">
        <h3>{{ purchaseSheetType === 'whole' ? (isNovel ? '购买整本小说' : '购买整部漫画') : '购买章节' }}</h3>
        <div class="row">
          金币余额：{{ typeof userInfo?.goldCoins === 'number' ? userInfo.goldCoins.toFixed(2) : '0.00' }}
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
        <!-- 整部金币专用 -->
        <template v-if="purchaseSheetType === 'whole'">
          <div class="row">
            <span>应付总金币</span>
            <span class="red">{{ totalCoinSum }}金币</span>
          </div>
          <div class="row">
            <span>整部8折</span>
            <span class="orange">-{{ (totalCoinSum * 0.2).toFixed(0) }}金币</span>
          </div>
          <div class="notice">
            <span>
              一次性解锁本{{ isNovel ? '小说' : '漫画' }}全部金币章节，立省{{ (totalCoinSum * 0.2).toFixed(0) }}金币！
            </span>
          </div>
        </template>
        <!-- 单话金币专用 -->
        <template v-else>
          <div class="row">
            <span>支付金额</span>
            <span class="red">{{ typeof currentPurchaseChapter?.coin === 'number' ? currentPurchaseChapter.coin : 0 }}金币</span>
          </div>
          <div class="notice">
  <span :class="{ orange: userDiscount >= 1, red: userDiscount < 1 }">
    {{ userDiscount < 1 ? '您享受 ' + (userDiscount * 10).toFixed(1) + '折优惠' : '您当前不享受折扣优惠' }}
  </span>
  <van-button type="primary" plain size="small" color="#ff69b4" @click="goVip">
    购买VIP享受折扣
  </van-button>
</div>

        </template>
        <div class="divider"></div>
        <div class="row">
          <span>实际支付</span>
          <span class="red">
            {{ purchaseSheetType === 'whole' ? wholeDiscountedPrice : discountedPrice }}金币
          </span>
        </div>
        <van-button
          type="primary"
          block
          color="#f60"
          class="buy-btn"
          @click="confirmPurchase"
        >
          {{ purchaseSheetType === 'whole' ? (isNovel ? '立即整本解锁' : '立即整部解锁') : '立即购买' }}
        </van-button>
      </div>
    </van-action-sheet>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import ChapterDrawer from '../components/ChapterDrawer.vue'
import AcgSection from '@/components/AcgSection.vue'
import { useComicCategoryStore } from '@/store/comicCategoryStore'
import { useNovelCategoryStore } from '@/store/novelStore'
import { useUserStore } from '@/store/user'
import { showToast } from 'vant'
import { trackLongVideoAction } from '@/api/longVideo.api'


// 类型判定
const props = withDefaults(defineProps<{
  id: string | number
  type?: 'comic' | 'novel'
}>(), { type: 'comic' })

const isNovel = computed(() => props.type === 'novel')
const isComic = computed(() => props.type !== 'novel')


const router = useRouter()

// 漫画store
const comicStore = useComicCategoryStore()
const { comicDetail, chapterList, previewChapterList, guessLikeList: guessLikeListRef } = storeToRefs(comicStore)
const unlockedList = computed(() => {
  if (isNovel.value) {
    return novelStore.unlockedNovelChaptersMap[String(props.id)] || []
  } else {
    return comicStore.unlockedChaptersMap[String(props.id)] || []
  }
})


// 小说store
const novelStore = useNovelCategoryStore()
const { novelDetail, novelChapterList } = storeToRefs(novelStore)

// 用户store
const userStore = useUserStore()
const { userInfo } = storeToRefs(userStore)
const firstNovelChapter = computed(() => {
  // 优先全量章节（drawer 拉了全量就有）
  if (isNovel.value && Array.isArray(novelChapterList.value?.list) && novelChapterList.value.list.length > 0) {
    return novelChapterList.value.list[0]
  }
  // 没全量用 preview
  if (isNovel.value && Array.isArray(novelStore.previewChapterList) && novelStore.previewChapterList.length > 0) {
    return novelStore.previewChapterList[0]
  }
  return null
})

// UI变量
const isDrawerOpen = ref(false)
const lastReadChapterId = ref<number | null>(null)
const comic = ref<any>({ chapters: [] })      // 只存漫画
const novel = ref<any>({ chapters: [] })      // 只存小说
const vipPopup = ref(false)
const coinPopup = ref(false)
const currentPurchaseChapter = ref<any>(null)
const purchaseSheet = ref(false)
const userDiscount = ref(1)
const isWholeVip = computed(() => isNovel.value
  ? (novel.value.is_vip === 1)
  : (Number(comic.value.is_vip) === 1))
const isWholeCoin = computed(() => isNovel.value
  ? (Number(novel.value.coin) > 0)
  : (Number(comic.value.coin) > 0))
const purchaseSheetType = ref<'single' | 'whole'>('single')
const guessLikeList = computed(() => {
  const list = isNovel.value
    ? (novelStore.guessLikeNovelList || [])
    : (guessLikeListRef.value || [])
  return list.map(item => ({
    ...item,
    cover: item.cover || item.cover_url || '', // 兼容cover
  }))
})


// 漫画总价等
const totalCoinSum = computed(() => {
  const arr = isNovel.value
    ? (novelChapterList.value?.list || [])
    : (chapterList.value || [])
  return arr.reduce((sum, chap) => {
    return sum + (Number(chap?.coin) > 0 ? Number(chap.coin) : 0)
  }, 0)
})
const wholeDiscountedPrice = computed(() => {
  return Math.round(totalCoinSum.value * 0.8)
})
const discountedPrice = computed(() => {
  const coin = currentPurchaseChapter.value?.coin
  if (typeof coin !== 'number') return 0
  return Number((coin * userDiscount.value).toFixed(2))
})

// 拉详情和预览章节（分漫画/小说）
async function fetchDetailAndPreview(id: string | number) {
  if (isNovel.value) {
    await novelStore.fetchNovelDetail(id)
    const detail = novelDetail.value || {}
    await novelStore.fetchNovelPreviewChapters(id, 3)
    novel.value = {
      ...detail,
      title: detail.title || detail.name || '',
      cover: detail.cover || detail.cover_url || '',
      intro: detail.intro || detail.description || '',
      chapter_count: detail.chapter_count ?? (novelChapterList.value?.list?.length || 0),
      serialization_status: detail.serialization_status,
      tags: Array.isArray(detail.tags) ? detail.tags : [],
      category_id: detail.category_id, // 保证有 category_id 字段
    }
    // 新增：拉猜你喜欢
    if (novel.value.category_id) {
      await novelStore.loadGuessLikeNovels(novel.value.category_id, id)
    }
  } else {
    await comicStore.loadComicDetail(id)
    await comicStore.loadPreviewChapters(id, 3)
    comic.value = {
      ...comicDetail.value,
      title: comicDetail.value.title || comicDetail.value.name || '',
      chapters: previewChapterList.value || [],
      chapter_count: comicDetail.value.chapter_count ?? (previewChapterList.value?.length || 0),
      tags: (comicDetail.value.tags || []).map((t: any) => t.name || t),
      intro: comicDetail.value.intro || comicDetail.value.description || '',
      cover: comicDetail.value.cover || '',
      is_serializing: Number(comicDetail.value.is_serializing) || 0,
      category_id: comicDetail.value.category_id,
    }
    if (comic.value.category_id) {
      await comicStore.loadGuessLikeList(comic.value.category_id, props.id)
    }
  }
}

// 组件挂载和 props 变更时拉详情
onMounted(async () => {
  comicStore.clearCurrentState()
  novelStore.clearCurrentState?.()
  await fetchDetailAndPreview(props.id)
  await userStore.fetchUserInfo(true)

  if (isNovel.value) {
    await novelStore.loadUnlockedNovelChapters(props.id)
  } else {
    await comicStore.loadUnlockedChapters(props.id)
  }

  const stored = localStorage.getItem(`lastReadChapter_${props.id}`)
  if (stored) lastReadChapterId.value = parseInt(stored, 10)
})

watch(() => props.id, async (newId) => {
  comicStore.clearCurrentState()
  novelStore.clearCurrentState?.()
  await fetchDetailAndPreview(newId)
  if (isNovel.value) {
    await novelStore.loadUnlockedNovelChapters(newId)
  } else {
    await comicStore.loadUnlockedChapters(newId)
  }
  lastReadChapterId.value = null
  const stored = localStorage.getItem(`lastReadChapter_${newId}`)
  if (stored) lastReadChapterId.value = parseInt(stored, 10)
})

// 目录渲染
const displayedChapters = computed(() => {
  if (isNovel.value) {
    return isDrawerOpen.value
      ? (novelStore.chapterList || [])
      : (novelStore.previewChapterList || [])
  }
  return comic.value.chapters || []
})
const showViewAllChapters = computed(() => {
  const count = isNovel.value
    ? (novel.value.chapter_count || 0)
    : (comic.value.chapter_count || 0)
  return count > 3 && !isDrawerOpen.value
})

// 查看全部目录
// 章节 drawer 展开全部章节
const openChapterDrawer = async () => {
  if (isNovel.value) {
    await novelStore.fetchNovelAllChapters(props.id)
    await nextTick()
    isDrawerOpen.value = true
  } else {
    if (!chapterList.value.length) {
      await comicStore.loadAllChapters(props.id)
      await nextTick()
    }
    isDrawerOpen.value = true
  }
}


// 判断是否已解锁
function isChapterUnlocked(chapter: any) {
  const unlockedArr = unlockedList.value
  return unlockedArr.includes(String(chapter.id))
}

// 章节按钮文本
function getChapterStatusText(chapter: any) {
  if (isChapterUnlocked(chapter)) return '已解锁'
if (chapter.is_vip === 1) return 'VIP'
if (chapter && typeof chapter.coin === 'number' && chapter.coin > 0)
    return `${chapter.coin}金币`
return '免费'
}

// 章节权限和跳转
async function checkPermissionAndRead(chapterOrId: any) {
  let chapter
  if (typeof chapterOrId === 'object') {
    chapter = chapterOrId
  } else {
    // 【关键点】——用 novelChapterList 全量目录查
    chapter = (isNovel.value
      ? (novelChapterList.value.list || []).find((c: any) => Number(c.id) === Number(chapterOrId))
      : (chapterList.value || []).find((c: any) => Number(c.id) === Number(chapterOrId)))
  }
  if (!chapter) {
    showToast('未找到章节')
    return
  }
  if (isChapterUnlocked(chapter)) return readChapter(chapter.id)
  if (chapter.is_vip === 1) {
    if (userInfo.value?.can_view_vip_video == 1) return readChapter(chapter.id)
    else return vipPopup.value = true
  }
  if (chapter.coin > 0) {
    if (userInfo.value?.can_watch_coin == 1) return readChapter(chapter.id)
    else {
      currentPurchaseChapter.value = chapter
      purchaseSheetType.value = 'single'
      purchaseSheet.value = true
      return
    }
  }
  return readChapter(chapter.id)
}

// 确认购买
// 确认购买
async function confirmPurchase() {
  let payAmount = 0
  if (purchaseSheetType.value === 'whole') {
    payAmount = wholeDiscountedPrice.value
  } else if (currentPurchaseChapter.value && typeof currentPurchaseChapter.value.coin === 'number') {
    payAmount = discountedPrice.value
  }
  try {
    if (purchaseSheetType.value === 'whole') {
      if (isNovel.value) {
        // 小说整本解锁接口（如有，没有则留空或加 TODO）
        if (novelStore.buyNovelWhole) {
          await novelStore.buyNovelWhole(novel.value.id)
        } else {
          showToast('暂不支持整本解锁')
          purchaseSheet.value = false
          return
        }
        await novelStore.loadUnlockedNovelChapters(novel.value.id)
      } else {
        await comicStore.buyComicWhole(comic.value.id)
        await comicStore.loadUnlockedChapters(comic.value.id)
      }
      showToast('整部解锁成功')
      purchaseSheet.value = false
      await userStore.fetchUserInfo(true)
      // 跳转第一个章节
      const allChapters = isNovel.value
        ? (novelChapterList.value?.list || [])
        : (chapterList.value || [])
      if (allChapters.length > 0) {
        readChapter(allChapters[0].id)
      }
    } else {
      // 单话解锁，区分小说/漫画
      if (isNovel.value) {
        await novelStore.buyNovelChapter(currentPurchaseChapter.value.id)
        await novelStore.loadUnlockedNovelChapters(novel.value.id)
      } else {
        await comicStore.buyComicChapter(currentPurchaseChapter.value.id)
        await comicStore.loadUnlockedChapters(comic.value.id)
      }
      showToast('购买成功并解锁')
      purchaseSheet.value = false
      await userStore.fetchUserInfo(true)
      readChapter(currentPurchaseChapter.value.id)
    }
  } catch (e: any) {
    purchaseSheet.value = false
    showToast(e?.msg || '购买失败')
    setTimeout(() => { coinPopup.value = true }, 300)
  }
}

// 跳转阅读器
function readChapter(chapterId) {
  lastReadChapterId.value = chapterId;
  localStorage.setItem(`lastReadChapter_${props.id}`, chapterId.toString());

  let mainTitle = '';
  let coverUrl = '';
  if (isNovel.value) {
    mainTitle = novel.value.title || novel.value.name || '';
    coverUrl = novel.value.cover || novel.value.cover_url || '';
    sessionStorage.setItem('reader-cover', coverUrl);
  }
  sessionStorage.setItem('reader-title', mainTitle);

  const routeName = isNovel.value ? 'NovelReader' : 'ComicReader';

   // 埋点前强力打印排查
  if (isComic.value) {
    console.log('===埋点参数===');
    console.log('comic.value', comic.value);
    console.log('comic.value.id', comic.value.id, typeof comic.value.id);
    const _id = Number(comic.value.id);
    console.log('trackLongVideoAction 参数:', { id: _id, type: 'comic', action: 'read' });

    // 只有 id 有值且是数字再埋点
    if (_id && !isNaN(_id)) {
      trackLongVideoAction({
        id: _id,
        type: 'comic',
        action: 'view'
      });
    } else {
      console.error('comic.id 无效，不埋点');
    }
  }
  // ✅ 始终使用 push，行为与漫画保持一致
  router.push({ name: routeName, params: { comicId: props.id, chapterId } });
}

// 猜你喜欢
async function changeGuessLike() {
  if (isNovel.value) {
    if (novel.value.category_id) {
      await novelStore.loadGuessLikeNovels(novel.value.category_id, props.id)
    }
  } else {
    if (comic.value.category_id) {
      await comicStore.loadGuessLikeList(comic.value.category_id, props.id)
    }
  }
}

// 处理“看了又看”卡片点击事件
function handleGuessCardClick(item: any) {
  // 跳转到详情页
  if (item && item.id) {
    const type = isNovel.value ? 'novel' : 'comic'  // 根据 isNovel 来判断类型
    router.push({ name: type === 'novel' ? 'NovelDetail' : 'ComicDetail', params: { id: item.id, type } })
  }
}


// 返回逻辑
function goBack() {
  // ✅ 1. 检查是否从榜单页进入（优先级最高，因为有完整的返回信息）
  const rankFrom = sessionStorage.getItem('acg-rank-return-from')
  const rankTab = sessionStorage.getItem('acg-rank-tab')
  const rankSub = sessionStorage.getItem('acg-rank-sub')
  const rankScroll = sessionStorage.getItem('acg-rank-scroll')
  
  if (rankFrom && rankTab && rankSub) {
    // 使用 replace 避免历史栈积累
    router.replace(rankFrom).then(() => {
      // 榜单页会自动恢复 tab、subTab 和滚动位置
    })
    return
  }

  // ✅ 2. 检查是否从限免列表进入
  const limitedFreeFrom = sessionStorage.getItem('limited-free-return-from')
  const limitedFreeScroll = sessionStorage.getItem('limited-free-scroll-top')
  
  if (limitedFreeFrom && limitedFreeScroll) {
    // 使用 replace 返回限免列表，避免历史栈积累
    router.replace({ name: 'LimitedFreeList' }).then(() => {
      // 限免列表会自动恢复滚动位置和状态
    })
    return
  }

  // ✅ 3. 检查是否从完结列表进入
  const completedFrom = sessionStorage.getItem('completed-return-from')
  const completedScroll = sessionStorage.getItem('completed-scroll-top')
  
  if (completedFrom && completedScroll) {
    // 使用 replace 返回完结列表，避免历史栈积累
    router.replace({ name: 'CompletedList' }).then(() => {
      // 完结列表会自动恢复滚动位置和状态
    })
    return
  }

  // ✅ 4. 检查是否从搜索页返回（保持原有逻辑）
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

  // ✅ 5. 推荐页/更多页（保持原有逻辑）
  const returnFrom = sessionStorage.getItem('acg-return-from')
  const scrollTop = sessionStorage.getItem('acg-scroll-top')
  
  if (returnFrom && returnFrom.includes('AcgMoreListPage')) {
    router.replace({ name: 'AcgMoreListPage' }).then(() => {
      nextTick(() => {
        window.scrollTo(0, parseInt(scrollTop || '0', 10))
      })
    })
    sessionStorage.removeItem('acg-return-from')
    sessionStorage.removeItem('acg-scroll-top')
    return
  }
  
  if (returnFrom) {
    try {
      const returnToRoute = JSON.parse(returnFrom)
      router.replace(returnToRoute).then(() => {
        nextTick(() => {
          window.scrollTo(0, parseInt(scrollTop || '0', 10))
        })
      })
      sessionStorage.removeItem('acg-return-from')
      sessionStorage.removeItem('acg-scroll-top')
      return
    } catch (e) {
      console.error('解析返回路由失败', e)
    }
  }

  // ✅ 6. 检查是否从每日追番页面进入（放到最后，避免误判）
  const dailyFollowFrom = sessionStorage.getItem('daily-follow-return-from')
  const dailyFollowState = sessionStorage.getItem('daily-follow-state')
  
  // 🔥 关键修复：更严格的判断条件
  if (dailyFollowFrom === 'DailyFollowPage' && dailyFollowState) {
    try {
      // 验证 dailyFollowState 是否为有效的 JSON
      const state = JSON.parse(dailyFollowState)
      if (state && typeof state.activeTab === 'number') {
        // 使用 replace 返回每日追番页面，避免历史栈积累
        router.replace({ name: 'DailyFollowPage' }).then(() => {
          // DailyFollowPage 会自动恢复滚动位置和状态
        })
        return
      }
    } catch (e) {
      // 如果解析失败，清理无效状态
      sessionStorage.removeItem('daily-follow-return-from')
      sessionStorage.removeItem('daily-follow-state')
    }
  }

  // ✅ 7. 默认返回（保持原有逻辑）
  router.back()
}

// 其它按钮
function formatW(num: number) {
  if (!num || isNaN(num)) return '0.0w'
  const wNum = num / 10000
  return wNum.toFixed(1).replace(/\.0$/, '') + 'w'
}
function goToShare() { router.push('/promotion-share') }
function goVip() {
  router.push('/vip')
  vipPopup.value = false
  purchaseSheet.value = false
  coinPopup.value = false
}
function goPromotion() {
  router.push('/promotion-share')
  vipPopup.value = false
  purchaseSheet.value = false
}
function goCoinShop() {
  router.push({ path: '/vip', query: { tab: 'coin' } })
  coinPopup.value = false
  purchaseSheet.value = false
}
function goCoinRecharge() {
  coinPopup.value = false
  purchaseSheet.value = false
  router.push({ path: '/vip', query: { tab: 'coin' } })
}
async function unlockAllChapters() {
  if (isNovel.value) {
    await novelStore.fetchNovelAllChapters(props.id)
  } else if (!chapterList.value.length || chapterList.value.length < comic.value.chapter_count) {
    await comicStore.loadAllChapters(props.id)
  }
  await userStore.fetchUserInfo(true)
  if (userInfo.value && userInfo.value.can_watch_coin == 1) {
    const firstChapter = isNovel.value
      ? (novelChapterList.value?.list?.[0])
      : (chapterList.value && chapterList.value.length > 0 ? chapterList.value[0] : null)
    if (firstChapter) {
      readChapter(firstChapter.id)
    } else {
      showToast('暂无可读章节')
    }
    return
  }
  currentPurchaseChapter.value = null
  purchaseSheetType.value = 'whole'
  purchaseSheet.value = true
}
function handleBottomCollectClick() {
  if (isComic.value) {
    trackLongVideoAction({
      id: comic.value.id,
      type: 'comic',
      action: 'collect'
    });
    showToast('收藏成功');
  }
  // 你可以加自己的收藏业务逻辑，比如切换收藏状态
}

function handleLikeClick() {
  if (isComic.value) {
    trackLongVideoAction({
      id: comic.value.id,
      type: 'comic',
      action: 'like'
    });
    showToast('点赞成功');
  }
  // 如果还有别的业务，可以继续加
}

</script>



<style scoped>
.comic-detail-wrapper {
  background: #f7f7f7;
  min-height: 100vh;
  padding-bottom: 21.33vw; /* 80px / 375px * 100 = 21.33vw */
}

.top-bar {
  position: absolute;
  top: 4vw; /* 15px / 375px * 100 = 4vw */
  left: 2.66vw; /* 10px / 375px * 100 = 2.66vw */
  right: 2.66vw; /* 10px / 375px * 100 = 2.66vw */
  display: flex;
  justify-content: space-between;
  z-index: 10;
}
.back-icon,
.share-icon {
  width: 6.4vw; /* 24px / 375px * 100 = 6.4vw */
  height: 6.4vw; /* 24px / 375px * 100 = 6.4vw */
}

.header {
  position: relative;
  height: 85.33vw; /* 320px / 375px * 100 = 85.33vw */
  background-size: cover;
  background-position: center bottom;
}
.header-mask {
  position: absolute;
  inset: 0;
  background: rgba(255, 240, 240, 0.85);
}
.header-content {
  position: absolute;
  bottom: 0;
  padding: 4.26vw 4.26vw 0.53vw; /* 16px / 375px * 100 = 4.26vw, 2px / 375px * 100 = 0.53vw */
  width: 100%;
  color: #000;
}
.cover-info {
  display: flex;
  align-items: center;
  margin-bottom: 3.2vw; /* 12px / 375px * 100 = 3.2vw */
}
.cover-img {
  width: 26.66vw; /* 100px / 375px * 100 = 26.66vw */
  height: 35.73vw; /* 134px / 375px * 100 = 35.73vw */
  border-radius: 2vw; /* 7.5px / 375px * 100 = 2vw (assuming 7.5px from a common small radius) */
  object-fit: cover;
}

.info-text {
  margin-left: 4.26vw; /* 16px / 375px * 100 = 4.26vw */
  flex: 1;
  position: relative;
  top: -9.33vw; /* 35px / 375px * 100 = 9.33vw */
}
.title {
  font-size: 4.8vw; /* 18px / 375px * 100 = 4.8vw */
  font-weight: 500;
}
.sub-info {
  margin-top: 1.6vw; /* 6px / 375px * 100 = 1.6vw */
  display: flex;
  align-items: center;
}
.episode {
  background: rgba(233, 222, 207, 0.3);
  color: rgb(151, 109, 33);
  padding: 1.06vw 3.73vw; /* 4px / 375px * 100 = 1.06vw, 14px / 375px * 100 = 3.73vw */
  border-radius: 2.66vw; /* 10px / 375px * 100 = 2.66vw */
  margin-right: 3.2vw; /* 12px / 375px * 100 = 3.2vw */
  margin-left: 1.33vw; /* 5px / 375px * 100 = 1.33vw */
  font-size: 3.46vw; /* 13px / 375px * 100 = 3.46vw */
}
.category {
  background: #ff6699;
  border-radius: 1.06vw; /* 4px / 375px * 100 = 1.06vw */
  color: #fff;
  padding: 1.06vw 2.66vw; /* 4px / 375px * 100 = 1.06vw, 10px / 375px * 100 = 2.66vw */
  border-radius: 1.06vw; /* 4px / 375px * 100 = 1.06vw */
  font-size: 3.2vw; /* 12px / 375px * 100 = 3.2vw */
  margin-right: 2.13vw; /* 8px / 375px * 100 = 2.13vw */
  margin-bottom: 2.13vw; /* 8px / 375px * 100 = 2.13vw */
}

/* START: 全宽的 stats 区域样式 */
.stats-full-width {
  margin-top: 0;
  padding: 0;
  background: #fff;
  display: flex;
  align-items: center;
  height: 12.8vw; /* 48px / 375px * 100 = 12.8vw */
  box-shadow: 0 0.53vw 1.06vw rgba(0, 0, 0, 0.05); /* 2px / 375px * 100 = 0.53vw, 4px / 375px * 100 = 1.06vw */
  position: relative;
}

.stats-left {
  padding-left: 5.33vw; /* 20px / 375px * 100 = 5.33vw */
  height: 100%;
  display: flex;
  align-items: center;
}

.stats-center {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.stat-item {
  display: flex;
  align-items: center;
  font-size: 3.73vw; /* 14px / 375px * 100 = 3.73vw */
  font-weight: 500;
  color: #333;
}

.stat-item:first-child {
  margin-right: 5.33vw; /* 20px / 375px * 100 = 5.33vw */
}

.stat-item span {
  margin-left: 1.06vw; /* 4px / 375px * 100 = 1.06vw */
}

.stat-icon {
  width: 4.26vw; /* 16px / 375px * 100 = 4.26vw */
  height: 4.26vw; /* 16px / 375px * 100 = 4.26vw */
}

/* 收藏徽章样式，使用 clip-path 实现圆弧形状 */
.collect-badge {
  background: #4b3a39;
  padding: 0 17.33vw; /* 65px / 375px * 100 = 17.33vw */
  border-radius: 0 0px 0px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  position: relative;
  margin-left: auto;
  box-sizing: border-box;

  clip-path: polygon(5% 50%, 0% 0%, 100% 0%, 100% 100%, 10% 100%);
}

.collect-badge::before {
  content: none;
}

.badge-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.badge-icon {
  width: 4.8vw; /* 18px / 375px * 100 = 4.8vw */
  height: 4.8vw; /* 18px / 375px * 100 = 4.8vw */
  margin-bottom: 0.53vw; /* 2px / 375px * 100 = 0.53vw */
  filter: brightness(1.2) hue-rotate(0deg) saturate(1.5);
}

.badge-text {
  font-size: 2.93vw; /* 11px / 375px * 100 = 2.93vw */
  color: #fff;
  white-space: nowrap;
}
/* END: stats 区域样式 */

/* START: 全宽的新用户首充特惠样式 */
.promo-section-full-width {
  background: linear-gradient(to right, #ffdd00, #ff8800);
  margin-top: 0;
  padding: 2.66vw 4.26vw; /* 10px / 375px * 100 = 2.66vw, 16px / 375px * 100 = 4.26vw */
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #fff;
  font-weight: bold;
}

.promo-text {
  font-size: 4vw; /* 15px / 375px * 100 = 4vw */
}

.promo-countdown {
  display: flex;
  align-items: center;
  margin-left: auto;
  margin-right: 2.66vw; /* 10px / 375px * 100 = 2.66vw */
}

.countdown-segment {
  background: #333;
  color: #fff;
  padding: 0.53vw 1.6vw; /* 2px / 375px * 100 = 0.53vw, 6px / 375px * 100 = 1.6vw */
  border-radius: 1.06vw; /* 4px / 375px * 100 = 1.06vw */
  font-size: 3.73vw; /* 14px / 375px * 100 = 3.73vw */
  margin: 0 0.53vw; /* 2px / 375px * 100 = 0.53vw */
}

.countdown-colon {
  font-size: 3.73vw; /* 14px / 375px * 100 = 3.73vw */
  color: #333;
}

.promo-read-btn {
  background: #dc3c00;
  color: #fff;
  border: none;
  padding: 1.6vw 4vw; /* 6px / 375px * 100 = 1.6vw, 15px / 375px * 100 = 4vw */
  border-radius: 26.64vw; /* 999px is large enough to make it pill-shaped */
  font-size: 3.73vw; /* 14px / 375px * 100 = 3.73vw */
  white-space: nowrap;
}
/* END: 新用户首充特惠样式 */

/* START: Tab 切换区域样式 */
.tabs-section-single {
  display: flex;
  justify-content: center;
  background: #fff;
  margin: 0;
  border-radius: 0;
  overflow: hidden;
  box-shadow: none;
  height: 11.73vw; /* 44px / 375px * 100 = 11.73vw */
  align-items: center;
}

.tab-item-single {
  text-align: center;
  padding: 0;
  font-size: 4.26vw; /* 16px / 375px * 100 = 4.26vw */
  color: #333;
  font-weight: 500;
  position: relative;
  cursor: pointer;
  transition: color 0.3s ease;
  white-space: nowrap;
}

.tab-item-single.active {
  color: #ff6699;
  font-weight: bold;
}

.tab-item-single.active::after {
  content: '';
  position: absolute;
  bottom: -2.13vw; /* 8px / 375px * 100 = 2.13vw */
  left: 50%;
  transform: translateX(-50%);
  width: 13.33vw; /* 50px / 375px * 100 = 13.33vw */
  height: 0.8vw; /* 3px / 375px * 100 = 0.8vw */
  background: #ff6699;
  border-radius: 0.53vw; /* 2px / 375px * 100 = 0.53vw */
}
/* END: Tab 切换区域样式 */

.content {
  padding: 0 4.26vw 4.26vw; /* 16px / 375px * 100 = 4.26vw */
  background: #fff; /* 调整内边距，让 chapter-list 填满 */
}

/* START: 新的目录区域样式 - 移除阴影 */
.chapter-header-new {
  margin-top: 0vw; /* 0px */
  padding: 0vw 0vw; /* 0px */
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 12.8vw; /* 48px / 375px * 100 = 12.8vw */
  box-shadow: none; /* 移除阴影 */
  border-radius: 0;
}

.chapter-title-wrapper {
  display: flex;
  align-items: center;
}

.chapter-text {
  font-size: 4vw; /* 15px / 375px * 100 = 4vw */
  font-weight: bold; /* 字体加粗 */
  color: #333;
  margin-right: 2.13vw; /* 8px / 375px * 100 = 2.13vw */
}

/* 目录旁边的“共X话”样式，与顶部episode同步 */
.chapter-episode-tag {
  background: #ffe3d1; /* 背景色 */
  color: #ff7e00; /* 字体颜色 */
  padding: 1.06vw 2.66vw; /* 4px / 375px * 100 = 1.06vw, 10px / 375px * 100 = 2.66vw */
  border-radius: 26.64vw; /* 999px for pill shape */
  font-size: 3.2vw; /* 12px / 375px * 100 = 3.2vw */
  white-space: nowrap;
}
/* END: 新的目录区域样式 */

.chapter-list {
  background: none;
  border-radius: 0vw; /* 0px */
  margin-top: 2.66vw; /* 10px / 375px * 100 = 2.66vw */
  padding: 0 0vw; /* 0px */
  overflow: visible; /* 隐藏超出内容，防止边框溢出 */
}

.chapter-item {
  background: none; /* 移除白色背景 */
  border-radius: 0; /* 移除圆角 */
  margin-bottom: 0; /* 移除底部外边距 */
  padding: 1.33vw 0; /* 5px / 375px * 100 = 1.33vw */
  box-shadow: none;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.chapter-item:last-child {
  border-bottom: none; /* 移除最后一项的底部边框 */
}

/* 章节封面新样式，匹配图二的横图效果 */
.chapter-cover-new {
  width: 32vw; /* 120px / 375px * 100 = 32vw */
  height: 18.66vw; /* 70px / 375px * 100 = 18.66vw */
  border-radius: 1.5vw; /* Assuming 5.625px, 1.5vw */
  margin-right: 3.2vw; /* 12px / 375px * 100 = 3.2vw */
  object-fit: cover;
  flex-shrink: 0;
}

.chapter-info {
  flex: 1; /* 占据剩余空间 */
  display: flex;
  flex-direction: column; /* 让标题强制换行 */
  justify-content: center;
  margin-right: 2.66vw; /* 10px / 375px * 100 = 2.66vw */
}

.chapter-title {
  font-size: 3.5vw; /* 15px / 375px * 100 = 4vw */
  line-height: 1.4; /* 调整行高 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2; /* 最多显示两行 */
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #333;
  word-break: break-word; /* 允许长单词换行 */
}

.read-btn {
  background: #ff7e00;
  color: #fff;
  border: none;
  padding: 2.13vw 4vw; /* 8px / 375px * 100 = 2.13vw, 15px / 375px * 100 = 4vw */
  border-radius: 26.64vw; /* 999px for pill shape */
  font-size: 3.73vw; /* 14px / 375px * 100 = 3.73vw */
  white-space: nowrap; /* 防止文本换行 */
  flex-shrink: 0; /* 防止按钮被挤压 */
}

/* START: 查看全部目录按钮样式 */
.view-all-chapters {
  background: #fff; /* 保留白色背景 */
  border-radius: 2.13vw; /* 8px / 375px * 100 = 2.13vw */
  margin-top: 2.66vw; /* 10px / 375px * 100 = 2.66vw */
  margin-bottom: 4.26vw; /* 16px / 375px * 100 = 4.26vw */
  padding: 3.2vw 0; /* 12px / 375px * 100 = 3.2vw */
  display: flex;
  justify-content: center;
  align-items: center;
  color: #333;
  font-size: 3.73vw; /* 14px / 375px * 100 = 3.73vw */
  cursor: pointer;
  box-shadow: 0 0.53vw 1.06vw rgba(0, 0, 0, 0.05); /* 2px / 375px * 100 = 0.53vw, 4px / 375px * 100 = 1.06vw */
  font-weight: bold;
}

.view-all-icon {
  width: 4.26vw; /* 16px / 375px * 100 = 4.26vw */
  height: 4.26vw; /* 16px / 375px * 100 = 4.26vw */
  margin-right: 1.6vw; /* 6px / 375px * 100 = 1.6vw */
  /* If icon color is incorrect, may need filter adjustment */
  /* filter: brightness(0) invert(1); */
}
/* END: 查看全部目录按钮样式 */

/* 底部按钮样式 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  display: flex;
  background: #fff;
  padding: 0vw 0; /* 0px */
  box-shadow: 0 -0.53vw 2.13vw rgba(0, 0, 0, 0.1); /* 2px / 375px * 100 = 0.53vw, 8px / 375px * 100 = 2.13vw */
  z-index: 10;
  box-sizing: border-box;
  height: 16vw; /* 60px / 375px * 100 = 16vw */
}

.bottom-left-btn {
  background: #fff;
  border: none;
  padding: 2.66vw; /* 10px / 375px * 100 = 2.66vw */
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 16vw; /* 60px / 375px * 100 = 16vw */
  margin-right: 0;
}

.bottom-left-btn .bottom-icon-large {
  width: 7.46vw; /* 28px / 375px * 100 = 7.46vw */
  height: 7.46vw; /* 28px / 375px * 100 = 7.46vw */
}

.bottom-read-btn-big {
  background: #ff7e00;
  color: #fff;
  border: none;
  padding: 2.66vw 0; /* 10px / 375px * 100 = 2.66vw */
  border-radius: 0;
  font-size: 4vw; /* 15px / 375px * 100 = 4vw */
  font-weight: bold;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 16vw; /* 60px / 375px * 100 = 16vw */
}

.bottom-read-btn-big .bottom-icon-small {
  width: 5.33vw; /* 20px / 375px * 100 = 5.33vw */
  height: 5.33vw; /* 20px / 375px * 100 = 5.33vw */
  margin-right: 2.13vw; /* 8px / 375px * 100 = 2.13vw */
  filter: brightness(0) invert(1);
}
.bottom-icon-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.bottom-icon-large {
  width: 7.46vw; /* 28px / 375px * 100 = 7.46vw */
  height: 7.46vw; /* 28px / 375px * 100 = 7.46vw */
  margin-bottom: 1.06vw; /* 4px / 375px * 100 = 1.06vw */
}

.bottom-icon-text {
  font-size: 4vw; /* 15px / 375px * 100 = 4vw */
  color: #333;
  font-weight: normal;
}
.guess-like-wave-wrapper {
  width: 100%;
  height: 5.33vw; /* 20px / 375px * 100 = 5.33vw */
  overflow: hidden;
  background: transparent;
  margin-bottom: -2.13vw; /* 8px / 375px * 100 = 2.13vw */
  margin-top: -5.33vw; /* 20px / 375px * 100 = 5.33vw */
}

.guess-like-wave-wrapper svg {
  width: 100%;
  height: 100%;
  display: block;
}

.guess-like-section {
  background: #f5efef;
  padding: 4.26vw 3.2vw 6.4vw; /* 16px / 375px * 100 = 4.26vw, 12px / 375px * 100 = 3.2vw, 24px / 375px * 100 = 6.4vw */
}

.guess-like-title {
  font-size: 4.8vw; /* 18px / 375px * 100 = 4.8vw */
  font-weight: 600;
  color: #656464; /* 修复字体变灰 */
  margin-bottom: 2.66vw; /* 10px / 375px * 100 = 2.66vw */
}
.change-btn-wrapper {
  background: rgba(255, 255, 255, 0.9); /* 遮罩浅底 */
  padding: 2.66vw 0; /* 10px / 375px * 100 = 2.66vw */
  margin: 5.33vw auto 2.66vw; /* 20px / 375px * 100 = 5.33vw, 10px / 375px * 100 = 2.66vw */
  width: 42.66vw; /* 160px / 375px * 100 = 42.66vw */
  border-radius: 2.13vw; /* 8px / 375px * 100 = 2.13vw */
  box-shadow: 0 0.53vw 1.6vw rgba(0, 0, 0, 0.05); /* 2px / 375px * 100 = 0.53vw, 6px / 375px * 100 = 1.6vw */
  display: flex;
  justify-content: center;
  align-items: center;
}
.change-btn {
  display: flex;
  align-items: center;
  font-size: 4.26vw; /* 16px / 375px * 100 = 4.26vw */
  color: #ff5b9f;
  cursor: pointer;
  user-select: none;
}

.change-btn img {
  width: 4.8vw; /* 18px / 375px * 100 = 4.8vw */
  height: 4.8vw; /* 18px / 375px * 100 = 4.8vw */
  margin-right: 1.6vw; /* 6px / 375px * 100 = 1.6vw */
}

/* 放大“看了又看”区域的卡片尺寸 */
.guess-like-section .acg-section-wrapper {
  padding: 0;
  margin: 0;
  max-width: 100% !important;
}

.guess-like-section .grid.type4 {
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 3.2vw !important; /* 12px / 375px * 100 = 3.2vw */
}

.guess-like-section .grid.type4 > div {
  transform: scale(1.1); /* 如需放大可调为1.2，1.3 */
  transform-origin: top center;
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
.whole-unlock-btn {
  display: flex;
  align-items: center;
  background: #fff7ef;
  color: #ff8800;
  border-radius: 6vw;
  font-size: 3.5vw;   /* 再小一点可以用 3.5vw */
  padding: 0 3.5vw 0 2vw;
  height: 7vw;
  margin-left: 3vw;
  font-weight: bold;
  cursor: pointer;
  border: 0.27vw solid #ffb166;
  box-shadow: 0 0.53vw 1.6vw rgba(255,173,92,0.08);
  white-space: nowrap;
  transition: background 0.2s;
}
.whole-unlock-btn:hover {
  background: #ffeed7;
}
.cart-icon {
  width: 4vw;
  height: 4vw;
  margin-right: 1.4vw;
  display: block;
}
.read-btn.unlocked {
  background: #32bc6b !important;
  color: #fff !important;
  border: 0.27vw solid #22b36b;
}

</style>