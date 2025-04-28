"use client";

import { useState, useEffect } from 'react';
import { 
  generateNonce, 
  generateRandomness, 
  jwtToAddress, 
  getExtendedEphemeralPublicKey,
  getZkLoginSignature
} from '@mysten/sui/zklogin';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Button } from "@/components/ui/button";
import { SuiClient } from '@mysten/sui/client';
import { toB64, fromB64, fromHex } from '@mysten/sui/utils';
import { saveUserWithWalletAddress } from "@/app/actions";

// Sui Devnet客户端
const suiClient = new SuiClient({ url: 'https://fullnode.devnet.sui.io' });
// 最大Epoch - 根据Devnet设置，通常为10
const MAX_EPOCH = 10;

// 添加props类型定义
interface ZkLoginProviderProps {
  userId?: string;
  autoInitialize?: boolean;
}

export default function ZkLoginProvider({ userId, autoInitialize = false }: ZkLoginProviderProps) {
  const [ephemeralKeypair, setEphemeralKeypair] = useState<any>(null);
  const [zkLoginAddress, setZkLoginAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 监听JWT接收消息
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type !== 'JWT_RECEIVED') return;
      
      const jwt = event.data.jwt;
      if (jwt && ephemeralKeypair) {
        await handleJwtReceived(jwt);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [ephemeralKeypair]);
  
  // 创建临时密钥对
  const prepareKeypair = async () => {
    setLoading(true);
    setError(null);
    try {
      // 获取Sui当前epoch
      const { epoch } = await suiClient.getLatestSuiSystemState();
      console.log("当前Sui Epoch:", epoch);
      
      const currentEpoch = Number(epoch);
      const maxEpoch = currentEpoch + MAX_EPOCH;
      
      const keypair = new Ed25519Keypair();
      const randomness = generateRandomness();
      const nonce = generateNonce(keypair.getPublicKey(), maxEpoch, randomness);
      
      // 将密钥对信息保存到localStorage
      const ephemeralData = {
        keypair: {
          publicKey: toB64(keypair.getPublicKey().toRawBytes()),
          // 将私钥转换为字符串以便保存在localStorage
          secretKey: keypair.getSecretKey()
        },
        randomness,
        maxEpoch,
        nonce
      };
      
      localStorage.setItem('zkLogin_ephemeral', JSON.stringify(ephemeralData));
      setEphemeralKeypair(ephemeralData);
      
      console.log("生成的nonce:", nonce);
      return nonce;
    } catch (err: any) {
      console.error("准备密钥对出错:", err);
      setError(`准备密钥对失败: ${err.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // 添加一个方法来保存钱包地址到数据库
  const saveAddressToDatabase = async (address: string) => {
    if (!userId) {
      console.warn('无法保存钱包地址：缺少用户ID');
      return;
    }
    
    try {
      await saveUserWithWalletAddress(userId, address);
      console.log('成功保存钱包地址到数据库');
    } catch (err) {
      console.error('保存钱包地址失败:', err);
      setError('保存钱包地址到数据库失败');
    }
  };
  
  // 处理Google登录后的JWT
  const handleJwtReceived = async (jwt: string) => {
    if (!ephemeralKeypair) {
      setError("找不到临时密钥对，请重新开始");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("收到JWT, 开始处理...");
      
      // 从JWT解析payload
      const parts = jwt.split('.');
      if (parts.length !== 3) {
        throw new Error("无效的JWT格式");
      }
      
      // 解码JWT的payload部分
      const payload = JSON.parse(atob(parts[1]));
      console.log("JWT payload:", payload);
      
      // 获取必要的JWT信息
      const sub = payload.sub;
      const aud = payload.aud;
      const iss = payload.iss;
      
      if (!sub || !aud || !iss) {
        throw new Error("JWT缺少必要的字段");
      }
      
      // 使用默认salt或从salt服务获取
      const userSalt = await fetchUserSalt(jwt);
      console.log("用户salt:", userSalt);
      
      // 从localStorage中获取临时密钥对数据
      const ephemeralDataStr = localStorage.getItem('zkLogin_ephemeral');
      
      if (!ephemeralDataStr) {
        setError('未找到临时密钥对数据');
        return;
      }
      
      const storedData = JSON.parse(ephemeralDataStr);
      
      // 重建Ed25519Keypair
      const secretKey = storedData.keypair.secretKey;
      // 直接使用字符串形式的secretKey
      const ephemeralKeypair = Ed25519Keypair.fromSecretKey(secretKey);
      
      // 获取扩展的临时公钥
      const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(ephemeralKeypair.getPublicKey());
      
      // 调用Mysten Labs的证明服务
      const proofResponse = await fetchZkProof(
        jwt,
        extendedEphemeralPublicKey,
        storedData.randomness,
        storedData.maxEpoch,
        userSalt
      );
      
      console.log("ZK证明响应:", proofResponse);
      
      // 从JWT和salt计算zkLogin地址
      const address = jwtToAddress(jwt, userSalt);
      console.log("计算的zkLogin地址:", address);
      
      // 保存到状态和本地存储
      setZkLoginAddress(address);
      localStorage.setItem('zkLogin_address', address);
      localStorage.setItem('zkLogin_proof', JSON.stringify(proofResponse));
      
      // 如果有userId，保存到数据库
      if (userId) {
        await saveAddressToDatabase(address);
      }
      
      // 创建zkLogin签名
      const zkLoginSignature = getZkLoginSignature({
        inputs: {
          ...proofResponse,
          addressSeed: userSalt
        },
        maxEpoch: storedData.maxEpoch,
        userSignature: '0x' + '00'.repeat(64)
      });
      
      localStorage.setItem('zkLogin_signature', JSON.stringify(zkLoginSignature));
      console.log("zkLogin签名已生成");
      
    } catch (err: any) {
      console.error("处理JWT出错:", err);
      setError(`处理JWT失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // 调用Google登录
  const handleGoogleLogin = async () => {
    const nonce = await prepareKeypair();
    if (!nonce) return;
    
    // 创建表单提交以执行signInWithGoogleAction
    const form = document.createElement('form');
    form.method = 'post';
    form.action = '/sign-in';
    
    const nonceInput = document.createElement('input');
    nonceInput.type = 'hidden';
    nonceInput.name = 'nonce';
    nonceInput.value = nonce;
    form.appendChild(nonceInput);
    
    document.body.appendChild(form);
    form.submit();
  };
  
  // 如果设置了自动初始化，在组件挂载后自动创建密钥对
  useEffect(() => {
    if (autoInitialize && !ephemeralKeypair) {
      prepareKeypair();
    }
  }, [autoInitialize]);
  
  return (
    <div className="mt-4">
      {zkLoginAddress ? (
        <div className="p-4 bg-slate-700 rounded-lg text-white">
          <h3 className="text-lg font-bold">已连接到Sui Devnet</h3>
          <p className="text-sm truncate">地址: {zkLoginAddress}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleGoogleLogin}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            disabled={loading}
          >
            {loading ? '处理中...' : '使用Google连接到Sui Devnet'}
          </Button>
          
          {error && (
            <div className="p-2 bg-red-500 rounded text-white text-sm">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 使用默认salt或从salt服务获取
async function fetchUserSalt(jwt: string): Promise<string> {
  try {
    // 尝试使用本地服务或外部服务
    // 默认salt，用于测试
    return "0000000000000000000000000000000000000000000000000000000000000000";
  } catch (error) {
    console.error("获取salt失败:", error);
    // 返回默认salt
    return "0000000000000000000000000000000000000000000000000000000000000000";
  }
}

// 调用Mysten Labs的证明服务
async function fetchZkProof(
  jwt: string,
  extendedEphemeralPublicKey: string,
  jwtRandomness: string,
  maxEpoch: number,
  userSalt: string
) {
  // 使用Mysten Labs的开发网络证明服务
  const proverUrl = "https://prover-dev.mystenlabs.com/v1";
  
  // 准备请求负载
  const payload = {
    jwt,
    extendedEphemeralPublicKey,
    jwtRandomness, 
    maxEpoch,
    userSalt,
    keyClaimName: "sub", // Google使用sub作为key claim
    oauthProvider: "google" // 指定OAuth提供商为Google
  };
  
  console.log("向Mysten Labs证明服务发送请求:", {
    ...payload,
    jwt: payload.jwt.substring(0, 20) + "..." // 截断JWT以避免日志过长
  });
  
  try {
    const response = await fetch(proverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("证明服务错误详情:", errorText);
      throw new Error(`证明服务返回错误 (${response.status}): ${errorText}`);
    }
    
    const proofData = await response.json();
    console.log("证明服务返回成功:", {
      ...proofData,
      zk_proofs: "[已接收]" // 不打印详细证明数据
    });
    
    return proofData;
  } catch (error) {
    console.error("调用证明服务失败:", error);
    throw new Error(`无法获取ZK证明: ${error instanceof Error ? error.message : String(error)}`);
  }
}
