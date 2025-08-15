import { defineStore } from 'pinia'
import {
  loginApi,
  registerApi,
  fetchUserInfoApi,
  autoRegisterApi,
  fetchTaskStatusApi,
  claimTaskApi,
  fetchLongVideoRemaining,
} from '@/api/user'

function unwrap(resp: any) {
  // 兼容多种返回：{data:{code,data}} / axios.data / 直接对象
  const root = resp?.data ?? resp ?? {}
  return root?.data ?? root
}

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
      vip_status: 0,
      vip_card_name: '',
      vip_expire_time: '',
      goldCoins: 0,
      points: 0,
      longVideoUsed: 0,
      longVideoMax: 0,
      dyVideoUsed: 0,
      dyVideoMax: 0,
      taskStatus: {} as any,
      longVideoRemaining: 0,
      can_view_vip_video: 0,
      can_watch_coin: 0,
    },
    userInfoLoaded: false,

    // ↓↓↓ 新增：并发合并 + 过期判断
    _inflight: null as Promise<any> | null,
    _lastFetchedAt: 0,
  }),

  getters: {
    uuid: (s) => s.userInfo?.uuid || '',
    nickname: (s) => s.userInfo?.nickname || '',
    avatar: (s) => s.userInfo?.avatar || '',
    inviteCode: (s) => s.userInfo?.inviteCode || '',
    inviteCount: (s) => s.userInfo?.inviteCount || 0,
    qrCodeUrl: (s) =>
      s.userInfo?.qrCodeUrl ||
      `https://api.qrserver.com/v1/create-qr-code/?data=https://example.com`,
    isVIP: (s) => Number(s.userInfo?.vip_status) === 1,
    vipCardName: (s) => s.userInfo?.vip_card_name || '',
    vipExpireTime: (s) => s.userInfo?.vip_expire_time || '',
    isBound: (s) => !!s.userInfo?.account,
    points: (s) => s.userInfo?.points || 0,
    longVideoRemaining: (s) => s.userInfo?.longVideoRemaining || 0,
    goldCoins: (s) => Number(s.userInfo?.goldCoins || 0), // 便于组件直接取
  },

  actions: {
    async autoRegisterIfNeed() {
      if (this.token) return
      const guestUuid = localStorage.getItem('guestUuid')
      const res = guestUuid
        ? await autoRegisterApi({ uuid: guestUuid })
        : await autoRegisterApi()
      const data = unwrap(res)
      const token = data.token
      const uuid = data.uuid
      if (token) {
        this.token = token
        localStorage.setItem('token', token)
      }
      if (uuid) localStorage.setItem('guestUuid', uuid)
    },

    /** 进入“我的”时用：按需刷新（默认 60s 之内不再打接口） */
    async ensureFreshUserInfo(opts?: { maxAgeMs?: number; force?: boolean }) {
      const maxAge = opts?.maxAgeMs ?? 60_000
      if (opts?.force) return this.fetchUserInfo(true)
      if (!this.userInfoLoaded) return this.fetchUserInfo(false)
      const age = Date.now() - (this._lastFetchedAt || 0)
      if (age > maxAge) return this.fetchUserInfo(false)
      return this.userInfo
    },

    /** 公开的“强制刷新”别名（充值/购买成功后调用） */
    async refreshUserInfo() {
      return this.fetchUserInfo(true)
    },

    /**
     * 拉用户信息（带并发合并 & 统一映射）
     * @param force 强制刷新（忽略缓存）
     */
    async fetchUserInfo(force = false) {
      if (!this.token) await this.autoRegisterIfNeed()

      // 并发合并：防抖多次同时调用
      if (this._inflight) return this._inflight
      if (this.userInfoLoaded && !force) return this.userInfo

      this._inflight = (async () => {
        const res = await fetchUserInfoApi()
        const raw = unwrap(res)

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
          can_view_vip_video: 0,
          can_watch_coin: 0,
        }

        // 统一字段映射
        const mapped = {
          ...raw,
          goldCoins: Number(
            raw.goldCoins ?? raw.coin ?? 0
          ),
          vip_status: Number(raw.vip_status ?? 0),
          longVideoUsed: raw.long_video_used ?? raw.longVideoUsed ?? 0,
          longVideoMax: raw.long_video_max ?? raw.longVideoMax ?? 0,
          dyVideoUsed: raw.dy_video_used ?? raw.dyVideoUsed ?? 0,
          dyVideoMax: raw.dy_video_max ?? raw.dyVideoMax ?? 0,
          points: raw.points ?? 0,
          longVideoRemaining:
            raw.long_video_remaining ?? raw.longVideoRemaining ?? 0,
          can_view_vip_video: raw.can_view_vip_video ?? 0,
          can_watch_coin: raw.can_watch_coin ?? 0,
        }

        Object.assign(this.userInfo, defaultInfo, mapped)
        this.userInfoLoaded = true
        this._lastFetchedAt = Date.now()

        // 持久化常用字段
        if (this.userInfo.uuid) localStorage.setItem('uuid', this.userInfo.uuid)
        if (this.userInfo.nickname) localStorage.setItem('nickname', this.userInfo.nickname)
        if (this.userInfo.avatar) localStorage.setItem('avatar', this.userInfo.avatar)
        if (this.userInfo.inviteCode) localStorage.setItem('inviteCode', this.userInfo.inviteCode)

        return this.userInfo
      })()

      try {
        return await this._inflight
      } finally {
        this._inflight = null
      }
    },

    async fetchLongVideoRemaining() {
      if (!this.userInfo.uuid) return 0
      try {
        const res = await fetchLongVideoRemaining(this.userInfo.uuid)
        const data = unwrap(res)
        const remain = Number(data.remaining ?? 0)
        this.userInfo.longVideoRemaining = remain
        return remain
      } catch (e) {
        console.error('获取长视频剩余观看次数失败', e)
        this.userInfo.longVideoRemaining = 0
        return 0
      }
    },

    async register(account: string, password: string) {
      if (!this.userInfo?.uuid) await this.fetchUserInfo()
      const uuid = this.userInfo.uuid
      if (!uuid) throw new Error('当前没有uuid，无法绑定')

      const res = await registerApi({ account, password, uuid })
      const data = unwrap(res)
      const token = data.token
      if (token) {
        this.token = token
        localStorage.setItem('token', token)
      }
      this.userInfoLoaded = false
      await this.fetchUserInfo(true)
      return this.userInfo
    },

    async login(account: string, password: string) {
      const res = await loginApi({ account, password })
      const data = unwrap(res)
      const token = data.token
      if (token) {
        this.token = token
        localStorage.setItem('token', token)
      }
      this.userInfoLoaded = false
      await this.fetchUserInfo(true)
      return this.userInfo
    },

    async initUser() {
      await this.autoRegisterIfNeed()
      this.userInfoLoaded = false
      return await this.fetchUserInfo(true)
    },

    logout() {
      this.token = ''
      localStorage.removeItem('token')
      this.userInfoLoaded = false
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
        autoRegisterApi({ uuid: guestUuid }).then(async (res) => {
          const data = unwrap(res)
          const token = data.token
          const uuid = data.uuid
          if (token) {
            this.token = token
            localStorage.setItem('token', token)
            if (uuid) localStorage.setItem('guestUuid', uuid)
            this.userInfoLoaded = false
            await this.fetchUserInfo(true)
          }
        })
      } else {
        this.autoRegisterIfNeed().then(async () => {
          this.userInfoLoaded = false
          await this.fetchUserInfo(true)
        })
      }
    },

    consumePoints(cost: number) {
      if (this.userInfo.points < cost) throw new Error('积分不足')
      this.userInfo.points -= cost
    },

    addPoints(score: number) {
      this.userInfo.points += score
    },

    async fetchTaskStatus() {
      const res = await fetchTaskStatusApi()
      const data = unwrap(res)
      if (data) {
        this.userInfo.taskStatus = data
        if (data.points !== undefined) this.userInfo.points = data.points
      }
      return data
    },

    async claimTask(type: string) {
      const res = await claimTaskApi({ type })
      const data = unwrap(res)
      if (Number(data.code ?? 0) === 0) await this.fetchTaskStatus()
      return data
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

    canWatchDyVideo() {
      return this.userInfo.dyVideoUsed < this.userInfo.dyVideoMax
    },
    consumeDyVideo() {
      if (this.userInfo.dyVideoUsed < this.userInfo.dyVideoMax) {
        this.userInfo.dyVideoUsed++
      } else {
        throw new Error('抖音视频观看次数已用完')
      }
    },
  },
})
