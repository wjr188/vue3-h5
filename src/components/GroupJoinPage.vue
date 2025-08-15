<template>
  <div class="group-page">
    <!-- 顶部 NavBar 吸顶 -->
    <van-nav-bar
      title="加群开车"
      left-arrow
      fixed
      safe-area-inset-top
      @click-left="goBack"
    />

    <div class="group-content">
      <!-- 官方交流群 -->
      <div class="section">
        <div class="section-title primary">官方交流群</div>
        <div class="section-desc">一起看片一起分享心得</div>

        <div
          class="group-card"
          v-for="(item, index) in officialGroups"
          :key="index"
        >
          <div class="group-info">
            <img :src="item.icon" class="group-icon" />
            <div class="group-text">
              <div class="group-name">{{ item.name }}</div>
              <div class="group-desc">{{ item.desc }}</div>
            </div>
          </div>
          <van-button
            round
            size="small"
            class="join-btn"
            @click="handleJoin(item)"
          >
            立即加入
          </van-button>
        </div>
      </div>

      <!-- 推广商务合作 -->
      <div class="section">
        <div class="section-title">推广商务合作</div>
        <div
          class="group-card"
          v-for="(item, index) in businessGroups"
          :key="index"
        >
          <div class="group-info">
            <img :src="item.icon" class="group-icon" />
            <div class="group-text">
              <div class="group-name">{{ item.name }}</div>
              <div class="group-desc">{{ item.desc }}</div>
            </div>
          </div>
          <van-button
            round
            size="small"
            class="join-btn"
            @click="handleJoin(item)"
          >
            立即联系
          </van-button>
        </div>
      </div>

      <!-- 广告商务合作 -->
      <div class="section">
        <div class="section-title">广告商务合作</div>
        <div
          class="group-card"
          v-for="(item, index) in adGroups"
          :key="index"
        >
          <div class="group-info">
            <img :src="item.icon" class="group-icon" />
            <div class="group-text">
              <div class="group-name">{{ item.name }}</div>
              <div class="group-desc">{{ item.desc }}</div>
            </div>
          </div>
          <van-button
            round
            size="small"
            class="join-btn"
            @click="handleJoin(item)"
          >
            立即联系
          </van-button>
        </div>
      </div>

      <!-- 下载工具 -->
      <div class="section">
        <div class="section-title">下载工具</div>
        <div
          class="group-card"
          v-for="(item, index) in downloadTools"
          :key="index"
        >
          <div class="group-info">
            <img :src="item.icon" class="group-icon" />
            <div class="group-text">
              <div class="group-name">{{ item.name }}</div>
              <div class="group-desc">{{ item.desc }}</div>
            </div>
          </div>
          <van-button
            round
            size="small"
            class="join-btn"
            @click="handleJoin(item)"
          >
            立即下载
          </van-button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useGroupLinksStore } from '@/store/groupLinks' // 用你刚建的 store

// 路由
const router = useRouter()
function goBack(){ router.back() }

// 你原来的展示类型
interface GroupItem { icon: string; name: string; desc: string; url?: string }

// 拉取后端
const gl = useGroupLinksStore()
onMounted(() => { gl.load() })

// 从后端 sections 里取第一个链接（只要 url）
const firstUrl = (items: any[] = []) => items?.[0]?.action?.value as string | undefined

// 用后端返回的 url 回填到你原来的四个分组里（其余字段保持不变）
const officialGroups = computed<GroupItem[]>(() => [{
  icon: '/icons/telegram.svg',
  name: '官方福利群',
  desc: '官方福利群',
  url: firstUrl(gl.officialGroups),
}])

const businessGroups = computed<GroupItem[]>(() => [{
  icon: '/icons/telegram.svg',
  name: '商务合作',
  desc: '推广商务合作洽谈',
  url: firstUrl(gl.businessGroups),
}])

const adGroups = computed<GroupItem[]>(() => [{
  icon: '/icons/telegram.svg',
  name: '广告合作',
  desc: '广告商务合作洽谈',
  url: firstUrl(gl.adGroups),
}])

const downloadTools = computed<GroupItem[]>(() => [{
  icon: '/icons/telegram.svg',
  name: 'TG',
  desc: 'tg聊天 地址 https://telegram.org',
  url: firstUrl(gl.downloadTools) || 'https://telegram.org', // 没配就用默认
}])

// 点击按钮（保持不变）
function handleJoin(item: GroupItem): void {
  if (item.url) {
    window.open(item.url, '_blank')
  } else {
    showToast(`即将打开：${item.name}`)
  }
}
</script>

<style scoped>
.group-page {
  background: #f8f8f8;
  min-height: 100vh;
  padding-top: 12.3vw; /* NavBar高度46px */
}
.group-content {
  padding: 3.2vw; /* 12px */
}
.section {
  margin-bottom: 6.4vw; /* 24px */
}
.section-title {
  font-size: 4vw; /* 15px */
  font-weight: bold;
  margin-bottom: 1.1vw; /* 4px */
  color: #333;
}
.section-title.primary {
  color: #e91e63;
}
.section-desc {
  font-size: 3.5vw; /* 13px */
  color: #666;
  margin-bottom: 3.2vw; /* 12px */
}

.group-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 3.2vw; /* 12px */
  padding: 2.7vw 3.2vw; /* 10px 12px */
  margin-bottom: 2.7vw; /* 10px */
}

.group-info {
  display: flex;
  align-items: center;
}
.group-icon {
  width: 11.2vw; /* 42px */
  height: 11.2vw;
  border-radius: 2.1vw; /* 8px */
  margin-right: 3.2vw; /* 12px */
}
.group-text {
  display: flex;
  flex-direction: column;
}
.group-name {
  font-weight: bold;
  font-size: 4vw; /* 15px */
  color: #333;
}
.group-desc {
  font-size: 3.5vw; /* 13px */
  color: #666;
}

.join-btn {
  background: linear-gradient(to right, #ff4b2b, #ff416c);
  color: white;
  font-weight: bold;
  border: none;
}

/* NavBar 标题 */
::v-deep(.van-nav-bar__title) {
  font-size: 5.1vw !important; /* 19px */
  font-weight: bold !important;
  color: #333 !important;
}

/* 返回箭头 */
::v-deep(.van-icon-arrow-left) {
  font-size: 6.9vw !important; /* 26px */
  color: #333 !important;
}
</style>
