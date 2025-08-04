import { defineStore } from 'pinia'
import {
  loginApi,
  registerApi,
  fetchUserInfoApi,
  autoRegisterApi,
  fetchTaskStatusApi,
  claimTaskApi,
  fetchLongVideoRemaining // 记得在 src/api/user.ts 里导出这个接口
} from '@/api/user'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    userInfo: {
      uuid: localStorage.getItem('uuid') || '',
      nickname: localStorage.getItem('nickname') || '',
      avatar: localStorage.getItem('avatar') || '',
      inviteCode: localStorage.getItem('inviteCode') || '',
      inviteCount: 0,
      qrCodeUrl: '',
      account: '',
      vip_status: 0,             // ← 只认这个，数字
      vip_card_name: '',
      vip_expire_time: '',
      goldCoins: 0,
      points: 0,
      longVideoUsed: 0,
      longVideoMax: 0,
      dyVideoUsed: 0,
      dyVideoMax: 0,
      taskStatus: {},
      longVideoRemaining: 0,
      can_view_vip_video: 0, // 新增
      can_watch_coin: 0,     // 新增
    },
    userInfoLoaded: false, // ← 新增：是否已拉过 userInfo
  }),
  getters: {
    uuid: (state) => state.userInfo?.uuid || '',
    nickname: (state) => state.userInfo?.nickname || '',
    avatar: (state) => state.userInfo?.avatar || '',
    inviteCode: (state) => state.userInfo?.inviteCode || '',
    inviteCount: (state) => state.userInfo?.inviteCount || 0,
    qrCodeUrl: (state) =>
      state.userInfo?.qrCodeUrl ||
      `https://api.qrserver.com/v1/create-qr-code/?data=https://example.com`,
    isVIP: (state) => state.userInfo?.vip_status === 1,
    vipCardName: (state) => state.userInfo?.vip_card_name || '',
    vipExpireTime: (state) => state.userInfo?.vip_expire_time || '',
    isBound: (state) => !!state.userInfo?.account,
    points: (state) => state.userInfo?.points || 0,
    longVideoRemaining: (state) => state.userInfo?.longVideoRemaining || 0,
  },

  actions: {
    async autoRegisterIfNeed() {
  if (!this.token) {
    const guestUuid = localStorage.getItem('guestUuid')
    const res = guestUuid
      ? await autoRegisterApi({ uuid: guestUuid })
      : await autoRegisterApi()
    console.log('autoRegister 返回:', res)
    const token = res.token
    const uuid = res.uuid
    this.token = token
    localStorage.setItem('token', token)
    if (uuid) {
      localStorage.setItem('guestUuid', uuid)
    }
    console.log('注册游客后 token:', this.token, 'localStorage token:', localStorage.getItem('token'))
  }
},

    /**
     * 拉取用户信息，有缓存（默认只请求一次，强制刷新传 true）
     */
    async fetchUserInfo(force = false) {
      if (this.userInfoLoaded && !force) {
        // 已经拉过，且不强制刷新，直接返回
        return this.userInfo
      }
      if (!this.token) {
        await this.autoRegisterIfNeed()
      }
      const res = await fetchUserInfoApi()
      // console.log('接口返回res', res)

      const defaultInfo = {
        uuid: '',
        nickname: '',
        avatar: '',
        inviteCode: '',
        inviteCount: 0,
        qrCodeUrl: '',
        account: '',
        vip_status: 0,
        vip_card_name: '',
        vip_expire_time: '',
        goldCoins: 0,
        points: 0,
        longVideoUsed: 0,
        longVideoMax: 0,
        dyVideoUsed: 0,
        dyVideoMax: 0,
        taskStatus: {},
        longVideoRemaining: 0,
        can_view_vip_video: 0, // 新增
        can_watch_coin: 0,     // 新增
      }

      // 关键：coin -> goldCoins
      const mappedRes = {
        ...res,
        goldCoins: typeof res.goldCoins === 'number'
          ? res.goldCoins
          : (typeof res.coin === 'number' ? res.coin : 0), // ★★ 就多了这一句 ★★
        longVideoUsed: res.long_video_used ?? 0,
        longVideoMax: res.long_video_max ?? 0,
        dyVideoUsed: res.dy_video_used ?? 0,
        dyVideoMax: res.dy_video_max ?? 0,
        points: res.points ?? 0,
        longVideoRemaining: res.long_video_remaining ?? 0,
        can_view_vip_video: res.can_view_vip_video ?? 0, // 新增
        can_watch_coin: res.can_watch_coin ?? 0,         // 新增
      }

      Object.assign(this.userInfo, defaultInfo, mappedRes)
      this.userInfoLoaded = true // ← 设置已拉过

      if (this.userInfo?.uuid) {
        localStorage.setItem('uuid', this.userInfo.uuid)
      }
      if (this.userInfo?.nickname) {
        localStorage.setItem('nickname', this.userInfo.nickname)
      }
      if (this.userInfo?.avatar) {
        localStorage.setItem('avatar', this.userInfo.avatar)
      }
      if (this.userInfo?.inviteCode) {
        localStorage.setItem('inviteCode', this.userInfo.inviteCode)
      }

      return this.userInfo
    },

    async fetchLongVideoRemaining() {
      if (!this.userInfo.uuid) return 0
      try {
        const res = await fetchLongVideoRemaining(this.userInfo.uuid)
        if (res && typeof res.remaining === 'number') {
          this.userInfo.longVideoRemaining = res.remaining
          return res.remaining
        }
        this.userInfo.longVideoRemaining = 0
        return 0
      } catch (error) {
        console.error('获取长视频剩余观看次数失败', error)
        this.userInfo.longVideoRemaining = 0
        return 0
      }
    },

    async register(account, password) {
      if (!this.userInfo?.uuid) {
        await this.fetchUserInfo()
      }
      const uuid = this.userInfo.uuid
      if (!uuid) throw new Error('当前没有uuid，无法绑定')

      const res = await registerApi({ account, password, uuid })
      const token = res.token
      if (token) {
        this.token = token
        localStorage.setItem('token', token)
      }

      this.userInfoLoaded = false // 注册后一定要强制刷新
      await this.fetchUserInfo(true)
      return this.userInfo
    },

    async login(account, password) {
      const res = await loginApi({ account, password })
      const token = res.token
      if (token) {
        this.token = token
        localStorage.setItem('token', token)
      }
      this.userInfoLoaded = false // 登录后一定要强制刷新
      await this.fetchUserInfo(true)
      return this.userInfo
    },

    async initUser() {
      await this.autoRegisterIfNeed()
      this.userInfoLoaded = false // 启动时强制刷新
      return await this.fetchUserInfo(true)
    },

    logout() {
      this.token = ''
      localStorage.removeItem('token')
      this.userInfoLoaded = false // ← 登出重置
      this.userInfo = {
        uuid: '',
        nickname: '',
        avatar: '',
        inviteCode: '',
        inviteCount: 0,
        qrCodeUrl: '',
        account: '',
        vip_status: 0,
        vip_card_name: '',
        vip_expire_time: '',
        goldCoins: 0,
        points: 0,
        longVideoUsed: 0,
        longVideoMax: 0,
        dyVideoUsed: 0,
        dyVideoMax: 0,
        taskStatus: {},
        longVideoRemaining: 0,
        can_view_vip_video: 0,
        can_watch_coin: 0,
      }
      const guestUuid = localStorage.getItem('guestUuid')
      if (guestUuid) {
        autoRegisterApi({ uuid: guestUuid }).then((res) => {
          const token = res.token
          const uuid = res.uuid
          if (token) {
            this.token = token
            localStorage.setItem('token', token)
            if (uuid) {
              localStorage.setItem('guestUuid', uuid)
            }
            this.userInfoLoaded = false
            this.fetchUserInfo(true)
          }
        })
      } else {
        this.autoRegisterIfNeed().then(() => {
          this.userInfoLoaded = false
          this.fetchUserInfo(true)
        })
      }
    },

    consumePoints(cost) {
      if (this.userInfo.points < cost) {
        throw new Error('积分不足')
      }
      this.userInfo.points -= cost
    },

    addPoints(score) {
      this.userInfo.points += score
    },

    async fetchTaskStatus() {
      const res = await fetchTaskStatusApi()
      if (res?.data) {
        this.userInfo.taskStatus = res.data
        if (res.data.points !== undefined) {
          this.userInfo.points = res.data.points
        }
      }
      return res
    },

    async claimTask(type) {
      const res = await claimTaskApi({ type })
      if (res.code === 0) {
        await this.fetchTaskStatus()
      }
      return res
    },

    canWatchLongVideo() {
      return this.userInfo.longVideoUsed < this.userInfo.longVideoMax
    },

    consumeLongVideo() {
      if (this.userInfo.longVideoUsed < this.userInfo.longVideoMax) {
        this.userInfo.longVideoUsed++
      } else {
        throw new Error('长视频观看次数已用完')
      }
    },
  },
})
