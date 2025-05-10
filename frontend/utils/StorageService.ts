/**
 * Storage Service
 * Provides a unified interface for storing and retrieving data in localStorage and sessionStorage
 */
import { EphemeralKeyPair, ZkLoginSignature } from "@/components/zklogin/types";
import { PartialZkLoginSignature } from "@/interfaces/ZkLogin";

/**
 * Storage key constants
 * Defines all the keys used for storing data in localStorage and sessionStorage
 */
const StorageKeys = {
  // zkLogin related (persistent storage)
  EPHEMERAL_KEYPAIR: 'zkLogin_ephemeral',
  ZKLOGIN_ADDRESS: 'zkLogin_address',
  USER_SALT: 'zkLogin_userSalt',
  PARTIAL_SIGNATURE: 'zkLogin_partialSignature',
  ZKLOGIN_PROOF: 'zkLogin_proof',
  ZKLOGIN_SIGNATURE: 'zkLogin_signature',
  DECODED_JWT: 'decodedJwt',
  
  // Authentication related (persistent storage)
  AUTH_STATUS: 'auth_status',
  AUTH_TX_HASH: 'auth_tx_hash',
  WALLET_SAVED: 'wallet_saved',
  
  // Session related (volatile storage)
  JWT_PROCESSED: 'jwt_already_processed',
  HAS_CHECKED_JWT: 'has_checked_jwt',
  PENDING_JWT: 'pending_jwt',
  OAUTH_STATE: 'oauth_state',
  LOGIN_INITIATED: 'login_initiated',
  ZKLOGIN_ORIGINAL_NONCE: 'zklogin_original_nonce',
  ZKLOGIN_ORIGINAL_MAX_EPOCH: 'zklogin_original_maxEpoch',
  ZKLOGIN_ORIGINAL_RANDOMNESS: 'zklogin_original_randomness',
  
  // Logging related
  APP_LOGS: 'app_logs'
};

/**
 * Storage utility class
 * Manages all storage operations in a centralized way
 */
export class AppStorage {
  // zkLogin implementation related storage ======================
  
  /**
   * Get ephemeral keypair from storage
   * @returns The stored ephemeral keypair or null if not found
   */
  static getEphemeralKeypair(): any {
    return this.getFromLocalStorage(StorageKeys.EPHEMERAL_KEYPAIR);
  }

  /**
   * Store ephemeral keypair
   * @param keypair The ephemeral keypair to store
   */
  static setEphemeralKeypair(keypair: any): void {
    this.setToLocalStorage(StorageKeys.EPHEMERAL_KEYPAIR, keypair);
  }

  /**
   * Get zkLogin address from storage
   * @returns The stored zkLogin address or null if not found
   */
  static getZkLoginAddress(): string | null {
    return this.getStringFromLocalStorage(StorageKeys.ZKLOGIN_ADDRESS);
  }

  /**
   * Store zkLogin address
   * @param address The zkLogin address to store
   */
  static setZkLoginAddress(address: string): void {
    this.setToLocalStorage(StorageKeys.ZKLOGIN_ADDRESS, address, false);
  }

  /**
   * Get user salt from storage
   * @returns The stored user salt or null if not found
   */
  static getZkLoginUserSalt(): string | null {
    return this.getStringFromLocalStorage(StorageKeys.USER_SALT);
  }
  
  /**
   * Store user salt
   * @param salt The user salt to store
   */
  static setZkLoginUserSalt(salt: string): void {
    this.setToLocalStorage(StorageKeys.USER_SALT, salt, false);
  }
  
  /**
   * Get zkLogin proof from storage
   * @returns The stored zkLogin proof or null if not found
   */
  static getZkLoginProof(): any | null {
    return this.getFromLocalStorage(StorageKeys.ZKLOGIN_PROOF);
  }

  /**
   * Store zkLogin proof
   * @param proof The zkLogin proof to store
   */
  static setZkLoginProof(proof: any): void {
    this.setToLocalStorage(StorageKeys.ZKLOGIN_PROOF, proof);
  }

  /**
   * Get decoded JWT from storage
   * @returns The stored decoded JWT or null if not found
   */
  static getDecodedJwt(): any | null {
    return this.getFromLocalStorage(StorageKeys.DECODED_JWT);
  }

  /**
   * Store decoded JWT
   * @param decodedJwt The decoded JWT to store
   */
  static setDecodedJwt(decodedJwt: any): void {
    this.setToLocalStorage(StorageKeys.DECODED_JWT, decodedJwt);
  }

  /**
   * Get zkLogin signature from storage
   * @returns The stored zkLogin signature or null if not found
   */
  static getZkLoginSignature(): any | null {
    return this.getFromLocalStorage(StorageKeys.ZKLOGIN_SIGNATURE);
  }

  /**
   * Store zkLogin signature
   * @param signature The zkLogin signature to store
   */
  static setZkLoginSignature(signature: any): void {
    this.setToLocalStorage(StorageKeys.ZKLOGIN_SIGNATURE, signature);
  }

  /**
   * Get partial zkLogin signature from storage
   * @returns The stored partial zkLogin signature or null if not found
   */
  static getZkLoginPartialSignature(): any | null {
    return this.getFromLocalStorage(StorageKeys.PARTIAL_SIGNATURE);
  }

  /**
   * Store partial zkLogin signature
   * @param signature The partial zkLogin signature to store
   */
  static setZkLoginPartialSignature(signature: any): void {
    this.setToLocalStorage(StorageKeys.PARTIAL_SIGNATURE, signature);
  }

  // Authentication state related storage ======================
  
  /**
   * Get authentication status from storage
   * @returns The stored authentication status or null if not found
   */
  static getAuthStatus(): any | null {
    return this.getFromLocalStorage(StorageKeys.AUTH_STATUS);
  }

  /**
   * Store authentication status
   * @param status The authentication status to store
   */
  static setAuthStatus(status: any): void {
    this.setToLocalStorage(StorageKeys.AUTH_STATUS, status);
  }

  /**
   * Get authentication transaction hash from storage
   * @returns The stored authentication transaction hash or null if not found
   */
  static getAuthTxHash(): string | null {
    return this.getStringFromLocalStorage(StorageKeys.AUTH_TX_HASH);
  }

  /**
   * Store authentication transaction hash
   * @param txHash The authentication transaction hash to store
   */
  static setAuthTxHash(txHash: string): void {
    this.setToLocalStorage(StorageKeys.AUTH_TX_HASH, txHash, false);
  }

  /**
   * Check if wallet is saved
   * @returns True if wallet is saved, false otherwise
   */
  static getWalletSaved(): boolean {
    return this.getStringFromLocalStorage(StorageKeys.WALLET_SAVED) === 'true';
  }

  /**
   * Set wallet saved status
   * @param saved True if wallet is saved, false otherwise
   */
  static setWalletSaved(saved: boolean): void {
    this.setToLocalStorage(StorageKeys.WALLET_SAVED, saved.toString(), false);
  }

  // Session related storage (sessionStorage) ======================
  
  /**
   * Check if JWT has been processed
   * @returns True if JWT has been processed, false otherwise
   */
  static getJwtProcessed(): boolean {
    return this.getFromSessionStorage(StorageKeys.JWT_PROCESSED) === 'true';
  }

  /**
   * Set JWT processed status
   * @param processed True if JWT has been processed, false otherwise
   */
  static setJwtProcessed(processed: boolean): void {
    this.setToSessionStorage(StorageKeys.JWT_PROCESSED, processed.toString());
  }

  /**
   * Check if JWT has been checked
   * @returns True if JWT has been checked, false otherwise
   */
  static getHasCheckedJwt(): boolean {
    return this.getFromSessionStorage(StorageKeys.HAS_CHECKED_JWT) === 'true';
  }

  /**
   * Set JWT checked status
   * @param checked True if JWT has been checked, false otherwise
   */
  static setHasCheckedJwt(checked: boolean): void {
    this.setToSessionStorage(StorageKeys.HAS_CHECKED_JWT, checked.toString());
  }

  /**
   * Get pending JWT from storage
   * @returns The stored pending JWT or null if not found
   */
  static getPendingJwt(): string | null {
    return this.getFromSessionStorage(StorageKeys.PENDING_JWT);
  }

  /**
   * Store pending JWT
   * @param jwt The pending JWT to store
   */
  static setPendingJwt(jwt: string): void {
    this.setToSessionStorage(StorageKeys.PENDING_JWT, jwt);
  }

  /**
   * Get OAuth state from storage
   * @returns The stored OAuth state or null if not found
   */
  static getOAuthState(): string | null {
    return this.getFromSessionStorage(StorageKeys.OAUTH_STATE);
  }

  /**
   * Store OAuth state
   * @param state The OAuth state to store
   */
  static setOAuthState(state: string): void {
    this.setToSessionStorage(StorageKeys.OAUTH_STATE, state);
  }

  /**
   * Check if login has been initiated
   * @returns True if login has been initiated, false otherwise
   */
  static getLoginInitiated(): boolean {
    return this.getFromSessionStorage(StorageKeys.LOGIN_INITIATED) === 'true';
  }

  /**
   * Set login initiated status
   * @param initiated True if login has been initiated, false otherwise
   */
  static setLoginInitiated(initiated: boolean): void {
    this.setToSessionStorage(StorageKeys.LOGIN_INITIATED, initiated.toString());
  }

  /**
   * Store original zkLogin nonce
   * @param nonce The original zkLogin nonce to store
   */
  static setZkLoginOriginalNonce(nonce: string): void {
    this.setToSessionStorage(StorageKeys.ZKLOGIN_ORIGINAL_NONCE, nonce);
  }

  /**
   * Get original zkLogin nonce from storage
   * @returns The stored original zkLogin nonce or null if not found
   */
  static getZkLoginOriginalNonce(): string | null {
    return this.getFromSessionStorage(StorageKeys.ZKLOGIN_ORIGINAL_NONCE);
  }

  /**
   * Store original zkLogin max epoch
   * @param maxEpoch The original zkLogin max epoch to store
   */
  static setZkLoginOriginalMaxEpoch(maxEpoch: string): void {
    this.setToSessionStorage(StorageKeys.ZKLOGIN_ORIGINAL_MAX_EPOCH, maxEpoch);
  }

  /**
   * Get original zkLogin max epoch from storage
   * @returns The stored original zkLogin max epoch or null if not found
   */
  static getZkLoginOriginalMaxEpoch(): string | null {
    return this.getFromSessionStorage(StorageKeys.ZKLOGIN_ORIGINAL_MAX_EPOCH);
  }

  /**
   * Store original zkLogin randomness
   * @param randomness The original zkLogin randomness to store
   */
  static setZkLoginOriginalRandomness(randomness: string): void {
    this.setToSessionStorage(StorageKeys.ZKLOGIN_ORIGINAL_RANDOMNESS, randomness);
  }

  /**
   * Get original zkLogin randomness from storage
   * @returns The stored original zkLogin randomness or null if not found
   */
  static getZkLoginOriginalRandomness(): string | null {
    return this.getFromSessionStorage(StorageKeys.ZKLOGIN_ORIGINAL_RANDOMNESS);
  }

  // Logging related storage ======================
  
  /**
   * Get application logs from storage
   * @returns The stored application logs or an empty array if not found
   */
  static getLogs(): string[] {
    const logs = this.getFromLocalStorage(StorageKeys.APP_LOGS);
    return logs || [];
  }

  /**
   * Store application logs
   * @param logs The application logs to store
   */
  static setLogs(logs: string[]): void {
    this.setToLocalStorage(StorageKeys.APP_LOGS, logs);
  }

  /**
   * Add a single log entry
   * @param log The log entry to add
   */
  static addLog(log: string): void {
    const logs = this.getLogs();
    logs.push(log);
    this.setLogs(logs);
  }

  /**
   * Clear all logs
   */
  static clearLogs(): void {
    this.setLogs([]);
  }

  // Storage clearing methods ======================
  
  /**
   * Clear all zkLogin related storage
   */
  static clearZkLoginStorage(): void {
    if (typeof window === 'undefined') return;
    
    // Clear data from localStorage
    localStorage.removeItem(StorageKeys.EPHEMERAL_KEYPAIR);
    localStorage.removeItem(StorageKeys.ZKLOGIN_ADDRESS);
    localStorage.removeItem(StorageKeys.USER_SALT);
    localStorage.removeItem(StorageKeys.PARTIAL_SIGNATURE);
    localStorage.removeItem(StorageKeys.ZKLOGIN_PROOF);
    localStorage.removeItem(StorageKeys.ZKLOGIN_SIGNATURE);
    localStorage.removeItem(StorageKeys.DECODED_JWT);
    
    console.log("[Storage] All zkLogin related storage cleared");
  }
  
  /**
   * Clear all authentication related storage
   */
  static clearAuthStorage(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(StorageKeys.AUTH_STATUS);
    localStorage.removeItem(StorageKeys.AUTH_TX_HASH);
    localStorage.removeItem(StorageKeys.WALLET_SAVED);
    
    console.log("[Storage] All authentication related storage cleared");
  }
  
  /**
   * Clear all session related storage
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
    
    console.log("[Storage] All session related storage cleared");
  }
  
  /**
   * Clear all storage
   */
  static clearAll(): void {
    this.clearZkLoginStorage();
    this.clearAuthStorage();
    this.clearSessionStorage();
    localStorage.removeItem(StorageKeys.APP_LOGS);
    console.log("[Storage] All storage cleared");
  }

  // Utility methods ======================
  
  /**
   * Get object from localStorage
   * @param key The key to get from localStorage
   * @returns The parsed object from localStorage or null if not found
   * @private
   */
  private static getFromLocalStorage(key: string): any | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const value = localStorage.getItem(key);
      if (!value) return null;
      return JSON.parse(value);
    } catch (error) {
      console.error(`[Storage] Failed to get key ${key} from localStorage:`, error);
      return null;
    }
  }
  
  /**
   * Get string from localStorage
   * @param key The key to get from localStorage
   * @returns The string from localStorage or null if not found
   * @private
   */
  private static getStringFromLocalStorage(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  }

  /**
   * Store value in localStorage
   * @param key The key to store in localStorage
   * @param value The value to store
   * @param isObject Whether the value is an object (to be JSON stringified)
   * @private
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
      console.error(`[Storage] Failed to save key ${key} to localStorage:`, error);
    }
  }
  
  /**
   * Get value from sessionStorage
   * @param key The key to get from sessionStorage
   * @returns The value from sessionStorage or null if not found
   * @private
   */
  private static getFromSessionStorage(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(key);
  }

  /**
   * Store value in sessionStorage
   * @param key The key to store in sessionStorage
   * @param value The value to store
   * @private
   */
  private static setToSessionStorage(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(key, value);
  }
}

/**
 * Legacy alias for backward compatibility
 */
export const ZkLoginStorage = AppStorage; 