import { EphemeralKeyPair, ZkLoginSignature } from "@/components/zklogin/types";

export const ZkLoginStorage = {
  // Ephemeral Keypair
  getEphemeralKeypair(): EphemeralKeyPair | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem('zkLogin_ephemeral');
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('解析临时密钥对数据失败:', e);
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
    localStorage.removeItem('zkLogin_ephemeral');
    localStorage.removeItem('zkLogin_address');
    localStorage.removeItem('zkLogin_proof');
    localStorage.removeItem('zkLogin_signature');
    sessionStorage.removeItem('has_checked_jwt');
    sessionStorage.removeItem('jwt_already_processed');
  }
}; 