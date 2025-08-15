<template>
  <div class="scroll-wrapper">
    <div class="mine-page">
      <!-- 顶部右上角按钮 -->
      <div class="header-actions">
        <img src="/icons/setting4.svg" class="action-icon" alt="设置" @click="toggleSetting" />
      </div>

      <!-- 顶部：头像 + 名称 + 简介 -->
      <div class="user-info-box">
        <img class="user-avatar" :src="avatar" />
        <div class="user-meta">
          <div class="user-name">{{ nickname }}</div>
          <div class="user-desc">
            {{ isVIP ? `尊贵的${vipCardName ? vipCardName + '会员' : '会员'}👑` : '成为会员即可无限观影' }}
          </div>
        </div>
      </div>

      <!-- 会员中心 Banner -->
      <template v-if="isVIP">
        <div class="banner-scale-outer">
          <div class="banner-scale-inner">
            <div class="vip-banner-cyber" @click="goToVipPage">
              <div class="vip-cyber-left">
                <div class="vip-cyber-title">
                  您当前的会员类型是
                  <img src="/icons/crown.svg" class="vip-cyber-crown" />
                </div>
                <div class="vip-cyber-expire">
                  到期时间：
                  <span class="vip-expire-badge">{{ vipExpireTime === '永久' ? '永久' : vipExpireTime || '未知' }}</span>
                </div>
              </div>
              <div class="big-cyber-badge">
                <img src="/icons/gold-medal.svg" class="badge-bg-icon" alt="徽章" />
                <div class="badge-text-overlay">{{ vipCardName || '会员' }}</div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="vip-banner" @click="goToVipPage">
          <div class="banner-title">会员中心 限时特惠</div>
          <button class="banner-btn">立即开通</button>
        </div>
      </template>

      <!-- 三大功能卡 -->
      <div class="card-row">
        <div class="card-box" v-for="(item, i) in topCards" :key="i" @click="handleCardClick(item)">
          <div class="icon-glow-wrapper">
            <img :src="item.icon" class="icon" />
          </div>
          <div class="title">{{ item.title }}</div>
          <div class="desc">{{ item.desc }}</div>
        </div>
      </div>

      <!-- 常用功能 -->
      <div class="block card-wrapper">
        <div class="block-title">常用功能</div>
        <div class="grid">
          <div class="grid-item" v-for="(item, i) in common" :key="i" @click="handleCommonClick(item)">
            <div class="icon-box"><img :src="item.icon" /></div>
            <div class="label">{{ item.label }}</div>
          </div>
        </div>
      </div>

      <!-- 用户服务 -->
      <div class="block card-wrapper">
        <div class="block-title">用户服务</div>
        <div class="grid">
          <div class="grid-item" v-for="(item, i) in services" :key="i" @click="handleCommonClick(item)">
            <div class="icon-box"><img :src="item.icon" /></div>
            <div class="label">{{ item.label }}</div>
          </div>
        </div>
      </div>

      <TabBar />

      <!-- 弹窗整体 -->
      <van-popup v-model:show="showPopup" round class="popup-container" :overlay-style="{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }">
        <div class="popup-content-wrapper">
          <div class="popup-box updated-style">
            <!-- 高级品牌展示样式 -->
            <div class="popup-header-center brand-header">
              <img :src="logoUrl" class="brand-avatar" />
              <div class="brand-texts">
                <div class="brand-title">{{ brandTitle }}</div>
                <div class="brand-subtitle">{{ brandSubtitle }}</div>
              </div>
            </div>

            <div class="popup-qr-info-row">
              <qrcode-vue :value="qrValue" :size="110" />
              <div class="popup-info-text">
                <div class="info-title">我的账号信息</div>
                <div class="info-item">用户昵称：<span class="highlight">{{ nickname }}</span></div>
                <div class="info-item">用户ID：<span class="highlight">{{ uuid }}</span></div>
                <div class="info-item">邀请码：<span class="highlight">{{ inviteCode }}</span></div>
              </div>
            </div>

            <div class="popup-row">
              <span class="row-label">官方网址：</span>
              <span class="row-value">{{ officialUrl }}</span>
              <div class="copy-btn-container">
                <van-button class="copy-btn" size="small" type="primary" plain hairline @click="copyText(officialUrl)">复制</van-button>
              </div>
            </div>

            <div class="popup-row">
              <span class="row-label">官方邮箱：</span>
              <span class="row-value">{{ officialEmail }}</span>
              <div class="copy-btn-container">
                <van-button class="copy-btn" size="small" type="primary" plain hairline @click="copyText(officialEmail)">复制</van-button>
              </div>
            </div>

            <div class="popup-tip-highlight">
              发送任意信息到官方邮箱，即可获得最新地址!!!
            </div>
            <ul class="popup-tips">
              <li>请您保存二维码凭证，以便找回您的账号</li>
              <li>请妥善保管此账号凭证，不要随意透露给任何人</li>
              <li>若账号不慎丢失，可通过此凭证找回</li>
            </ul>
          </div>

          <van-button
            class="save-button-upgraded"
            round
            block
            type="primary"
            @click="showSaveTip = true"
          >
            立即保存
          </van-button>
        </div>
      </van-popup>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import { storeToRefs } from 'pinia'
import TabBar from '../components/TabBar.vue'
import QrcodeVue from 'qrcode.vue'
import { showToast } from 'vant'
import { usePopupConfigStore } from '@/store/popupConfigStore'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const popupConfigStore = usePopupConfigStore()

// 避免多次请求
const inited = ref(false)

// Pinia 响应式数据
const { uuid, nickname, avatar, inviteCode, isVIP, vipCardName, vipExpireTime } = storeToRefs(userStore)
// 余额（兼容 userStore.goldCoins 或 userStore.userInfo.goldCoins 两种写法）
const coinBalance = computed(() =>
  Number((userStore as any).goldCoins ?? (userStore as any).userInfo?.goldCoins ?? 0)
)

// 千分位格式化（1,900 这种）
const formatCoins = (n: number) => (Number(n) || 0).toLocaleString()


const showPopup = ref(false)
const showSaveTip = ref(false)

// 动态变量
const logoUrl = ref('')
const brandTitle = ref('')
const brandSubtitle = ref('')
const officialUrl = ref('')
const officialEmail = ref('')
const qrValue = ref<string>('')

onMounted(async () => {
  if (inited.value) return
  inited.value = true

  // 拉用户信息
  if (userStore.token) {
    await userStore.fetchUserInfo()
  }

  // 拉弹窗配置
  await popupConfigStore.loadPopupConfig('mine')
  const config = popupConfigStore.getFirstConfig()
  const value = config?.value || {}

  logoUrl.value = value.logo_url || ''
  brandTitle.value = value.title || ''
  brandSubtitle.value = value.subtitle || ''
  officialUrl.value = value.url || ''
  officialEmail.value = value.email || ''

  if (value.domain) {
    if (value.domain.includes('?')) {
      qrValue.value = `${value.domain}&uid=${uuid.value}&invite=${inviteCode.value}`
    } else {
      qrValue.value = `${value.domain}?uid=${uuid.value}&invite=${inviteCode.value}`
    }
  } else {
    qrValue.value = `https://holly5suinikan01.com/?uid=${uuid.value}&invite=${inviteCode.value}`
  }

  // 只弹一次（刷新后还会弹）
  if (route.name === 'Profile' && !sessionStorage.getItem('hasShownMinePopup')) {
    showPopup.value = true
    sessionStorage.setItem('hasShownMinePopup', '1')
  }

  // 刷新/关闭页面时清掉
  window.addEventListener('beforeunload', () => {
    sessionStorage.removeItem('hasShownMinePopup')
  })
})

const toggleSetting = () => router.push('/setting')
const goToVipPage = () => router.push('/vip')

interface CardItem {
  icon: string
  title?: string
  desc?: string
  route?: string
  label?: string
}

const handleCardClick = (item: CardItem) => {
  if (item.route) router.push(item.route)
}
const handleCommonClick = (item: CardItem) => {
  if (item.label === 'App下载') {
    window.open('https://holly5suinikan01.com', '_blank')
  } else if (item.route) {
    router.push(item.route)
  }
}

const copyText = async (text: string) => {
  await navigator.clipboard.writeText(text)
  showToast({
    message: '复制成功',
    className: 'toast-override',
    duration: 600
  })
}

watch(showSaveTip, (val) => {
  if (!val) return
  nextTick(() => {
    showToast({
      message: '请自行截图保存分享二维码~',
      className: 'toast-override',
      duration: 1000
    })
    showSaveTip.value = false
  })
})

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
const topCards = computed<CardItem[]>(() => [
  {
    icon: '/icons/gold.svg',
    title: '金币充值',
    desc: `金额：${formatCoins(coinBalance.value)}`, // 或改成：金币
    route: '/vip?tab=coin'
  },
  { icon: '/icons/share.svg', title: '分享邀请', desc: '邀请领红包', route: '/promotion-share' },
  { icon: '/icons/promo.svg', title: '代理推广', desc: '全网最高分成' }
])
const common: CardItem[] = [
  { icon: '/icons/order.svg', label: '我的订单', route: '/order-record' },
  { icon: '/icons/shop.svg', label: '我的购买', route: '/my-purchase' },
  { icon: '/icons/fav.svg', label: '我的收藏', route: '/my-favorites' },
  { icon: '/icons/support.svg', label: '在线客服', route: '/online-service' }
]

const services: CardItem[] = [
  { icon: '/icons/history.svg', label: '浏览记录', route: '/browse-history' },
  { icon: '/icons/request.svg', label: 'App下载' },
  { icon: '/icons/group.svg', label: '官方群', route: '/group-join' },
  { icon: '/icons/invite.svg', label: '填写邀请码', route: '/invite-code' },
  { icon: '/icons/code.svg', label: '福利任务', route: '/benefit-page' },
  { icon: '/icons/app.svg', label: '应用推荐', route: '/benefit-page?tab=recommend' }
]
</script>
<style scoped>
.scroll-wrapper {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.scroll-wrapper::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
}

.mine-page {
  background: #fff;
  padding-bottom: 16vw; /* 适配底部TabBar和内容间隔 */
  padding-top: env(safe-area-inset-top);
  position: relative;
}
.header-actions {
  position: absolute;
  top: 3.5vw;
  right: 4.5vw;
  z-index: 10;
}
.action-icon {
  width: 6vw;
  height: 6vw;
  border-radius: 1.5vw;
  background: #fff;
  box-shadow: 0 0.4vw 1vw rgba(0, 0, 0, 0.08);
}

.user-info-box {
  display: flex;
  align-items: center;
  padding: 3.5vw;
  margin: 3vw;
  background: #fff;
  border-radius: clamp(2vw, 1.5vw, 12px);
  box-shadow: 0 0.2vw 1vw rgba(0, 0, 0, 0.04);
}
.user-avatar {
  width: 13vw;
  height: 13vw;
  border-radius: clamp(1.5vw, 1.2vw, 8px);
  object-fit: cover;
  margin-right: 3.5vw;
  background-color: #fff;
  box-shadow: inset 0 0 0 0.5vw rgba(255, 255, 255, 0.9), 0 0.6vw 2vw rgba(0, 0, 0, 0.08);
  min-width: 40px;
  min-height: 40px;
}
.user-meta {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.user-name {
  font-size: clamp(3.8vw, 4vw, 16px);
  font-weight: bold;
  color: #333;
}
.user-desc {
  font-size: clamp(3vw, 3.2vw, 13px);
  color: #666;
  margin-top: 1vw;
}

.vip-banner {
  margin: 3vw;
  border-radius: clamp(2.5vw, 1.5vw, 12px);
  overflow: hidden;
  height: 15vw;
  background-image: url('/icons/rockert.png');
  background-size: 100% 100%;
  background-repeat: no-repeat;
  background-position: center;
  position: relative;
  cursor: pointer;
}
.banner-title {
  position: absolute;
  top: 50%;
  left: 45vw;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: clamp(4vw, 5vw, 20px);
  font-weight: bold;
  white-space: nowrap;
}
.banner-btn {
  position: absolute;
  top: 50%;
  right: 3vw;
  transform: translateY(-50%);
  background: linear-gradient(to right, #ff4b2b, #ff416c);
  color: white;
  padding: 0.5vw 4vw;
  border: none;
  border-radius: clamp(3vw, 3vw, 14px);
  font-size: clamp(3vw, 3.2vw, 13px);
}

.card-row {
  display: flex;
  gap: 2vw;
  padding: 3vw;
  justify-content: space-around;
}
.card-box {
  flex: 1;
  background: #f8f8f8;
  border-radius: clamp(2.5vw, 1.5vw, 12px);
  text-align: center;
  padding: 3vw 2vw;
  box-shadow: 0 0 1vw rgba(0, 0, 0, 0.03);
  cursor: pointer;
}
.icon-glow-wrapper {
  background: rgba(255, 0, 120, 0.05);
  border-radius: 50%;
  padding: 2.5vw;
  margin-bottom: 2vw;
  box-shadow: 0 0 2.5vw rgba(255, 0, 120, 0.15);
  display: inline-flex;
  justify-content: center;
  align-items: center;
}
.icon {
  width: clamp(6vw, 7vw, 28px);
  height: clamp(6vw, 7vw, 28px);
  min-width: 20px;
  min-height: 20px;
}
.card-box .title {
  font-weight: bold;
  font-size: clamp(3vw, 3.6vw, 14px);
  color: #333;
}
.card-box .desc {
  font-size: clamp(2.5vw, 3vw, 12px);
  color: #f44336;
}

.block {
  margin: 3vw 3vw 0;
}
.block-title {
  font-size: clamp(3vw, 3.8vw, 15px);
  font-weight: 600;
  margin-bottom: 3vw;
  color: #555;
}
.card-wrapper {
  background: #f5f5f5;
  border-radius: clamp(2.5vw, 1.5vw, 12px);
  padding: 4vw;
  box-shadow: 0 0.5vw 2vw rgba(0, 0, 0, 0.03);
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4vw;
}
.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: clamp(2.5vw, 3vw, 12px);
  color: #444;
}
.icon-box {
  width: clamp(5vw, 7vw, 30px);
  height: clamp(5vw, 7vw, 30px);
  margin-bottom: 1.5vw;
  min-width: 20px;
  min-height: 20px;
}
.icon-box img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.label {
  text-align: center;
  line-height: 1.3;
  font-size: clamp(2.5vw, 3vw, 12px);
  color: #555;
}

.popup-container {
  width: 92vw;
  max-width: 500px;
  margin: 0 auto;
  background: transparent;
  padding: 0;
  
}
.popup-content-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2vw;
}
.popup-header-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3vw;
  margin-bottom: 4vw;
  text-align: center;
}

.popup-box {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(10px);
  border-radius: clamp(3vw, 2vw, 16px);
  padding: 4vw 5vw;
  box-shadow: 0 2vw 5vw rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  position: relative;
  overflow: visible;
  z-index: 10;
}

.info-title {
  font-size: clamp(3vw, 3.8vw, 15px);
  font-weight: bold;
  color: #333;
  margin-bottom: 1.5vw;
}
.highlight {
  color: #170301;
  font-weight: bold;
}
.link {
  color: #e91e63;
  cursor: pointer;
  font-weight: bold;
  word-break: break-all;
}

.popup-row {
  position: relative;
  padding-right: 13vw;
  display: flex;
  align-items: center;
  font-size: clamp(2.5vw, 3vw, 13px);
  line-height: 1.4;
  margin: 1vw 0;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
}
.row-value {
  flex: 1;
  color: #e91e63;
  text-overflow: ellipsis;
  overflow: hidden;
  margin-right: 10vw;
  flex-shrink: 1;
}

.copy-btn {
  background: linear-gradient(90deg, #f43f5e, #e11d48);
  color: #fff !important;
  border: none;
  border-radius: 99vw;
  font-size: clamp(2vw, 2.6vw, 12px);
  font-weight: bold;
  height: clamp(4vw, 7vw, 28px);
  padding: 0 clamp(2vw, 4vw, 14px);
  line-height: clamp(4vw, 7vw, 28px);
  white-space: nowrap;
  box-shadow: 0 0.5vw 1.5vw rgba(244, 67, 54, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  min-height: 22px;
  min-width: 50px;
}
.copy-btn:active {
  transform: scale(0.97);
  box-shadow: 0 0.3vw 1vw rgba(244, 67, 54, 0.3);
}

.popup-tips {
  list-style: decimal;
  color: #888;
  font-size: clamp(2vw, 2.7vw, 12px);
  padding-left: 2vw;
}

.popup-qr-info-row {
  display: flex;
  align-items: flex-start;
  gap: 3.5vw;
  margin: 4vw 0;
}
.popup-info-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
.info-item {
  font-size: clamp(2.5vw, 3.3vw, 14px);
  color: #444;
  margin-bottom: 1.2vw;
}
.save-button-upgraded {
  width: 92%;
  margin: 0 auto 3vw;
  font-size: clamp(3.5vw, 4vw, 16px);
  font-weight: bold;
  background: linear-gradient(90deg, #f43f5e, #e11d48);
  color: #fff;
  border: none;
  box-shadow: 0 1.2vw 2.5vw rgba(244, 67, 54, 0.3);
  border-radius: clamp(1.5vw, 2.5vw, 10px);
  height: clamp(8vw, 12vw, 46px);
  line-height: clamp(8vw, 12vw, 46px);
  transition: all 0.2s ease;
}
.save-button-upgraded:active {
  transform: scale(0.98);
  box-shadow: 0 0.7vw 2vw rgba(244, 67, 54, 0.25);
}

.popup-tip-highlight {
  background: #fff3f3;
  color: #d60000;
  font-weight: bold;
  font-size: clamp(2.5vw, 3.2vw, 13.5px);
  padding: 0.5vw 1vw;
  margin-bottom: 2vw;
  border-left: clamp(0.4vw, 1vw, 4px) solid #f44336;
  border-radius: clamp(1vw, 2vw, 8px);
}

.brand-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(1.5vw, 3vw, 12px);
  margin-bottom: clamp(2vw, 4vw, 16px);
  text-align: left;
}

.brand-avatar {
  width: clamp(8vw, 16vw, 64px);
  height: clamp(8vw, 16vw, 64px);
  border-radius: clamp(1.5vw, 3vw, 14px);
  object-fit: cover;
  box-shadow: 0 clamp(0.2vw, 1vw, 10px) clamp(0.5vw, 2.5vw, 10px) rgba(0, 0, 0, 0.1);
}

.brand-texts {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.brand-title {
  font-size: clamp(3.5vw, 5.5vw, 22px);
  font-weight: 800;
  color: #121212;
  letter-spacing: 0.5px;
}

.brand-subtitle {
  font-size: clamp(2vw, 3.2vw, 13px);
  color: #3b3332;
  font-weight: bold;
  margin-top: clamp(0.2vw, 0.5vw, 2px);
}

.vip-banner-cyber {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
  border: clamp(0.2vw, 0.3vw, 1px) solid rgba(0,255,255,0.2);
  border-radius: clamp(1vw, 1.8vw, 12px);
  margin: 3vw;
  padding: 2vw 3vw;
  min-height: 14vw;
  box-shadow: 0 0 clamp(2vw, 2vw, 10px) rgba(0,255,255,0.4);
}
.vip-cyber-left {
  display: flex;
  flex-direction: column;
  gap: clamp(0.8vw, 1.5vw, 8px);
  flex: 1;
}
.vip-cyber-title {
  display: flex;
  align-items: center;
  font-size: clamp(1.2vw, 4vw, 22px);
  font-weight: bold;
  color: #00f0ff;
}
.vip-cyber-crown {
  width: clamp(1vw, 4vw, 20px);
  height: clamp(1vw, 4vw, 20px);
  margin-left: clamp(0.5vw, 1vw, 8px);
}
.vip-cyber-expire {
  font-size: clamp(1vw, 3.5vw, 18px);
  color: rgba(255,255,255,0.8);
}
.vip-expire-badge {
  background: rgba(0,255,255,0.15);
  padding: clamp(0.3vw, 0.5vw, 1.5vw) clamp(1vw, 1.5vw, 6px);
  border-radius: clamp(0.6vw, 1vw, 8px);
  font-weight: bold;
  color: #00e5ff;
  font-size: clamp(1vw, 3.5vw, 16px);
}
.big-cyber-badge {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: clamp(7vw, 13vw, 50px);
  width: clamp(13vw, 26vw, 100px);
  flex-shrink: 0;
  margin-left: auto;
  margin-right: clamp(1vw, 2.5vw, 10px);
}
.badge-text-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(90deg, #00e5ff, #e0e0e0);
  color: #222;
  font-weight: bold;
  font-size: clamp(1vw, 3.5vw, 15px);
  padding: clamp(0.5vw, 1.5vw, 6px) clamp(2vw, 6vw, 24px);
  border-radius: clamp(2.5vw, 5vw, 20px);
  box-shadow: 0 0 clamp(2.5vw, 2.5vw, 10px) rgba(0,255,255,0.3);
  white-space: nowrap;
}

@media screen and (min-width: 768px) {
  .vip-banner-cyber {
    padding: 1vw 1.5vw !important;
    border-radius: 12px !important;
    min-height: auto !important;
  }
  .vip-cyber-left {
    gap: 0.5vw !important;
  }
  .vip-expire-badge {
    padding: 2px 8px !important;
    border-radius: 8px !important;
  }
  .badge-text-overlay {
    padding: 4px 12px !important;
    font-size: 14px !important;
  }
}
.copy-btn-container {
  position: absolute;
  right: 2vw;
  top: 50%;
  transform: translateY(-50%);
}
</style>
<style>
body.ios-browser .mine-page {
  padding-bottom: 41vw !important;
}
</style>