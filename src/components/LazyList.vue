<template>
  <div class="lazy-list-container">
    <div v-for="(item, index) in visibleListInternal" :key="index">
      <slot :item="item" />
      <span class="duration" style="float:right;">{{ formatDuration(item.duration) }}</span>
    </div>

    <div v-if="loading" class="loading-tip">
      <div class="loading-inner">
        <img src="/icons/loading.svg" class="spinner" />
        <div class="loading-text">客官别走，妾身马上就好~</div>
      </div>
    </div>

    <div v-if="noMoreInternal" class="no-more-text">
      客官，妾身被你弄高潮了，扛不住了 ~
    </div>

    <div ref="sentinel" class="sentinel"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, onBeforeUnmount } from 'vue';

const props = defineProps({
  allList: { type: Array, required: true },
  batch: { type: Number, default: 10 },
  // v-model 属性用于状态同步
  modelValue: { // v-model:visibleList 的实际 prop 名称
    type: Array,
    default: () => []
  },
  cursor: { // v-model:cursor 的实际 prop 名称
    type: Number,
    default: 0
  },
  noMore: { // v-model:noMore 的实际 prop 名称
    type: Boolean,
    default: false
  }
  // 移除：initialScrollTop，因为 LazyList 不再管理自己的滚动
});

const emit = defineEmits([
  'load',
  'update:modelValue',
  'update:cursor',
  'update:noMore'
]);

// LazyList 内部维护的状态，将从 props 初始化
const visibleListInternal = ref([]);
const loading = ref(false);
const noMoreInternal = ref(false);
let cursorInternal = 0; // 使用 let，因为它的值会直接修改

const sentinel = ref(null); // 哨兵 DOM 元素的引用
let observer = null;

/**
 * 初始化内部状态，优先使用 props 传入的值。
 */
function initializeInternalState() {
  // 仅在组件首次挂载或 allList 变化时，从 props 初始化
  // 避免在每次渲染时都重置内部状态
  console.log('LazyList: initializeInternalState called.');
  if (props.modelValue.length > 0) {
    visibleListInternal.value = [...props.modelValue];
    cursorInternal = props.cursor;
    noMoreInternal.value = props.noMore;
    console.log('LazyList: Restoring state from props:', {
      visibleCount: visibleListInternal.value.length,
      cursor: cursorInternal,
      noMore: noMoreInternal.value
    });
  } else {
    // 否则，从头开始
    visibleListInternal.value = [];
    cursorInternal = 0;
    noMoreInternal.value = false;
    console.log('LazyList: Initializing with empty state (first load expected).');
  }
  loading.value = false; // 确保加载状态是重置的
}

/**
 * 加载更多数据。
 */
function loadMore() {
  if (loading.value || noMoreInternal.value) {
    console.log('LazyList: Load more aborted (loading or no more data).');
    return;
  }
  loading.value = true;
  console.log('LazyList: Starting load more...');

  setTimeout(() => {
    const next = props.allList.slice(cursorInternal, cursorInternal + props.batch);
    if (next.length === 0 && props.allList.length > 0) {
        // 如果 next 为空但 allList 不为空，说明 cursorInternal 已经超出了 allList 的范围
        // 这可能是初始化逻辑的问题，或者已经加载到末尾
        console.warn('LazyList: Next batch is empty, but allList is not empty. Check cursor or allList data.');
        noMoreInternal.value = true; // 认为没有更多数据了
        loading.value = false;
        observer?.disconnect();
        return;
    }
    
    visibleListInternal.value.push(...next);
    emit('load', next); // 通知父组件已加载新数据

    cursorInternal += next.length; // 确保 cursorInternal 准确地递增加载的数量
    loading.value = false;

    if (cursorInternal >= props.allList.length) {
      noMoreInternal.value = true;
      observer?.disconnect(); // 如果没有更多数据了，停止观察器
      console.log('LazyList: All data loaded, no more available.');
    }

    // 每次加载后，通过 v-model 通知父组件更新状态
    emit('update:modelValue', visibleListInternal.value);
    emit('update:cursor', cursorInternal);
    emit('update:noMore', noMoreInternal.value);

    console.log('LazyList: Finished loading. Current visible items:', visibleListInternal.value.length);
  }, 300);
}

/**
 * 初始化 Intersection Observer。
 */
function initObserver() {
  if (!sentinel.value) {
    console.warn('LazyList: Sentinel not found for Observer.');
    return;
  }
  if (observer) {
    observer.disconnect();
    console.log('LazyList: Disconnected old observer.');
  }

  observer = new IntersectionObserver((entries) => {
    // console.log('LazyList: IntersectionObserver triggered, isIntersecting:', entries[0].isIntersecting);
    if (entries[0].isIntersecting && !loading.value && !noMoreInternal.value) {
      loadMore();
    }
  }, {
    root: null, // *** 关键更改：相对于视口/document 进行观察，实现整个页面滚动 ***
    threshold: 0.1
  });

  observer.observe(sentinel.value);
  console.log('LazyList: Observer initialized and observing sentinel.');
}

// ============== 生命周期钩子和 Watcher ================

onMounted(() => {
  console.log('LazyList: Component mounted.');
  initializeInternalState(); // 初始化内部状态

  nextTick(() => {
    initObserver(); // 初始化观察器
    // 如果没有初始数据（首次加载或缓存已清除），则触发加载第一批
    if (visibleListInternal.value.length === 0 && !noMoreInternal.value) {
      console.log('LazyList: No initial data, triggering first load after mount.');
      loadMore();
    }
  });
});

onBeforeUnmount(() => {
  console.log('LazyList: Component unmounting, disconnecting observer.');
  observer?.disconnect();
});

// 监听 allList prop 的变化，当数据源发生根本性改变时重置
watch(
  () => props.allList,
  (newAllList) => {
    console.log('LazyList: allList prop changed, re-initializing internal state.');
    // 如果 allList 变化，重置内部状态并重新初始化
    initializeInternalState(); 
    nextTick(() => {
      initObserver(); // 重新初始化观察器
      if (visibleListInternal.value.length === 0 && !noMoreInternal.value) {
          loadMore();
      }
    });
  },
  { deep: false }
);

// 监听从父组件传来的 v-model 相关的 props (cursor, noMore, modelValue) 的变化
// 这主要用于第一次 mount 时的初始化，因为后续变化会通过 emit 传递回父组件
// 如果父组件主动更新这些 props，这里也会同步
watch(
  [() => props.modelValue, () => props.cursor, () => props.noMore],
  ([newVisibleList, newCursor, newNoMore]) => {
    // 仅当传入的 prop 与内部当前值不同时才更新，避免无限循环
    // 这个 watch 主要确保从父组件传入的初始状态在组件重新创建时正确应用。
    if (newVisibleList !== visibleListInternal.value) {
        visibleListInternal.value = [...newVisibleList];
    }
    if (newCursor !== cursorInternal) {
        cursorInternal = newCursor;
    }
    if (newNoMore !== noMoreInternal.value) {
        noMoreInternal.value = newNoMore;
    }
    console.log('LazyList: Watched v-model props updated from parent.');
    nextTick(() => {
        // 如果需要，重新初始化 observer（例如，如果它因为 noMore 而断开）
        if (!observer || observer.root !== null) { // 确保 observer 正确设置为整个页面滚动
            initObserver();
        }
        if (visibleListInternal.value.length === 0 && !noMoreInternal.value) {
            loadMore(); // 如果父组件清空了列表且还有数据，则触发加载
        }
    });
  },
  { deep: false } // 对于数组引用变化，不需要深度监听
);

function formatDuration(sec: number | string | undefined): string {
  const s = Number(sec)
  if (isNaN(s) || s <= 0) return '00:00'
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.lazy-list-container {
  /* *** 关键更改：移除 height 和 overflow-y *** */
  /* 让内容自然撑开父容器和 body/html 的高度 */
  /* min-height: 100vh; 如果 body 是滚动容器，这里通常不需要 */
  box-sizing: border-box;
  padding-bottom: 80px; /* 仍然可以为底部留出空间 */
  /* position: relative; 如果哨兵或其他元素需要，否则可以移除 */
}

/* 其他样式（loading, spinner, no-more-text, sentinel）保持不变 */
.loading-tip {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30px 0;
  text-align: center;
}

.loading-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.spinner {
  width: 30px;
  height: 30px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  margin-top: 10px;
  color: #ff5f5f;
  font-weight: 500;
  font-size: 14px;
}

.no-more-text {
  text-align: center;
  padding: 20px 0;
  font-size: 14px;
  color: #999;
}

.sentinel {
  height: 1px;
}
</style>