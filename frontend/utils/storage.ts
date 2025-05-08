import { EphemeralKeyPair, ZkLoginSignature } from "@/components/zklogin/types";
import { PartialZkLoginSignature } from "@/interfaces/ZkLogin";

// 存储键常量定义
const StorageKeys = {
  // zkLogin技术相关（持久存储）
  EPHEMERAL_KEYPAIR: 'zkLogin_ephemeral',
  ZKLOGIN_ADDRESS: 'zkLogin_address',
  USER_SALT: 'zkLogin_userSalt',
  PARTIAL_SIGNATURE: 'zkLogin_partialSignature',
  ZKLOGIN_PROOF: 'zkLogin_proof',
  ZKLOGIN_SIGNATURE: 'zkLogin_signature',
  DECODED_JWT: 'decodedJwt',
  
  // 认证相关（持久存储）
  AUTH_STATUS: 'auth_status',
  AUTH_TX_HASH: 'auth_tx_hash',
  WALLET_SAVED: 'wallet_saved',
  
  // 会话相关（易失性存储）
  JWT_PROCESSED: 'jwt_already_processed',
  HAS_CHECKED_JWT: 'has_checked_jwt',
  PENDING_JWT: 'pending_jwt',
  OAUTH_STATE: 'oauth_state',
  LOGIN_INITIATED: 'login_initiated',
  ZKLOGIN_ORIGINAL_NONCE: 'zklogin_original_nonce',
  ZKLOGIN_ORIGINAL_MAX_EPOCH: 'zklogin_original_maxEpoch',
  ZKLOGIN_ORIGINAL_RANDOMNESS: 'zklogin_original_randomness'
};

// 存储工具类 - 统一管理所有存储操作
export class AppStorage {
  // zkLogin技术实现相关存储 ======================
  
  /**
   * 获取临时密钥对
   */
  static getEphemeralKeypair(): any {
    return this.getFromLocalStorage(StorageKeys.EPHEMERAL_KEYPAIR);
  }

  /**
   * 设置临时密钥对
   */
  static setEphemeralKeypair(keypair: any): void {
    this.setToLocalStorage(StorageKeys.EPHEMERAL_KEYPAIR, keypair);
  }

  /**
   * 获取zkLogin地址
   */
  static getZkLoginAddress(): string | null {
    return this.getStringFromLocalStorage(StorageKeys.ZKLOGIN_ADDRESS);
  }

  /**
   * 设置zkLogin地址
   */
  static setZkLoginAddress(address: string): void {
    this.setToLocalStorage(StorageKeys.ZKLOGIN_ADDRESS, address, false);
  }

  /**
   * 获取用户盐值
   */
  static getZkLoginUserSalt(): string | null {
    return this.getStringFromLocalStorage(StorageKeys.USER_SALT);
  }
  
  /**
   * 设置用户盐值
   */
  static setZkLoginUserSalt(salt: string): void {
    this.setToLocalStorage(StorageKeys.USER_SALT, salt, false);
  }
  
  /**
   * 获取zkLogin证明
   */
  static getZkLoginProof(): any | null {
    return this.getFromLocalStorage(StorageKeys.ZKLOGIN_PROOF);
  }

  /**
   * 设置zkLogin证明
   */
  static setZkLoginProof(proof: any): void {
    this.setToLocalStorage(StorageKeys.ZKLOGIN_PROOF, proof);
  }

  /**
   * 获取解析后的JWT
   */
  static getDecodedJwt(): any | null {
    return this.getFromLocalStorage(StorageKeys.DECODED_JWT);
  }

  /**
   * 设置解析后的JWT
   */
  static setDecodedJwt(decodedJwt: any): void {
    this.setToLocalStorage(StorageKeys.DECODED_JWT, decodedJwt);
  }

  /**
   * 获取zkLogin签名
   */
  static getZkLoginSignature(): any | null {
    return this.getFromLocalStorage(StorageKeys.ZKLOGIN_SIGNATURE);
  }

  /**
   * 设置zkLogin签名
   */
  static setZkLoginSignature(signature: any): void {
    this.setToLocalStorage(StorageKeys.ZKLOGIN_SIGNATURE, signature);
  }

  /**
   * 获取部分zkLogin签名
   */
  static getZkLoginPartialSignature(): any | null {
    return this.getFromLocalStorage(StorageKeys.PARTIAL_SIGNATURE);
  }

  /**
   * 设置部分zkLogin签名
   */
  static setZkLoginPartialSignature(signature: any): void {
    this.setToLocalStorage(StorageKeys.PARTIAL_SIGNATURE, signature);
  }

  // 认证状态相关存储 ======================
  
  /**
   * 获取认证状态
   */
  static getAuthStatus(): any | null {
    return this.getFromLocalStorage(StorageKeys.AUTH_STATUS);
  }

  /**
   * 设置认证状态
   */
  static setAuthStatus(status: any): void {
    this.setToLocalStorage(StorageKeys.AUTH_STATUS, status);
  }

  /**
   * 获取认证交易哈希
   */
  static getAuthTxHash(): string | null {
    return this.getStringFromLocalStorage(StorageKeys.AUTH_TX_HASH);
  }

  /**
   * 设置认证交易哈希
   */
  static setAuthTxHash(txHash: string): void {
    this.setToLocalStorage(StorageKeys.AUTH_TX_HASH, txHash, false);
  }

  /**
   * 获取钱包是否已保存
   */
  static getWalletSaved(): boolean {
    return this.getStringFromLocalStorage(StorageKeys.WALLET_SAVED) === 'true';
  }

  /**
   * 设置钱包是否已保存
   */
  static setWalletSaved(saved: boolean): void {
    this.setToLocalStorage(StorageKeys.WALLET_SAVED, saved.toString(), false);
  }

  // 会话相关存储（sessionStorage） ======================
  
  /**
   * 检查JWT是否已处理
   */
  static getJwtProcessed(): boolean {
    return this.getFromSessionStorage(StorageKeys.JWT_PROCESSED) === 'true';
  }

  /**
   * 设置JWT是否已处理
   */
  static setJwtProcessed(processed: boolean): void {
    this.setToSessionStorage(StorageKeys.JWT_PROCESSED, processed.toString());
  }

  /**
   * 获取是否已检查JWT
   */
  static getHasCheckedJwt(): boolean {
    return this.getFromSessionStorage(StorageKeys.HAS_CHECKED_JWT) === 'true';
  }

  /**
   * 设置是否已检查JWT
   */
  static setHasCheckedJwt(checked: boolean): void {
    this.setToSessionStorage(StorageKeys.HAS_CHECKED_JWT, checked.toString());
  }

  /**
   * 获取待处理的JWT
   */
  static getPendingJwt(): string | null {
    return this.getFromSessionStorage(StorageKeys.PENDING_JWT);
  }

  /**
   * 设置待处理的JWT
   */
  static setPendingJwt(jwt: string): void {
    this.setToSessionStorage(StorageKeys.PENDING_JWT, jwt);
  }

  /**
   * 获取OAuth状态
   */
  static getOAuthState(): string | null {
    return this.getFromSessionStorage(StorageKeys.OAUTH_STATE);
  }

  /**
   * 设置OAuth状态
   */
  static setOAuthState(state: string): void {
    this.setToSessionStorage(StorageKeys.OAUTH_STATE, state);
  }

  /**
   * 获取登录已初始化标志
   */
  static getLoginInitiated(): boolean {
    return this.getFromSessionStorage(StorageKeys.LOGIN_INITIATED) === 'true';
  }

  /**
   * 设置登录已初始化标志
   */
  static setLoginInitiated(initiated: boolean): void {
    this.setToSessionStorage(StorageKeys.LOGIN_INITIATED, initiated.toString());
  }

  /**
   * 保存zkLogin原始nonce
   */
  static setZkLoginOriginalNonce(nonce: string): void {
    this.setToSessionStorage(StorageKeys.ZKLOGIN_ORIGINAL_NONCE, nonce);
  }

  /**
   * 获取zkLogin原始nonce
   */
  static getZkLoginOriginalNonce(): string | null {
    return this.getFromSessionStorage(StorageKeys.ZKLOGIN_ORIGINAL_NONCE);
  }

  /**
   * 保存zkLogin原始maxEpoch
   */
  static setZkLoginOriginalMaxEpoch(maxEpoch: string): void {
    this.setToSessionStorage(StorageKeys.ZKLOGIN_ORIGINAL_MAX_EPOCH, maxEpoch);
  }

  /**
   * 获取zkLogin原始maxEpoch
   */
  static getZkLoginOriginalMaxEpoch(): string | null {
    return this.getFromSessionStorage(StorageKeys.ZKLOGIN_ORIGINAL_MAX_EPOCH);
  }

  /**
   * 保存zkLogin原始随机性
   */
  static setZkLoginOriginalRandomness(randomness: string): void {
    this.setToSessionStorage(StorageKeys.ZKLOGIN_ORIGINAL_RANDOMNESS, randomness);
  }

  /**
   * 获取zkLogin原始随机性
   */
  static getZkLoginOriginalRandomness(): string | null {
    return this.getFromSessionStorage(StorageKeys.ZKLOGIN_ORIGINAL_RANDOMNESS);
  }

  // 清除存储方法 ======================
  
  /**
   * 清除所有zkLogin相关存储
   */
  static clearZkLoginStorage(): void {
    if (typeof window === 'undefined') return;
    
    // 清除localStorage中的数据
    localStorage.removeItem(StorageKeys.EPHEMERAL_KEYPAIR);
    localStorage.removeItem(StorageKeys.ZKLOGIN_ADDRESS);
    localStorage.removeItem(StorageKeys.USER_SALT);
    localStorage.removeItem(StorageKeys.PARTIAL_SIGNATURE);
    localStorage.removeItem(StorageKeys.ZKLOGIN_PROOF);
    localStorage.removeItem(StorageKeys.ZKLOGIN_SIGNATURE);
    localStorage.removeItem(StorageKeys.DECODED_JWT);
    
    console.log("[Storage] 已清除所有zkLogin技术相关存储");
  }
  
  /**
   * 清除所有认证相关存储
   */
  static clearAuthStorage(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(StorageKeys.AUTH_STATUS);
    localStorage.removeItem(StorageKeys.AUTH_TX_HASH);
    localStorage.removeItem(StorageKeys.WALLET_SAVED);
    
    console.log("[Storage] 已清除所有认证相关存储");
  }
  
  /**
   * 清除所有会话相关存储
   */
  static clearSessionStorage(): void {
    if (typeof window === 'undefined') return;
    
    sessionStorage.removeItem(StorageKeys.JWT_PROCESSED);
    sessionStorage.removeItem(StorageKeys.HAS_CHECKED_JWT);
    sessionStorage.removeItem(StorageKeys.PENDING_JWT);
    sessionStorage.removeItem(StorageKeys.OAUTH_STATE);
    sessionStorage.removeItem(StorageKeys.LOGIN_INITIATED);
    sessionStorage.removeItem(StorageKeys.ZKLOGIN_ORIGINAL_NONCE);
    sessionStorage.removeItem(StorageKeys.ZKLOGIN_ORIGINAL_MAX_EPOCH);
    sessionStorage.removeItem(StorageKeys.ZKLOGIN_ORIGINAL_RANDOMNESS);
    
    console.log("[Storage] 已清除所有会话相关存储");
  }
  
  /**
   * 清除所有存储
   */
  static clearAll(): void {
    this.clearZkLoginStorage();
    this.clearAuthStorage();
    this.clearSessionStorage();
    console.log("[Storage] 已清除所有存储");
  }

  // 工具方法 ======================
  
  /**
   * 从localStorage获取对象
   */
  private static getFromLocalStorage(key: string): any | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const value = localStorage.getItem(key);
      if (!value) return null;
      return JSON.parse(value);
    } catch (error) {
      console.error(`[Storage] 从localStorage获取键${key}失败:`, error);
      return null;
    }
  }
  
  /**
   * 从localStorage获取字符串
   */
  private static getStringFromLocalStorage(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  }

  /**
   * 保存到localStorage
   */
  private static setToLocalStorage(key: string, value: any, isObject: boolean = true): void {
    if (typeof window === 'undefined') return;
    
    try {
      if (isObject) {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error(`[Storage] 保存到localStorage键${key}失败:`, error);
    }
  }
  
  /**
   * 从sessionStorage获取值
   */
  private static getFromSessionStorage(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(key);
  }

  /**
   * 保存到sessionStorage
   */
  private static setToSessionStorage(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(key, value);
  }
}

// 保留原有引用以支持不中断现有代码
export const ZkLoginStorage = AppStorage; 