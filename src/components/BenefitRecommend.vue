<template>
  <div class="recommend-tab">
    <!-- 轮播：slot === 'banner'（或 is_banner=true） -->
    <div class="banner-wrapper" v-if="banners.length">
      <van-swipe :autoplay="2000" lazy-render>
        <van-swipe-item v-for="(b, i) in banners" :key="i">
          <img
            v-lazy="b.image_url"
            class="banner-img"
            :alt="b.title || 'banner'"
            @click="open(b.link)"
          />
        </van-swipe-item>
      </van-swipe>
    </div>

    <div class="section-title" v-if="apps.length">大家都在玩</div>

    <div class="app-list">
      <div v-for="(item, index) in apps" :key="index" class="cyber-card">
        <img v-lazy="item.icon" class="app-icon" />
        <div class="app-info">
          <div class="app-name">{{ item.name }}</div>
          <div class="app-desc">下载次数: {{ item.downloads.toLocaleString() }}</div>
          <div class="app-desc">{{ item.desc }}</div>
        </div>
        <van-button size="small" round class="download-button" @click="open(item.link)">
          立即下载
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { usePopupConfigStore } from '@/store/popupConfigStore'

type RawItem = {
  title?: string
  name?: string
  image_url?: string
  icon?: string
  link?: string
  url?: string
  download_url?: string
  slot?: 'banner' | 'card'
  is_banner?: boolean | 0 | 1
  sort?: number
  sort_order?: number
  downloads?: number | string
  download_count?: number | string
  desc?: string
  subtitle?: string
}

type AppCard = {
  name: string
  icon: string
  downloads: number
  desc: string
  link?: string
}

const store = usePopupConfigStore()

/** 强制拉取 app_popup（第二个参数旧 store 会忽略，没事） */
onMounted(async () => {
  try {
    await (store as any).loadPopupConfig?.('app_popup', true)
  } catch {
    await store.loadPopupConfig?.('app_popup')
  }
})

/** 优先用按类型取的首条，兼容旧 store 再兜底 */
const appRow = computed<any>(() =>
  store.getFirstConfig?.('app_popup') ??
  store.configs?.find?.((x: any) => (x.popup_type ?? x.type) === 'app_popup') ??
  null
)

/** 本地再解包一遍，防止 value 是多层 JSON 字符串 */
function unwrapValue(input: any): any {
  // 先取常见字段
  let v =
    input?.parsedValue ??
    input?.value ??
    input?.config_value ??
    input?.config_json ??
    input?.config ??
    input

  const pick = (o: any) =>
    o?.value ?? o?.config_value ?? o?.config_json ?? o?.config ?? o

  // 最多解 8 层，足够防御套娃
  for (let i = 0; i < 8; i++) {
    if (typeof v === 'string') {
      const s = v.trim()
      const looksJson =
        s.startsWith('{') ||
        s.startsWith('[') ||
        (s.startsWith('"') && s.endsWith('"') && (s.includes('{') || s.includes('[')))
      if (looksJson) {
        try { v = JSON.parse(s); continue } catch { /* 不是合法 JSON，跳过 */ }
      }
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const inner = pick(v)
      if (inner !== v) { v = inner; continue }
    }
    break
  }
  return v
}

/** 展平出数组并排序 */
const items = computed<RawItem[]>(() => {
  const row = appRow.value
  if (!row) return []
  const val = unwrapValue(row)
  if (!Array.isArray(val)) return []
  return val
    .slice()
    .sort(
      (a: RawItem, b: RawItem) =>
        (a.sort ?? a.sort_order ?? 0) - (b.sort ?? b.sort_order ?? 0)
    )
})

/** 判定 banner */
const isBanner = (o: RawItem) =>
  o?.slot === 'banner' || o?.is_banner === true || o?.is_banner === 1

/** 轮播数据 */
const banners = computed(() =>
  items.value
    .filter((o) => isBanner(o) && o.image_url)
    .map((o) => ({
      title: o.title || '',
      image_url: o.image_url as string,
      link: o.link || o.url || ''
    }))
)

/** 下方卡片数据 */
const apps = computed<AppCard[]>(() =>
  items.value
    .filter((o) => !isBanner(o) && (o.title || o.name) && (o.image_url || o.icon))
    .map((o) => ({
      name: o.title || o.name || '',
      icon: (o.icon || o.image_url) as string,
      downloads: Number(o.downloads ?? o.download_count ?? 0) || 0,
      desc: o.desc || o.subtitle || '',
      link: o.link || o.url || o.download_url
    }))
)

function open(url?: string) {
  if (typeof url === 'string' && /^https?:\/\//.test(url)) {
    window.open(url, '_blank')
  }
}
</script>

<style scoped>
.recommend-tab {
  padding: 3.2vw;
  background: #1a1a1a;
  min-height: 100vh;
  color: #00f5d4;
  font-family: 'Orbitron', 'Roboto', sans-serif;
}

.banner-wrapper {
  border: 0.5vw solid #00f5d4;
  border-radius: 2.1vw;
  overflow: hidden;
  box-shadow: 0 0 3.2vw #00f5d4;
  margin-bottom: 4.3vw;
}

.banner-img {
  display: block;
  width: 100%;
  height: 42.6vw;
  object-fit: cover;
  border-radius: 2.1vw;
}

.section-title {
  font-size: 4.3vw;
  font-weight: bold;
  color: #00f5d4;
  text-shadow: 0 0 1vw #00f5d4;
  margin: 3.2vw 0 2.1vw;
}

.app-list { display: flex; flex-direction: column; gap: 3.7vw; }

.cyber-card {
  display: flex; align-items: center;
  background: #2a2a2a; border: 0.3vw solid #00f5d4;
  box-shadow: 0 0 2.1vw #00f5d4; padding: 2.7vw; border-radius: 2.1vw;
}

.app-icon {
  width: 12.8vw; height: 12.8vw; border-radius: 1.6vw; flex-shrink: 0; border: 0.3vw solid #00f5d4;
}

.app-info { flex: 1; margin-left: 2.7vw; }
.app-name { font-size: 4vw; font-weight: bold; color: #00f5d4; text-shadow: 0 0 1vw #00f5d4; }
.app-desc { font-size: 3.2vw; color: #aaa; margin-top: 0.5vw; }

.download-button {
  background: transparent; border: 0.3vw solid #00f5d4; color: #00f5d4; font-weight: bold; box-shadow: 0 0 1.6vw #00f5d4;
}
</style>
