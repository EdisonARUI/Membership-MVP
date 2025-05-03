import { ZkProofParams, ZkProofResult } from '@/components/zklogin/types';

const PROVER_URL = 'https://prover-dev.mystenlabs.com/v1';

export async function fetchZkProof({
  jwt,
  extendedEphemeralPublicKey,
  jwtRandomness,
  maxEpoch,
  salt,
  keyClaimName = 'sub',
  oauthProvider = 'google',
  originalNonce
}: ZkProofParams): Promise<ZkProofResult> {
  try {
    const requestBody: any = {
      jwt,
      extendedEphemeralPublicKey,
      jwtRandomness,
      maxEpoch,
      salt,
      keyClaimName,
      oauthProvider
    };
    
    // 如果提供了原始nonce，添加到请求中
    if (originalNonce) {
      requestBody.nonce = originalNonce;
    }
    
    const response = await fetch(PROVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();

      if (errorText.includes("Missing required JSON field")) {
        throw new Error(`证明服务返回错误: 缺少必需字段 - ${errorText}`);
      } else if (response.status === 429) {
        throw new Error("证明服务返回错误: 请求过于频繁，请稍后再试");
      } else if (response.status === 403) {
        throw new Error("证明服务返回错误: 访问被拒绝，可能需要身份验证");
      } else {
        throw new Error(`证明服务返回错误 (${response.status}): ${errorText}`);
      }
    }

    const proofData = await response.json();
    
    if (!proofData.proofPoints || !proofData.issBase64Details || !proofData.headerBase64) {
      throw new Error(`证明服务返回的数据结构不完整: ${Object.keys(proofData).join(", ")}`);
    }

    return proofData;
  } catch (error) {
    throw new Error(`无法获取ZK证明: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function parseJwt(jwt: string): any {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      throw new Error("无效的JWT格式");
    }

    const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64Payload));

    if (!payload.sub || !payload.aud || !payload.iss) {
      throw new Error("JWT缺少必要的字段");
    }

    return payload;
  } catch (error) {
    throw error;
  }
}

export async function fetchUserSalt(jwt: string): Promise<string> {
  return "0000000000000000000000000000000000000000000000000000000000000000";
} 