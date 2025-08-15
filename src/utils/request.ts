import EncryptedApiClient from './encryptedApiClient';

// 创建加密API客户端实例
const encryptedClient = new EncryptedApiClient({
  // 直接请求统一网关 /x，避免被 VITE_APP_BASE_API 拼成 /api/x
  baseURL: '',
  debug: import.meta.env.DEV, // 开发环境开启调试
  // 不再从外部传入公钥，强制走内部默认/环境变量的择优与回退逻辑
  publicKey: undefined,
});

/**
 * 统一的API请求接口
 * 兼容原有的axios使用方式，但底层使用加密传输
 */
class RequestService {
  /**
   * GET请求 - 兼容axios.get的用法
   * @param apiName API方法名（映射表中的key）
   * @param params 请求参数
   */
  async get<T = any>(apiName: string, params?: any): Promise<T> {
    return await encryptedClient.call<T>(apiName, params || {}, 'GET');
  }

  /**
   * POST请求 - 兼容axios.post的用法  
   * @param apiName API方法名（映射表中的key）
   * @param data 请求数据
   */
  async post<T = any>(apiName: string, data?: any): Promise<T> {
    return await encryptedClient.call<T>(apiName, data || {}, 'POST');
  }

  /**
   * PUT请求 - 兼容axios.put的用法
   * @param apiName API方法名（映射表中的key）
   * @param data 请求数据
   */
  async put<T = any>(apiName: string, data?: any): Promise<T> {
    return await encryptedClient.call<T>(apiName, data || {}, 'POST');
  }

  /**
   * DELETE请求 - 兼容axios.delete的用法
   * @param apiName API方法名（映射表中的key）
   * @param params 请求参数
   */
  async delete<T = any>(apiName: string, params?: any): Promise<T> {
    return await encryptedClient.call<T>(apiName, params || {}, 'POST');
  }

  /**
   * PATCH请求 - 兼容axios.patch的用法
   * @param apiName API方法名（映射表中的key）
   * @param data 请求数据
   */
  async patch<T = any>(apiName: string, data?: any): Promise<T> {
    return await encryptedClient.call<T>(apiName, data || {}, 'POST');
  }

  /**
   * 通用请求方法
   * @param apiName API方法名
   * @param params 请求参数
   * @param method HTTP方法
   */
  async request<T = any>(apiName: string, params?: any, method: 'GET' | 'POST' = 'GET'): Promise<T> {
    return await encryptedClient.call<T>(apiName, params || {}, method);
  }

  /**
   * 直接调用加密客户端（高级用法）
   */
  get client() {
    return encryptedClient;
  }
}

// 创建服务实例
const service = new RequestService();

// 导出服务实例（兼容原有的default导出）
export default service;

// 同时导出加密客户端类（用于创建新实例）
export { EncryptedApiClient };
