<template>
  <div class="douyin-card" :class="{ selected }" @click="onClick">
    <div class="cover-container">
      <!-- ✅ 修改：使用 v-lazy 替代 van-image -->
      <img v-lazy="item.cover" :alt="item.title" class="cover-image" />
      
      <!-- 渐变遮罩 -->
      <div class="cover-gradient" />
      
      <!-- 播放按钮 -->
      <div v-if="item.content_type !== 'audio' && item.content_type !== 'comic' && item.content_type !== 'novel'" class="play-button">
        <van-icon name="play" color="#fff" size="20" />
      </div>
      
      <!-- 时长标签/章节标签 -->
      <div v-if="shouldShowDurationBadge" class="duration-badge">
        <van-icon :name="(item.content_type === 'comic' || item.content_type === 'novel' || item.content_type === 'audio') ? 'description' : 'clock-o'" size="10" />
        {{ item.content_type === 'comic' ? `${item.chapter_count !== undefined ? item.chapter_count : 0}话` : 
           item.content_type === 'novel' ? `${item.chapters !== undefined ? item.chapters : 0}章` : 
           item.content_type === 'audio' ? `${item.chapters !== undefined ? item.chapters : 0}章` : 
           item.duration }}
      </div>
      
      <!-- 点赞数 -->
      <div v-if="item.likes" class="likes-badge">
        <van-icon name="good-job-o" size="10" />
        {{ likeDisplay }}
      </div>
      
      <!-- 选择框 -->
      <div v-if="managing" class="select-checkbox">
        <van-icon 
          :name="selected ? 'checked' : 'circle'" 
          :color="selected ? '#fe2c55' : 'rgba(255,255,255,0.8)'" 
          size="20"
        />
      </div>
      
      <!-- 删除按钮 -->
      <div v-if="managing" class="delete-button" @click.stop="onDelete">
        <van-icon name="cross" color="#fff" size="16" />
      </div>
    </div>

    <div class="video-info">
      <div class="video-title">{{ item.title }}</div>
      <div class="video-meta">
        <div class="meta-row">
          <span class="collect-time">
            <van-icon name="clock-o" size="12" />
            {{ item.time }}
          </span>
          <span v-if="item.author" class="author">
            <van-icon name="contact" size="12" />
            {{ item.author }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'

interface DouyinItem {
  id: number
  content_id: string | number
  content_type: string
  title: string
  time: string
  cover?: string
  duration?: string
  chapters?: number // 小说章节数
  chapter_count?: number // 漫画章节数
  author?: string
  likes?: number
}

const props = defineProps<{ item: DouyinItem; selected: boolean; managing: boolean }>()
const emit = defineEmits<{ (e: 'cardClick'): void; (e: 'delete'): void }>()

const likeDisplay = computed(() => {
  const n = props.item.likes || 0
  return n >= 10000 ? (n / 10000).toFixed(1) + 'w' : String(n)
})

// ✅ 新增：计算是否应该显示时长标签
const shouldShowDurationBadge = computed(() => {
  const { content_type, duration, chapters, chapter_count } = props.item
  
  // 如果是 star_image 或 image 类型，不显示时长
  if (content_type === 'star_image' || content_type === 'image') {
    return false
  }
  
  // 其他类型按原逻辑判断
  return (duration && content_type !== 'audio') || 
         content_type === 'comic' || 
         content_type === 'novel' || 
         content_type === 'audio'
})

function onClick() {
  emit('cardClick')
}

function onDelete() {
  // 可以在这里添加确认对话框
  emit('delete')
}

onMounted(() => {
  // 调试：确认竖屏卡片已经渲染
  console.log('[DouyinCard] mounted:', props.item?.id)
})
</script>

<style scoped>
.douyin-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  position: relative;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.douyin-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}
.douyin-card:active {
  transform: scale(0.98);
}
.douyin-card.selected {
  border: 2px solid #fe2c55;
  box-shadow: 0 4px 20px rgba(254, 44, 85, 0.2);
}

.cover-container {
  position: relative;
  width: 100%;
  aspect-ratio: 3/4; /* 改为更紧凑的比例，原来是9/16 */
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* ✅ 新增：替代 van-image 的图片样式 */
.cover-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.douyin-card:hover .cover-image {
  transform: scale(1.05);
}

.cover-skeleton {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg, 
    rgba(240, 240, 240, 0.8) 25%, 
    rgba(220, 220, 220, 0.6) 37%, 
    rgba(240, 240, 240, 0.8) 63%
  );
  background-size: 400% 100%;
  animation: shimmer 1.5s ease infinite;
}
@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.cover-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #999;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  font-size: 12px;
}

.cover-gradient {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 50%;
  background: linear-gradient(
    to top, 
    rgba(0, 0, 0, 0.7) 0%,
    rgba(0, 0, 0, 0.3) 40%,
    transparent 100%
  );
  pointer-events: none;
}

.play-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 36px;
  height: 36px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.3s ease;
}
.douyin-card:hover .play-button {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1.1);
}

.duration-badge {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  color: #fff;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 3px;
  letter-spacing: 0.3px;
}

.likes-badge {
  position: absolute;
  bottom: 12px;
  left: 12px;
  background: rgba(254, 44, 85, 0.9);
  backdrop-filter: blur(10px);
  color: #fff;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 3px;
}

.select-checkbox {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.delete-button {
  position: absolute;
  top: 12px;
  right: 50px;
  width: 28px;
  height: 28px;
  background: rgba(255, 59, 48, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(255, 59, 48, 0.3);
}

.delete-button:hover {
  background: rgba(255, 59, 48, 1);
  transform: scale(1.1);
}

.video-info {
  padding: 12px;
  background: #fff;
}

.video-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  margin-bottom: 6px;
  letter-spacing: -0.02em;
}

.video-meta {
  color: #6b7280;
  font-size: 12px;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.collect-time,
.author {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

.author {
  color: #fe2c55;
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .douyin-card {
    margin-bottom: 12px;
    border-radius: 14px;
  }
  
  .video-info {
    padding: 12px;
  }
  
  .video-title {
    font-size: 15px;
  }
  
  .play-button {
    width: 40px;
    height: 40px;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .douyin-card {
    background: #1f2937;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
  
  .video-info {
    background: #1f2937;
  }
  
  .video-title {
    color: #f9fafb;
  }
  
  .video-meta {
    color: #9ca3af;
  }
}
</style>
