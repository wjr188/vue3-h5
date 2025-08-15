/**
 * 防爬虫加密API SDK - TypeScript版本
 * 适用于Vue3项目
 */

import CryptoJS from 'crypto-js';
import { JSEncrypt } from 'jsencrypt';
import { showToast } from 'vant';

interface ApiConfig {
  baseURL?: string;
  publicKey?: string;
  apiMap?: Record<string, string>;
  debug?: boolean;
  timeout?: number;
  useSessionKey?: boolean; // 新增：是否使用会话密钥模式
}

interface KeyData {
  key: string;
  iv: string;
}

interface SessionKeyData {
  kid: string;
  key: string;
  iv: string;
  ttl: number;
  serverTime: number;
  publicKey?: string; // 动态公钥
  userSecret?: string; // 动态用户密钥
  expiresAt?: number; // 本地计算的过期时间
}

interface EncryptedRequest {
  m: string;  // method id
  d: string;  // encrypted data
}

interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
  encrypted?: boolean; // 标识响应是否加密
  timestamp?: number; // 响应时间戳（用于防篡改）
  signature?: string; // 响应签名（用于防篡改）
}

class EncryptedApiClient {
  private baseURL: string;
  private publicKey: string;
  private apiMap: Record<string, string>;
  private debug: boolean;
  private timeout: number;
  private useSessionKey: boolean;
  private sessionKey: SessionKeyData | null = null;
  private sessionKeyPromise: Promise<SessionKeyData> | null = null;

  constructor(config: ApiConfig = {}) {
    this.baseURL = config.baseURL || '';
    // 从配置或环境变量读取公钥，如果没有则等待从 /key 接口动态获取
    const envKey = (import.meta as any).env?.VITE_APP_PUBLIC_KEY as string | undefined;
    this.publicKey = config.publicKey || envKey || '';
    if (this.publicKey) {
      // 如果有初始公钥，进行标准化处理
      this.publicKey = this.normalizePem(this.publicKey.trim());
    }
    this.apiMap = config.apiMap || this.getDefaultApiMap();
    this.debug = config.debug || false;
    this.timeout = config.timeout || 10000;
    this.useSessionKey = config.useSessionKey ?? true; // 默认启用会话密钥模式

    if (this.debug) {
      if (this.publicKey) {
        const fp = CryptoJS.SHA256(CryptoJS.enc.Utf8.parse(this.publicKey)).toString().slice(0, 8);
        console.log('🔑 Initial RSA PublicKey (fp/first40):', fp, this.publicKey.slice(0, 40) + '...');
      } else {
        console.log('🔑 No initial public key, will fetch from server');
      }
      console.log('🔄 Session key mode:', this.useSessionKey ? 'enabled' : 'disabled');
    }
  }

  // 规范化PEM：去除多余空白、确保头尾、按64列折行
  private normalizePem(pem: string): string {
    const body = pem
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\s+/g, '');
    return this.wrapPem(body);
  }

  private wrapPem(base64Body: string): string {
    if (!base64Body) return '';
    const lines: string[] = [];
    for (let i = 0; i < base64Body.length; i += 64) {
      lines.push(base64Body.slice(i, i + 64));
    }
    return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
  }

  private getDefaultPublicKey(): string {
    return `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuR9U470BPBdpB2Me7yqs
/Jt4DeMPYUe2y+nkuQNZzN6WO4B/JBdXkfbAuI+5VtnRPLzecRunANazwfJme6m
PZxd4x+by+JBtnl/G0dZwOsj+IUvZhe8y96ENMAfLBNZwtnx+4S/awOcj+8VNJk
t7zN6EdsAvbBeFw/HyOITNqwfMkPMVdp0+rzd6Uu8A9LBu5xOYCfYTeawtMkdMV
uJ1PMDt6k/MBOrB/JxdYCtITu6w98kt8V+p1dMD961NMBvLCNpxuoC+IT9KxOc0
OsWO51uMEN7Ct5x+4DOYUOqxfM0fMWdJ2OcEt7VNsCPbC/JyPIDeoUe6xtM0tcQ
PJlO8EeLCfZyfYEO4Uvax+c0+cQtZ2fcFOLwIDAQAB
-----END PUBLIC KEY-----`;
  }

  private getDefaultApiMap(): Record<string, string> {
    return {
      // 长视频分类接口
      'long_video_category': 'b2c3d4',
      'long_video_category_videos': 'b3c4d5',
      
      // 长视频相关接口
      'long_video_h5_list': 'g8h9i0',
      'long_video_h5_detail': 'h9i0j1',
      'long_video_play': 'i0j1k2',
      'long_video_all': 'j1k2l3',
      'long_video_guess_you_like': 'k2l3m4',
      'long_video_track': 'l3m4n5',
      'long_video_rank': 'm4n5o6',
      'long_video_limited_free': 'n5o6p7',
      'long_video_tag_list': 'lt1g2h',
      
      // 动漫相关接口
      'anime_category_list': 'o6p7q8',
      'anime_category_group': 'p7q8r9',
      'anime_sub_animes': 'q8r9s0',
      'anime_video_list': 'r9s0t1',
      'anime_recommend_all': 's0t1u2',
      'anime_recommend_groups': 't1u2v3',
      'anime_tags': 'u2v3w4',
      
      // H5长视频相关接口
      'h5_long_home': 'c3d4e5',
      'h5_long_video_detail': 'd4e5f6', 
      'h5_long_group_videos': 'e5f6g7',
      
      // 广告相关接口
      'banner_list': 'f7g8h9',

      // 搜索相关接口（前台）
      'search_hot_keywords': 's1h2k3',
      
      // 弹窗配置接口
      'popup_config': 'p1c2f3',
      
      // 有声小说模块
      'audio_novel_category_list': 'a1b2c3',
      'audio_novel_list': 'a2b3c4', 
      'audio_novel_detail': 'a3b4c5',
      'audio_novel_chapter_list': 'a4b5c6',
      'audio_novel_chapter_detail': 'a5b6c7', 
      'audio_novel_chapter_play': 'a6b7c8',
      'audio_novel_tag_list': 'a7b8c9',
      'audio_recommend_all_groups': 'a8b9c1',
      'audio_recommend_group_audios': 'a9b1c2',
      
      // 文字小说模块 (H5前端)
      'text_novel_category_list': 'tn1a2b',
      'text_novel_list': 'tn2b3c',
      'text_novel_detail': 'tn3c4d',
      'text_novel_chapter_list': 'tn4d5e',
      'text_novel_chapter_detail': 'tn5e6f',
      'text_novel_recommend_all_groups': 'tn6f7g',
      'text_novel_recommend_group_novels': 'tn7g8h',
      'text_novel_tag_list': 'tn8h9i',
      
      // 浏览记录模块
      'browse_history_list': 'b1c2d3',
      'browse_history_all_types': 'b9c8d7',
      'browse_history_add': 'b4c5d6',
      'browse_history_delete': 'b7d8e9', // 删除浏览记录
      
      // 金币套餐模块
      'coin_package_list': 'c1o2i3',
      'coin_package_add': 'c2o3i4',
      'coin_package_update': 'c3o4i5',
      'coin_package_delete': 'c4o5i6',
      'coin_package_status': 'c5o6i7',
      
      // 用户基础接口
      'user_login': 'u1a2b3',
      'user_register': 'u2a3b4',
      'user_info': 'u3a4b5',
      'user_auto_register': 'u4a5b6',
      'user_task_status': 'u5a6b7',
      'user_claim_task': 'u6a7b8',
      'long_video_can_watch': 'u7a8b9',
      
      // 积分兑换相关接口
      'points_exchange_list': 'pe1l2t',
      'points_exchange': 'pe2e3g',
      'points_exchange_records': 'pe3r4d',
      
      // VIP卡片管理接口
      'vip_card_list': 'vip1l2t',
      'vip_card_save': 'vip2s3v',
      'vip_card_update': 'vip3u4p',
      'vip_card_toggle_status': 'vip4t5s',
      'vip_card_delete': 'vip5d6l',
      'vip_card_all': 'vip6a7l',
      
      // OnlyFans H5前台接口
      'onlyfans_categories': 'of1c2a',
      'onlyfans_creators_by_category': 'of2c3b',
      'onlyfans_creator_detail': 'of3c4d',
      'onlyfans_creator_profile': 'of4c5p',
      'onlyfans_creator_media': 'of5c6m',
      'onlyfans_media_detail': 'of6m7d',
      'onlyfans_media_images': 'of7m8i',
      'onlyfans_search': 'of8s9r',
      
      // 漫画分类管理
      'comic_category_list': 'cm1a2b',
      'comic_category_add': 'cm2b3c',
      'comic_category_update': 'cm3c4d',
      'comic_category_delete': 'cm4d5e',
      'comic_category_batch_delete': 'cm5e6f',
      'comic_category_toggle_status': 'cm6f7g',
      'comic_category_batch_set_status': 'cm7g8h',
      
      // 漫画内容管理
      'comic_detail': 'cm8h9i',
      'comic_chapters': 'cm9i0j',
      'comic_chapter_detail': 'cm0j1k',
      'comic_chapter_images': 'cm1k2l',
      'comic_manga_list': 'cm2l3m',
      'comic_list': 'cm2l3m', // 别名映射，防止调用错误
      
      // 漫画推荐分组
      'comic_recommend_groups': 'cm3m4n',
      'comic_recommend_group_add': 'cm4n5o',
      'comic_recommend_group_update': 'cm5o6p',
      'comic_recommend_group_delete': 'cm6p7q',
      'comic_recommend_groups_sort': 'cm7q8r',
      'comic_recommend_group_comics': 'cm8r9s',
      'comic_recommend_group_comics_save': 'cm9s0t',
      
      // 漫画推荐池
      'comic_ungrouped_comics': 'cm0t1u',
      'comic_all_comics': 'cm1u2v',
      'comic_main_recommend_categories': 'cm2v3w',
      'comic_child_recommend_categories': 'cm3w4x',
      'comic_all_recommend_groups_with_comics': 'cm4x5y',
      'comic_sub_category_comics': 'cm5y6z',
      
      // 漫画标签和榜单
      'comic_tag_list': 'cm6z7a',
      'comic_rank_list': 'cm7a8b',
      'comic_daily_updates': 'cm8b9c',
      'comic_weekly_updates': 'cm9c0d',
      'comic_weekly_all_updates': 'cm0d1e',
      
      // 抖音视频相关接口
      'douyin_video_h5_list': 'dv1h2l',
      'douyin_video_play': 'dv3p4y',
      'douyin_tag_all': 'dt7a8l',
      'douyin_video_discover': 'dv4d5c',
      'douyin_video_h5_detail': 'dv5h6d',
      'douyin_video_search': 'dv6s7h',
      
      // 抖音关键词相关接口
      'douyin_keywords_enabled': 'dk1e2n',
      'douyin_keywords_random': 'dk2r3d',
      'douyin_keyword_click': 'dk3c4k',
      'douyin_keyword_display': 'dk4d5p',
      'douyin_keywords_list': 'dk5l6t',
      
      // 暗网视频相关接口
      'darknet_home': 'dn1h2m',
      'darknet_group_videos': 'dn2g3v',
      'darknet_categories_list': 'dn3c4l',
      'darknet_videos_h5_list': 'dn4v5h',
      'darknet_category_videos': 'dn5c6v',
      
      // 用户行为接口
      'user_like': 'ua1l2k',
      'user_unlike': 'ua2u3k',
      'user_collect': 'ua3c4t',
      'user_uncollect': 'ua4u5t',
      'user_action_status': 'ua5a6s',
      'user_batch_action_status': 'ua6b7s',
      'user_collections': 'ua7c8s',
      
      // 解锁系统接口
      'unlock_long_video': 'ul1l2v',
      'unlock_darknet_video': 'ul2d3v',
      'unlock_anime_video': 'ul3a4v',
      'unlock_star_video': 'ul4s5v',
      'unlock_douyin_video': 'ul5d6v',
      'unlock_comic_chapter': 'ul6c7h',
      'unlock_comic_whole': 'ul7c8w',
      'unlock_novel_chapter': 'ul8n9h',
      'unlock_novel_whole': 'ul9n0w',
      'unlock_audio_novel_chapter': 'ul0a1h',
      'unlocked_chapters': 'ul1u2c',
      'unlocked_novel_chapters': 'ul2u3c',
      'unlocked_audio_novel_chapters': 'ul3u4c',
    };
  }

  /**
   * 获取会话密钥（新模式）
   */
  private async getSessionKey(): Promise<SessionKeyData> {
    // 如果已有有效的会话密钥，直接返回
    if (this.sessionKey && this.isSessionKeyValid(this.sessionKey)) {
      return this.sessionKey;
    }

    // 如果正在获取会话密钥，等待结果
    if (this.sessionKeyPromise) {
      return this.sessionKeyPromise;
    }

    // 开始获取新的会话密钥
    this.sessionKeyPromise = this.fetchSessionKey();
    
    try {
      const sessionKey = await this.sessionKeyPromise;
      this.sessionKey = sessionKey;
      return sessionKey;
    } finally {
      this.sessionKeyPromise = null;
    }
  }

  /**
   * 从服务器获取会话密钥
   */
  private async fetchSessionKey(): Promise<SessionKeyData> {
    const deviceId = this.getDeviceId();
    const token = this.getAuthToken();

    const response = await fetch(this.baseURL + '/key', {
      method: 'GET',
      headers: (() => {
        const h: Record<string, string> = {
          'X-Device-Id': deviceId,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
        // 仅在有 token 时设置 authorization 头
        if (token) h['authorization'] = token
        return h
      })(),
      cache: 'no-store'
    } as RequestInit);

    if (!response.ok) {
      throw new Error(`获取会话密钥失败: HTTP ${response.status}`);
    }

    const ct = response.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      const txt = await response.text();
      throw new Error(`获取会话密钥失败: 非JSON响应(${ct}) 片段: ${txt.slice(0, 120)}`);
    }

    const result = await response.json();
    
    if (result.code !== 0) {
      throw new Error(result.msg || '获取会话密钥失败');
    }

    const sessionKey: SessionKeyData = {
      ...result.data,
      expiresAt: Date.now() + (result.data.ttl * 1000) - 30000 // 提前30秒过期，留出缓冲时间
    };

    // 处理动态公钥
    if (result.data.publicKey) {
      this.publicKey = this.normalizePem(result.data.publicKey);
      if (this.debug) {
        console.log('🔑 Public key updated from server');
      }
    }

    // 处理动态用户密钥
    if (result.data.userSecret) {
      localStorage.setItem('userSecret', result.data.userSecret);
      if (this.debug) {
        console.log('🔑 User secret updated from server');
      }
    }

    if (this.debug) {
      console.log('🔑 Session key obtained:', {
        kid: sessionKey.kid,
        ttl: sessionKey.ttl,
        expiresAt: new Date(sessionKey.expiresAt!).toLocaleString(),
        hasPublicKey: !!result.data.publicKey,
        hasUserSecret: !!result.data.userSecret
      });
    }

    return sessionKey;
  }

  /**
   * 检查会话密钥是否有效
   */
  private isSessionKeyValid(sessionKey: SessionKeyData): boolean {
    return sessionKey.expiresAt ? Date.now() < sessionKey.expiresAt : false;
  }

  /**
   * 清除会话密钥（强制重新获取）
   */
  private clearSessionKey(): void {
    this.sessionKey = null;
    this.sessionKeyPromise = null;
  }
  /**
   * 调用加密API（支持新旧两种模式）
   */
  async call<T = any>(apiName: string, params: any = {}, method: 'GET' | 'POST' = 'GET'): Promise<T> {
    // 🚨 调试日志：显示所有API调用
    console.log(`🔍 API调用: ${apiName} (${method})`, params);
    
    // 检查接口映射是否存在
    const methodId = this.apiMap[apiName];
    if (!methodId) {
      console.error(`❌ 接口映射不存在: ${apiName}`);
      console.log('📋 当前可用的接口映射:', Object.keys(this.apiMap));
      throw new Error(`API ${apiName} not found in mapping table`);
    } else {
      console.log(`✅ 接口映射找到: ${apiName} → ${methodId}`);
    }
    
    const maxRetries = 2;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        attempt++;
        return await this.callInternal<T>(apiName, params, method);
      } catch (error: any) {
        // 如果是会话密钥过期（4011），尝试重新获取密钥并重试
        if (error.message.includes('4011') || error.message.includes('会话密钥已过期')) {
          if (attempt < maxRetries && this.useSessionKey) {
            if (this.debug) {
              console.log('🔑 Session key expired, retrying...');
            }
            this.clearSessionKey();
            continue;
          }
        }
        throw error;
      }
    }

    throw new Error('请求失败，已达到最大重试次数');
  }

  /**
   * 内部调用方法
   */
  private async callInternal<T = any>(apiName: string, params: any = {}, method: 'GET' | 'POST' = 'GET'): Promise<T> {
    try {
      // 1. 获取映射ID
      const methodId = this.apiMap[apiName];
      if (!methodId) {
        throw new Error(`API ${apiName} not found in mapping table`);
      }

      let aesKey: Uint8Array;
      let aesIv: Uint8Array;
      let encryptedKey: string | undefined;
      let keyId: string | undefined;

      if (this.useSessionKey) {
        // 新模式：使用会话密钥
        const sessionKey = await this.getSessionKey();
        aesKey = new Uint8Array(atob(sessionKey.key).split('').map(c => c.charCodeAt(0)));
        aesIv = new Uint8Array(atob(sessionKey.iv).split('').map(c => c.charCodeAt(0)));
        keyId = sessionKey.kid;
      } else {
        // 旧模式：生成随机AES密钥和IV
        aesKey = this.generateRandomBytes(32);
        aesIv = this.generateRandomBytes(16);

        // RSA加密AES密钥
        const keyData: KeyData = {
          key: btoa(String.fromCharCode(...aesKey)),
          iv: btoa(String.fromCharCode(...aesIv))
        };
        encryptedKey = this.rsaEncrypt(JSON.stringify(keyData));
      }

      // 3. AES加密请求参数
      const encryptedData = this.aesEncrypt(JSON.stringify(params), aesKey, aesIv);

      // 4. 生成请求头
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = this.generateNonce();
      const deviceId = this.getDeviceId();
      const token = this.getAuthToken();

      // 5. 生成签名
      const secret = this.getUserSecret();
      const stringToSign = `${timestamp}\n${nonce}\n${methodId}\n${encryptedData}`;
      const signature = this.hmacSha256(stringToSign, secret);

      if (this.debug) {
        console.log('🔐 加密请求调试信息:', {
          apiName,
          methodId,
          timestamp,
          nonce,
          deviceId,
          keyMode: this.useSessionKey ? 'session' : 'rsa',
          keyId: keyId || 'N/A',
          signature: signature.substr(0, 10) + '...',
          requestParams: params // 添加请求参数日志
        });
        
        // 特别标记漫画和有声小说接口
        if (apiName.includes('comic')) {
          console.log('🎨 漫画接口调用:', apiName, '→', methodId);
        }
        if (apiName.includes('audio')) {
          console.log('🎵 有声接口调用:', apiName, '→', methodId);
        }
      }

      // 6. 发送请求
      const url = this.baseURL + '/x';
      const requestBody: EncryptedRequest = {
        m: methodId,
        d: encryptedData
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Timestamp': timestamp.toString(),
        'X-Nonce': nonce,
        'X-Signature': signature,
        'X-Device-Id': deviceId,
      };
      // 仅在有 token 时设置 authorization 头
      if (token) headers['authorization'] = token

      // 根据模式设置不同的密钥头
      if (this.useSessionKey && keyId) {
        headers['X-Key-Id'] = keyId;
      } else if (encryptedKey) {
        headers['X-Enc-Key'] = encryptedKey;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApiResponse<T> = await response.json();
      
      // 处理加密响应
      if (result.encrypted && result.data) {
        // 仅负责“解密 + 解析”的异常捕获，避免把业务错误误判为解密失败
        let decryptedResult: any;
        try {
          // 验证响应完整性（防篡改检查）
          if (result.signature && result.timestamp) {
            const secret = this.getUserSecret();
            const signatureData = `${result.timestamp}\n${result.data}`;
            const expectedSignature = this.hmacSha256(signatureData, secret);
            if (!this.constantTimeCompare(expectedSignature, result.signature)) {
              throw new Error('响应数据完整性校验失败');
            }
            const now = Math.floor(Date.now() / 1000);
            if (Math.abs(now - result.timestamp) > 300 && this.debug) {
              console.warn('⏰ 响应时间戳异常，可能存在重放攻击');
            }
          } else if (this.debug) {
            console.warn('⚠️ 响应缺少完整性校验信息');
          }

          // 解密并解析
          const decryptedData = this.aesDecrypt(result.data as string, aesKey, aesIv);
          decryptedResult = JSON.parse(decryptedData);

          if (this.debug) {
            console.log('📡 解密后的API响应:', decryptedResult);
          }
        } catch (decryptError: any) {
          if (this.debug) {
            console.error('🔓 响应解密失败:', decryptError);
            console.error('🔓 解密失败详情:', {
              encryptedLength: result.data ? (result.data as string).length : 0,
              aesKeyLength: aesKey.length,
              aesIvLength: aesIv.length,
              hasSignature: !!result.signature,
              hasTimestamp: !!result.timestamp,
              error: decryptError.message
            });
          }
          throw new Error(decryptError?.message || '响应数据处理失败');
        }

        // 到这里表示解密成功；下面仅处理“业务错误”，不要再进入解密失败的分支
        if (decryptedResult && decryptedResult.code !== 0) {
          const msg = decryptedResult.msg || '请求错误';
          // 401 清理本地态
          if (decryptedResult.code === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('userSecret');
            if (this.debug) console.warn('登录失效，已清理本地凭据');
          }
          // 给业务错误打标，便于最外层 catch 不再重复提示/打印
          const bizErr: any = new Error(msg || `请求失败，错误码：${decryptedResult.code}`);
          bizErr.isBusiness = true;
          throw bizErr;
        }

        return decryptedResult?.data as T;
      }
      
      if (this.debug) {
        console.log('📡 明文API响应:', result);
      }

      // 处理明文响应的业务逻辑错误
      if (result.code !== 0) {
        showToast(result.msg || "请求错误");
        if (result.code === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("userSecret");
          showToast("登录失效，请重新登录");
        }
        // 特殊处理会话密钥过期错误
        if (result.code === 4011) {
          throw new Error(`4011: ${result.msg || '会话密钥已过期'}`);
        }
        throw new Error(result.msg || `请求失败，错误码：${result.code}`);
      }

      return result.data;

    } catch (error: any) {
      // 网络/未知错误才打印与提示；业务错误已在上面打标 isBusiness，避免二次噪音
      if (this.debug || !error?.isBusiness) {
        console.error('🚨 加密API调用失败:', error);
      }

      if (!error?.isBusiness &&
          !error.message?.includes('登录失效') &&
          !error.message?.includes('请求错误') &&
          !error.message?.includes('4011')) {
        showToast('网络错误，请稍后再试');
      }
      throw error;
    }
  }

  // 工具方法
  private generateRandomBytes(length: number): Uint8Array {
    const array = new Uint8Array(length);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return array;
  }

  private generateNonce(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2);
    return timestamp + '_' + random;
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint', 2, 2);
      }
      
      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL()
      ].join('|');
      
      deviceId = btoa(fingerprint).substr(0, 32);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  private getAuthToken(): string {
    const token = localStorage.getItem('token');
    return token ? `Bearer ${token}` : '';
  }

  private getUserSecret(): string {
    return localStorage.getItem('userSecret') || '';
  }

  private aesEncrypt(data: string, key: Uint8Array, iv: Uint8Array): string {
    const keyWords = CryptoJS.lib.WordArray.create(key);
    const ivWords = CryptoJS.lib.WordArray.create(iv);
    const encrypted = CryptoJS.AES.encrypt(data, keyWords, {
      iv: ivWords,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString();
  }

  private aesDecrypt(encryptedData: string, key: Uint8Array, iv: Uint8Array): string {
    const keyWords = CryptoJS.lib.WordArray.create(key);
    const ivWords = CryptoJS.lib.WordArray.create(iv);
    const decrypted = CryptoJS.AES.decrypt(encryptedData, keyWords, {
      iv: ivWords,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  private rsaEncrypt(data: string): string {
    // 如果没有公钥，说明还没有从服务器获取，抛出错误
    if (!this.publicKey) {
      throw new Error('RSA公钥尚未从服务器获取，请稍后重试');
    }

    const tryEncrypt = (pem: string) => {
      const enc = new JSEncrypt();
      enc.setPublicKey(pem);
      return enc.encrypt(data) as string | false;
    };

    // 第一次用当前公钥
    let encrypted = tryEncrypt(this.publicKey);
    if (!encrypted) {
      console.error('RSA加密失败：公钥可能无效，尝试使用内置默认公钥重试');
      const fallback = this.getDefaultPublicKey();
      const normalized = this.normalizePem(fallback);
      encrypted = tryEncrypt(normalized);
      if (encrypted) {
        // 切换到可用公钥，后续复用
        this.publicKey = normalized;
      }
    }

    if (!encrypted) {
      throw new Error('RSA加密失败: 请确认前端公钥与后端私钥匹配');
    }
    return encrypted;
  }

  private hmacSha256(data: string, key: string): string {
    const hash = CryptoJS.HmacSHA256(data, key);
    return hash.toString(CryptoJS.enc.Hex);
  }

  // 防时序攻击的常量时间比较
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }

  // 业务方法封装示例
  async getOnlyFansCategories() {
    return await this.call('onlyfans_categories');
  }

  async getOnlyFansCreators(categoryId: number) {
    return await this.call('onlyfans_creators', { categoryId });
  }

  async getCreatorDetail(id: number) {
    return await this.call('onlyfans_creator_detail', { id });
  }

  async getLongVideoList() {
    return await this.call('long_video_h5_list');
  }

  async getDouyinVideoList() {
    return await this.call('douyin_video_h5_list');
  }

  async likeContent(contentType: string, contentId: number) {
    return await this.call('user_like', { 
      content_type: contentType, 
      content_id: contentId 
    }, 'POST');
  }

  async collectContent(contentType: string, contentId: number) {
    return await this.call('user_collect', { 
      content_type: contentType, 
      content_id: contentId 
    }, 'POST');
  }
}

export default EncryptedApiClient;
