import { EphemeralKeyPair, ZkLoginSignature } from "@/components/zklogin/types";

export const ZkLoginStorage = {
  // Ephemeral Keypair
  getEphemeralKeypair(): any {
    if (typeof window === 'undefined') return null;
    
    try {
      const keypairStr = localStorage.getItem('zkLogin_ephemeral');
      if (!keypairStr) {
        console.log('找不到存储的临时密钥对');
        return null;
      }
      
      const keypair = JSON.parse(keypairStr);
      console.log('获取到的临时密钥对:', {
        ...keypair,
        keypair: {
          ...keypair.keypair,
          secretKey: '*** 隐藏 ***'
        }
      });
      
      return keypair;
    } catch (error) {
      console.error('获取临时密钥对时出错:', error);
      return null;
    }
  },

  setEphemeralKeypair(keypair: EphemeralKeyPair): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('zkLogin_ephemeral', JSON.stringify(keypair));
  },

  // zkLogin Address
  getZkLoginAddress(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('zkLogin_address');
  },

  setZkLoginAddress(address: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('zkLogin_address', address);
  },

  // zkLogin Proof
  getZkLoginProof(): any | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem('zkLogin_proof');
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('解析zkLogin证明数据失败:', e);
      return null;
    }
  },

  setZkLoginProof(proof: any): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('zkLogin_proof', JSON.stringify(proof));
  },

  // zkLogin Signature
  getZkLoginSignature(): ZkLoginSignature | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem('zkLogin_signature');
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('解析zkLogin签名数据失败:', e);
      return null;
    }
  },

  setZkLoginSignature(signature: ZkLoginSignature): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('zkLogin_signature', JSON.stringify(signature));
  },

  // Session Storage
  getJwtProcessed(): boolean {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('jwt_already_processed') === 'true';
  },

  setJwtProcessed(processed: boolean): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('jwt_already_processed', processed.toString());
  },

  getHasCheckedJwt(): boolean {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('has_checked_jwt') === 'true';
  },

  setHasCheckedJwt(checked: boolean): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('has_checked_jwt', checked.toString());
  },

  // Clear all zkLogin related storage
  clearAll(): void {
    if (typeof window === 'undefined') return;
    
    // 清除localStorage中的数据
    localStorage.removeItem('zkLogin_ephemeral');
    localStorage.removeItem('zkLogin_address');
    localStorage.removeItem('zkLogin_proof');
    localStorage.removeItem('zkLogin_signature');
    
    // 清除sessionStorage中的数据
    sessionStorage.removeItem('has_checked_jwt');
    sessionStorage.removeItem('jwt_already_processed');
    sessionStorage.removeItem('pending_jwt');
    sessionStorage.removeItem('oauth_state');
    
    // 确保console中显示清除过程
    console.log("[ZkLogin Storage] 已清除所有zkLogin相关存储");
  }
}; 