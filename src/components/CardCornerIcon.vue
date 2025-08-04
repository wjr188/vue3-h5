<template>
  <div class="vip-corner">
    <!-- 只在没有彩色角标时显示原有图标 -->
    <img
      v-if="isVip && !showVipTip && !showCoinTip"
      src="/icons/vip111.png"
      class="vip-img"
    />
    <div
      v-else-if="coinAmount && coinAmount > 0 && !showVipTip && !showCoinTip"
      class="coin-tag silver-tag"
    >
      <span class="coin-text">{{ coinAmount }}</span>
      <img src="/icons/coin111.png" class="coin-icon" />
    </div>

    <!-- 新增：彩色角标，不影响原有逻辑 -->
    <template v-if="showVipTip">
      <div class="vip-tip-tag" @click.stop="onVipClick">
        开通VIP观看完整视频
      </div>
    </template>
    <template v-else-if="showCoinTip">
      <div class="coin-tip-tag" @click.stop="onCoinClick">
        支付{{ coinAmount }}金币观看完整视频
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  isVip?: boolean
  coinAmount?: number
  showVipTip?: boolean
  showCoinTip?: boolean
}>()

const emit = defineEmits(['vipClick', 'coinClick'])

function onVipClick() {
  emit('vipClick')
}
function onCoinClick() {
  emit('coinClick')
}
</script>

<style scoped>
.vip-corner {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* VIP图片 */
.vip-img {
  width: 44px;
  height: 22px;
  display: block;
}

/* 银色渐变样式 */
.silver-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 12px;
  background: linear-gradient(145deg, #bdbdbd, #9e9e9e);
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  color: #fff;
  font-weight: 500;
  box-shadow: inset 0 0 4px #888;
}

/* 公共部分 */
.coin-text {
  margin-right: 4px;
}
.coin-icon {
  width: 14px;
  height: 14px;
}
.vip-tip-tag {
  background: linear-gradient(90deg, #ff8800, #ff4dcb);
  color: #fff;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 12px 0 0 12px; /* 左圆右直 */
  font-weight: bold;
  cursor: pointer;
  margin-left: 0;
  white-space: nowrap;
}
.coin-tip-tag {
  background: linear-gradient(90deg, #bdbdbd, #ff8800);
  color: #fff;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 12px 0 0 12px; /* 左圆右直 */
  font-weight: bold;
  cursor: pointer;
  margin-left: 0;
  white-space: nowrap;
}
</style>
