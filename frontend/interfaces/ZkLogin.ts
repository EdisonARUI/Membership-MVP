import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

/**
 * zkLogin API相关接口和类型定义
 */

/**
 * ZKP API返回的部分zkLogin签名
 * 用于获取零知识证明
 */
export interface PartialZkLoginSignature {
  inputs: {
    proofPoints: {
      a: string[];
      b: string[][];
      c: string[];
    };
    maxEpoch: number;
    jwtRandomness: string;
    kpSignature: string;
    jwkHex: string;
    salt: string;
    ephemeralPublicKey: string;
    jwt: string;
  }
}

/**
 * ZKP API请求参数
 */
export interface ZkProofRequestBody {
  jwt: string;
  ephemeralPublicKey: string;
  userSalt: string;
  maxEpoch?: number;
  jwtRandomness?: string;
  networkType?: 'mainnet' | 'testnet' | 'devnet';
}

/**
 * zkLogin处理结果
 */
export interface ZkLoginProcessResult {
  zkLoginAddress: string;
  partialSignature: PartialZkLoginSignature;
  ephemeralKeypair: Ed25519Keypair;
}

/**
 * ZKP API响应
 */
export interface ZkProofResponseData {
  success: boolean;
  error?: string;
  proof?: PartialZkLoginSignature;
  details?: any;
} 