import { createRouter, createWebHistory } from 'vue-router'

// 懒加载页面组件
const Home = () => import('../views/Home.vue')
const Tiktok = () => import('../views/Tiktok.vue')
const Darknet = () => import('../views/Darknet.vue')
const Acg = () => import('../views/Acg.vue')
const Star = () => import('../views/Star.vue')
const Community = () => import('../views/Community.vue')
const Profile = () => import('../views/Profile.vue')
const PlayPage = () => import('../views/PlayPage.vue')
const PlayPageTikTok = () => import('../views/PlayPageTikTok.vue')
const SearchPopup = () => import('../pages/SearchPopup.vue')
const ListPage = () => import('../views/ListPage.vue')
const Vip = () => import('../views/Vip.vue')
const StarDetail = () => import('../views/StarDetail.vue')
const StarImageDetail = () => import('../views/StarImageDetail.vue')
const FullImageViewer = () => import('../views/FullImageViewer.vue')
const ComicDetail = () => import('../views/ComicDetail.vue')
const ComicReader = () => import('../views/ComicReader.vue')
const AudioPlayer = () => import('../views/AudioPlayer.vue')
const AcgMoreListPage = () => import('../components/AcgMoreListPage.vue')
const SearchMainPage = () => import('../components/SearchMainPage.vue')
const Setting = () => import('../views/Setting.vue')
const OrderRecord = () => import('../components/OrderRecord.vue')  // ⬅️ 放在 import 区域添加这一句
const MyPurchase = () => import('../components/MyPurchase.vue')
const MyFavorites = () => import('../components/MyFavorites.vue')
const OnlineService = () => import('../components/OnlineService.vue') // ✅ 新增这一句
const PromotionShare = () => import('../components/PromotionShare.vue')
const BrowseHistory = () => import('../components/BrowseHistory.vue')
const BenefitPage = () => import('../views/BenefitPage.vue')
const VipExchange = () => import('../views/VipExchange.vue')
const GroupJoinPage = () => import('../components/GroupJoinPage.vue')
const InviteCodePage = () => import('../components/InviteCodePage.vue')
const AllCategories = () => import('../components/AllCategories.vue')
const VideoRankPage = () => import('../components/VideoRankPage.vue')
const LimitedFreeList = () => import('../components/LimitedFreeList.vue') // ✅ 新增限免列表组件
const CompletedList = () => import('../components/CompletedList.vue') // ✅ 新增完结列表组件
const LimitedFreePage = () => import('../components/LimitedFreePage.vue')
const DailyFollowPage = () => import('../components/DailyFollowPage.vue')
const ComicRankPage = () => import('../components/ComicRankPage.vue')




// ✅ 新增小说阅读器
const NovelReader = () => import('../views/NovelReader.vue')

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/tiktokIndex', name: 'Tiktok', component: Tiktok },
  { path: '/darknet', name: 'Darknet', component: Darknet },
  { path: '/acg', name: 'Acg', component: Acg }, // Acg 组件的 keep-alive 逻辑在 Acg.vue 内部处理
  { path: '/star', name: 'Star', component: Star },
  { path: '/community', name: 'Community', component: Community },
  { path: '/profile', name: 'Profile', component: Profile },
  { path: '/play/:id', name: 'PlayPage', component: PlayPage, props: true },
  { path: '/play-tiktok', name: 'PlayPageTikTok', component: PlayPageTikTok },
  { path: '/search-popup', name: 'SearchPopup', component: SearchPopup },
  { path: '/list', name: 'ListPage', component: ListPage },
  { path: '/vip', name: 'Vip', component: Vip },
  { path: '/star-detail/:id', name: 'StarDetail', component: StarDetail, props: true },
  { path: '/star-image-detail/:data', name: 'StarImageDetail', component: StarImageDetail },
  { path: '/full-image/:data', name: 'FullImageViewer', component: FullImageViewer },
  


  // ✅ 漫画详情页（兼容带来源）
  {
    path: '/comic/:id/:source?',
    name: 'ComicDetail',
    component: ComicDetail,
    props: true,
    meta: { fromAcg: true } // ⭐️ 添加 meta 属性
  },

  // ✅ 漫画阅读器
  {
    path: '/comic/:comicId/chapter/:chapterId',
    name: 'ComicReader',
    component: ComicReader,
    props: true
    // 如果漫画阅读器也可能返回 Acg 页面，并且 Acg 页面需要知道这个来源，
    // 也可以考虑添加 fromAcg: true。但通常阅读器是新的浏览流。
  },

  // ✅ 小说详情页（复用 ComicDetail.vue，但 props 中加入 type）
  {
    path: '/novel/:id/:source?',
    name: 'NovelDetail',
    component: ComicDetail,
    props: route => ({ id: route.params.id, source: route.params.source, type: 'novel' }),
    meta: { fromAcg: true } // ⭐️ 添加 meta 属性
  },

  // ✅ 小说阅读器
  {
    path: '/novel/:comicId/chapter/:chapterId',
    name: 'NovelReader',
    component: NovelReader,
    props: true
    // 同 ComicReader，如果 NovelReader 也可能返回 Acg 页面，可以考虑添加 fromAcg: true
  },
{
  path: '/audio-player/:id',
  name: 'AudioPlayer',
  component: AudioPlayer,
  props: true
},
  // ✅ ACG 更多列表页
  {
    path: '/acg-more',
    name: 'AcgMoreListPage',
    component: AcgMoreListPage,
    meta: { fromAcg: true } // ⭐️ 添加 meta 属性 (如果从 Acg 页面跳转到此列表页)
  },
{ path: '/order-record', name: 'OrderRecord', component: OrderRecord }, // ✅ 加这一句
{ path: '/my-purchase', name: 'MyPurchase', component: MyPurchase },
{ path: '/my-favorites', name: 'MyFavorites', component: MyFavorites },
{ path: '/online-service', name: 'OnlineService', component: OnlineService },
{ path: '/promotion-share', name: 'PromotionShare', component: PromotionShare },
{ path: '/browse-history', name: 'BrowseHistory', component: BrowseHistory },
{ path: '/benefit-page', name: 'BenefitPage', component: BenefitPage },
{ path: '/vip-exchange', name: 'VipExchange', component: VipExchange },
{ path: '/group-join', name: 'GroupJoinPage', component: GroupJoinPage },
{ path: '/invite-code', name: 'InviteCodePage', component: InviteCodePage },
{ path: '/all-categories', name: 'AllCategories', component: AllCategories },
{ path: '/video-rank', name: 'VideoRankPage', component: VideoRankPage },
{ path: '/limited-free-list', name: 'LimitedFreeList', component: LimitedFreeList }, // ✅ 新增限免列表路由
{ path: '/completed-list', name: 'CompletedList', component: CompletedList }, // ✅ 新增完结列表路由
{ path: '/limited-free', name: 'LimitedFreePage', component: LimitedFreePage },
{ path: '/daily-follow', name: 'DailyFollowPage', component: DailyFollowPage },
{ path: '/comic-rank', name: 'ComicRankPage', component: ComicRankPage },




  // ✅ 搜索主页
  {
    path: '/search-main',
    name: 'SearchMainPage',
    component: SearchMainPage,
    meta: { fromAcg: true } // ⭐️ 添加 meta 属性 (如果从 Acg 页面跳转到搜索页)
  },
  { path: '/setting', name: 'Setting', component: Setting }
]



// ⭐️ 移除 scrollPositions 变量

const router = createRouter({
  history: createWebHistory(),
  routes,
  // ⭐️ 修改 scrollBehavior 钩子，仅处理保存的滚动位置，或默认回到顶部
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition; // 如果有保存的位置（浏览器前进/后退），则使用
    } else {
      // 对于其他情况（例如首次进入页面），滚动到顶部
      // Acg 组件的内部滚动由其自身的逻辑管理，这里不干预
      return { top: 0 };
    }
  }
});

// ⭐️ 移除 router.beforeEach 中的 scrollPositions 记录
// 因为 Acg.vue 会自行管理其内部的滚动位置，避免冲突

export default router;