import { ZkProofParams, ZkProofResult } from '@/components/zklogin/types';

const PROVER_URL = 'https://prover-dev.mystenlabs.com/v1';

export async function fetchZkProof({
  jwt,
  extendedEphemeralPublicKey,
  jwtRandomness,
  maxEpoch,
  salt,
  keyClaimName = 'sub',
  oauthProvider = 'google'
}: ZkProofParams): Promise<ZkProofResult> {
  console.log("向Mysten Labs证明服务发送请求:", {
    ...{
      jwt: jwt.substring(0, 20) + "...",
      extendedEphemeralPublicKey,
      jwtRandomness,
      maxEpoch,
      salt: salt.substring(0, 10) + "...",
      keyClaimName,
      oauthProvider
    }
  });

  try {
    const response = await fetch(PROVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jwt,
        extendedEphemeralPublicKey,
        jwtRandomness,
        maxEpoch,
        salt,
        keyClaimName,
        oauthProvider
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`证明服务返回错误 (${response.status}): ${errorText}`);

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
    
    // 验证返回的数据结构是否完整
    if (!proofData.proofPoints || !proofData.issBase64Details || !proofData.headerBase64) {
      throw new Error(`证明服务返回的数据结构不完整: ${Object.keys(proofData).join(", ")}`);
    }

    return proofData;
  } catch (error) {
    console.error("调用证明服务失败:", error);
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

    // 验证必要字段
    if (!payload.sub || !payload.aud || !payload.iss) {
      throw new Error("JWT缺少必要的字段");
    }

    return payload;
  } catch (error) {
    console.error("解析JWT失败:", error);
    throw error;
  }
}

export async function fetchUserSalt(jwt: string): Promise<string> {
  // 目前使用默认salt，后续可以改为从后端获取
  return "0000000000000000000000000000000000000000000000000000000000000000";
} 