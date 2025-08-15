<template>
  <div class="online-service">
    <van-nav-bar title="在线客服" left-arrow @click-left="$router.back()" />

    <div class="faq-section">
      <!-- 这里：标题 + 右侧刷新按钮 -->
      <div class="faq-header">
        <div class="faq-title">常见问题与反馈</div>
        <div class="refresh-wrap" @click="refreshFAQ">
          <div class="refresh-btn">
            <van-icon name="replay" />
          </div>
          <div class="refresh-tip">最新</div>
        </div>
      </div>

      <van-cell-group inset>
        <van-cell
          v-for="(item, index) in faqList"
          :key="index"
          :title="item.question"
          :label="item.answer"
          :border="false"
          class="faq-cell"
        />
      </van-cell-group>
    </div>

    <div class="service-icon">
      <img src="/icons/customer-service.svg" alt="客服" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { showToast } from 'vant'

interface FAQItem { question: string; answer: string }

const faqList = ref<FAQItem[]>([])

const FAQ_URL = import.meta.env.VITE_FAQ_URL || '/faq.json'
const TTL_MS = (parseInt(import.meta.env.VITE_FAQ_TTL || '86400', 10) || 86400) * 1000
const CACHE_KEY = 'faq_json_cache_v1'

async function loadFAQ(force = false) {
  if (!force) {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const cache = JSON.parse(raw)
        if (Array.isArray(cache.data) && Date.now() - cache.ts < TTL_MS) {
          faqList.value = cache.data
          return
        }
      }
    } catch {}
  }
  const url = force ? `${FAQ_URL}?v=${Date.now()}` : FAQ_URL
  try {
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()
    faqList.value = Array.isArray(data) ? data : (data.list || [])
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: faqList.value }))
  } catch {
    faqList.value = [{ question: '温馨提示', answer: '当前常见问题暂时无法加载，请稍后再试。' }]
  }
}

async function refreshFAQ() {
  localStorage.removeItem(CACHE_KEY)
  await loadFAQ(true)
  showToast('已刷新为最新')
}

onMounted(() => loadFAQ())
</script>

<style scoped>
.online-service {
  background: #f2f3f5;
  min-height: 100vh;
  color: #333;
}

/* 顶部导航栏 */
::v-deep(.van-nav-bar) {
  position: sticky;
  top: 0;
  z-index: 999;
  background-color: #fff !important;
  box-shadow: 0 0.5vw 2.1vw rgba(0, 0, 0, 0.05);
}

/* ===== 标题行（带刷新） ===== */
.faq-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding: 4.3vw 5.3vw 3.2vw;
  background:#fff;
  margin-bottom: 2.7vw;
}
.faq-title{
  font-size: 4.8vw;
  font-weight: bold;
  color: #ff375f;
  border-left: 1.1vw solid #ff375f;
  padding-left: 3vw;
}
.refresh-wrap{
  display:flex;
  flex-direction: column;
  align-items:center;
  user-select:none;
}
.refresh-btn{
  width: 7.2vw; height: 7.2vw;
  border-radius: 50%;
  border: .5vw solid #ff375f;
  display:flex; align-items:center; justify-content:center;
  background:#fff;
  transition: transform .12s ease;
}
.refresh-wrap :deep(.van-icon){
  font-size: 4vw;
  color:#ff375f;
}
.refresh-btn:active{ transform: scale(.96); }
.refresh-tip{
  margin-top: .8vw;
  font-size: 2.6vw;
  line-height: 1;
  color:#ff375f;
  letter-spacing: .1em;
}

/* 卡片样式 */
::v-deep(.faq-cell) {
  background: rgba(255, 255, 255, 0.65);
  border-radius: 4.3vw;
  margin: 3.7vw 4.3vw;
  padding: 3.7vw 4.8vw;
  backdrop-filter: blur(12px);
  box-shadow:
    0 1.1vw 2.1vw rgba(0, 0, 0, 0.05),
    0 3.2vw 6.4vw rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 0.3vw solid rgba(255, 255, 255, 0.3);
}
::v-deep(.faq-cell:hover) {
  transform: translateY(-0.8vw);
  box-shadow:
    0 2.1vw 4.3vw rgba(0, 0, 0, 0.06),
    0 4.3vw 8.5vw rgba(0, 0, 0, 0.12);
}
::v-deep(.faq-cell .van-cell__title) {
  font-weight: 500;
  font-size: 4vw;
  color: #111;
  line-height: 1.5;
}
::v-deep(.faq-cell .van-cell__label) {
  font-size: 3.5vw;
  color: #333;
  line-height: 1.7;
  margin-top: 2.1vw;
  font-weight: 350;
}

/* 客服图标 */
.service-icon {
  position: fixed;
  bottom: 5.3vw;
  right: 4.3vw;
  z-index: 10;
}
.service-icon img {
  width: 17vw;
  height: 17vw;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff7b7b, #ff3f3f);
  box-shadow: 0 2.7vw 5.3vw rgba(255, 63, 63, 0.25);
  transition: transform 0.2s ease;
}
.service-icon img:hover { transform: scale(1.08); }

/* 标题字体 */
::v-deep(.van-nav-bar__title) {
  font-size: 5.1vw !important;
  font-weight: bold !important;
  color: #333 !important;
}
/* 返回箭头 */
::v-deep(.van-icon-arrow-left) {
  font-size: 6.9vw !important;
  color: #333 !important;
}
</style>
