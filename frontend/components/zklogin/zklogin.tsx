"use client";

import { useState, useEffect, useRef } from 'react';
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
import { createClient } from "@/utils/supabase/client";


// Sui Devnet客户端
const suiClient = new SuiClient({ url: 'https://fullnode.devnet.sui.io' });
// 最大Epoch - 根据Devnet设置，通常为10
const MAX_EPOCH = 10;
// 现在createClient不需要参数，因为它在client.ts中已经配置好了URL和ANON_KEY
const supabase = createClient();

// Google OAuth配置
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/auth/popup-callback` : '';


// 添加props类型定义
interface ZkLoginProviderProps {
  userId?: string;
  autoInitialize?: boolean;
  onLog?: (message: string) => void;
  onReady?: (methods: {
    initiateLogin: () => Promise<void>;
    handleGoogleAuth: () => Promise<void>;
  }) => void;
}

export default function ZkLoginProvider({ userId, autoInitialize = false, onLog, onReady }: ZkLoginProviderProps) {
  const [ephemeralKeypair, setEphemeralKeypair] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const savedKeypair = localStorage.getItem('zkLogin_ephemeral');
      if (savedKeypair) {
        try {
          const parsedKeypair = JSON.parse(savedKeypair);
          if (parsedKeypair?.keypair?.publicKey && 
              parsedKeypair?.keypair?.secretKey && 
              parsedKeypair?.randomness && 
              parsedKeypair?.maxEpoch && 
              parsedKeypair?.nonce) {
            return parsedKeypair;
          }
        } catch (e) {
          console.error("解析本地存储的密钥对出错:", e);
        }
      }
    }
    return null;
  });
  
  const [zkLoginAddress, setZkLoginAddress] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('zkLogin_address');
    }
    return null;
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const componentRef = useRef<HTMLDivElement>(null);
  const authWindowRef = useRef<Window | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  
  const onReadyCalledRef = useRef<boolean>(false);
  
  const methodsRef = useRef<any>({});
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logEntry]);
    console.log(logEntry);
    
    if (onLog) {
      onLog(message);
    }
  };

  
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type !== 'JWT_RECEIVED') return;
      
      const jwt = event.data.jwt;
      if (jwt && ephemeralKeypair) {
        sessionStorage.setItem('jwt_already_processed', 'true');
        
        await handleJwtReceived(jwt);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [ephemeralKeypair]);
  
  const prepareKeypair = async () => {
    if (ephemeralKeypair) {
      addLog("使用现有临时密钥对，不需要重新创建");
      return ephemeralKeypair.nonce;
    }
    
    setLoading(true);
    setError(null);
    try {
      addLog("1. 开始创建临时密钥对...");
      
      const { epoch } = await suiClient.getLatestSuiSystemState();
      addLog(`获取Sui当前Epoch: ${epoch}`);
      
      const currentEpoch = Number(epoch);
      const maxEpoch = currentEpoch + MAX_EPOCH;
      
      const keypair = new Ed25519Keypair();
      const randomness = generateRandomness();
      const nonce = generateNonce(keypair.getPublicKey(), maxEpoch, randomness);
      
      addLog(`生成随机数: ${randomness}`);
      addLog(`生成nonce: ${nonce}`);
      
      const ephemeralData = {
        keypair: {
          publicKey: toB64(keypair.getPublicKey().toRawBytes()),
          secretKey: keypair.getSecretKey()
        },
        randomness,
        maxEpoch,
        nonce
      };
      
      localStorage.setItem('zkLogin_ephemeral', JSON.stringify(ephemeralData));
      setEphemeralKeypair(ephemeralData);
      
      addLog("临时密钥对创建成功");
      return nonce;
    } catch (err: any) {
      console.error("准备密钥对出错:", err);
      setError(`准备密钥对失败: ${err.message}`);
      addLog(`临时密钥对创建失败: ${err.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // 解析JWT并验证内容
  const parseJwt = (jwt: string) => {
    addLog("2. 收到JWT，开始处理...");
    addLog(`2.1 JWT长度: ${jwt.length}, 开头部分: ${jwt.substring(0, 15)}...`);
    
    // 从JWT解析payload
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      throw new Error("无效的JWT格式");
    }
    
    // 解码JWT的payload部分
    const payload = JSON.parse(atob(parts[1]));
    addLog(`2.2 JWT payload解析成功: sub=${payload.sub}, iss=${payload.iss}`);
    addLog(`2.3 JWT其他关键字段: aud=${payload.aud || '未找到'}, exp=${payload.exp || '未找到'}`);
    
    // 获取必要的JWT信息
    const sub = payload.sub;
    const aud = payload.aud;
    const iss = payload.iss;
    
    if (!sub || !aud || !iss) {
      throw new Error("JWT缺少必要的字段");
    }
    
    return payload;
  };

  // 获取用户salt并发送通知
  const fetchUserSaltAndNotify = async (jwt: string) => {
    addLog(`3. 【开始】获取用户salt...`);
    const userSalt = await fetchUserSalt(jwt);
    addLog(`3.1 成功获取用户salt: ${userSalt.substring(0, 10)}...`);
    addLog(`3.2 salt是否为默认值: ${userSalt === "0000000000000000000000000000000000000000000000000000000000000000" ? "是" : "否"}`);
    
    // 通知salt已生成
    window.postMessage({ type: 'USER_SALT', data: userSalt }, window.location.origin);
    
    return userSalt;
  };

  // 从存储获取并准备密钥对数据
  const prepareKeypairFromStorage = () => {
    addLog(`3.3 从localStorage获取临时密钥对和OAuth参数...`);
    
    // 获取原始的ephemeral keypair数据
    const ephemeralDataStr = localStorage.getItem('zkLogin_ephemeral');
    if (!ephemeralDataStr) {
      throw new Error('未找到临时密钥对数据');
    }
    
    // 获取原始的OAuth流程中使用的nonce和相关参数
    const originalNonce = localStorage.getItem('zklogin_nonce');
    const originalMaxEpoch = localStorage.getItem('zklogin_maxEpoch');
    const originalRandomnessStr = localStorage.getItem('zklogin_randomness');
    
    if (originalNonce) {
      addLog(`3.4 找到原始OAuth nonce: ${originalNonce.substring(0, 10)}...`);
    } else {
      addLog(`3.4 未找到原始OAuth nonce，将使用从ephemeralKeypair计算的nonce`);
    }
    
    const storedData = JSON.parse(ephemeralDataStr);
    addLog(`3.5 成功解析临时密钥对数据，maxEpoch: ${storedData.maxEpoch}`);
    
    return {
      storedData,
      originalNonce,
      originalMaxEpoch,
      originalRandomnessStr
    };
  };

  // 重建密钥对并获取扩展公钥
  const rebuildKeypairAndExtendPublicKey = (storedData: any) => {
    // 重建Ed25519Keypair
    addLog(`3.6 开始重建Ed25519Keypair...`);
    const secretKey = storedData.keypair.secretKey;
    const ephemeralKeypair = Ed25519Keypair.fromSecretKey(secretKey);
    addLog(`3.7 重建Ed25519Keypair成功`);
    
    // 获取扩展的临时公钥
    addLog(`3.8 开始获取扩展的临时公钥...`);
    const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(ephemeralKeypair.getPublicKey());
    addLog(`3.9 扩展的临时公钥获取成功: ${extendedEphemeralPublicKey.substring(0, 15)}...`);
    
    return {
      ephemeralKeypair,
      extendedEphemeralPublicKey
    };
  };

  // 计算zkLogin地址
  const deriveZkLoginAddress = (jwt: string, userSalt: string) => {
    addLog(`4. 【开始】从JWT和salt计算Sui地址...`);
    const address = jwtToAddress(jwt, userSalt);
    addLog(`4.1 成功计算zkLogin地址: ${address}`);
    
    // 通知地址已生成
    window.postMessage({ type: 'SUI_ADDRESS', data: address }, window.location.origin);
    
    return address;
  };

  // 准备zkProof请求参数
  const prepareZkProofParams = (storedData: any, originalRandomnessStr: string | null, originalMaxEpoch: string | null) => {
    let jwtRandomness = storedData.randomness;
    
    // 尝试使用原始OAuth流程中的randomness
    if (originalRandomnessStr) {
      try {
        const randomnessArray = JSON.parse(originalRandomnessStr);
        // 恢复为正确的格式
        if (Array.isArray(randomnessArray)) {
          addLog(`5.1 使用原始OAuth流程中的randomness`);
          jwtRandomness = randomnessArray.join(''); // 简单连接，可能需要调整
        }
      } catch (e) {
        addLog(`5.1 解析原始randomness失败，使用默认值: ${e}`);
      }
    }
    
    // 使用一致的maxEpoch
    let zkpMaxEpoch = storedData.maxEpoch;
    if (originalMaxEpoch) {
      zkpMaxEpoch = parseInt(originalMaxEpoch, 10);
      addLog(`5.2 使用原始OAuth流程中的maxEpoch: ${zkpMaxEpoch}`);
    }
    
    return {
      jwtRandomness,
      zkpMaxEpoch
    };
  };

  // 获取零知识证明
  const getZkProof = async (
    jwt: string,
    extendedEphemeralPublicKey: string,
    jwtRandomness: string,
    zkpMaxEpoch: number,
    userSalt: string,
    originalNonce: string | null
  ) => {
    addLog(`5.3 准备ZK证明请求参数: jwt(部分)=${jwt.substring(0, 15)}..., randomness长度=${jwtRandomness.length}, maxEpoch=${zkpMaxEpoch}`);
    
    const proofResponse = await fetchZkProof(
      jwt,
      extendedEphemeralPublicKey,
      jwtRandomness,
      zkpMaxEpoch,
      userSalt,
      originalNonce || undefined
    );
    
    addLog(`5.4 零知识证明获取成功，证明包含字段: ${Object.keys(proofResponse).join(', ')}`);
    
    // 通知ZK证明已获取
    window.postMessage({ type: 'ZK_PROOF', data: true }, window.location.origin);
    
    return proofResponse;
  };

  // 保存地址和证明到存储和数据库
  const saveAddressAndProof = async (address: string, proofResponse: any, userSalt: string, zkpMaxEpoch: number) => {
    // 保存到状态和本地存储
    setZkLoginAddress(address);
    localStorage.setItem('zkLogin_address', address);
    localStorage.setItem('zkLogin_proof', JSON.stringify(proofResponse));
    addLog(`5.5 已保存zkLogin地址和证明到localStorage`);
    
    // 获取用户ID - 优先使用props传入的userId，如果为空则从Supabase获取
    let currentUserId = userId;
    
    if (!currentUserId) {
      addLog(`5.6 Props中未提供用户ID，尝试从Supabase认证系统获取...`);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session) {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            addLog(`5.6.1 获取Supabase用户失败: ${userError.message}`);
          } else if (userData && userData.user) {
            currentUserId = userData.user.id;
            addLog(`5.6.2 成功从Supabase获取用户ID: ${currentUserId.substring(0, 8)}...`);
          } else {
            addLog(`5.6.3 Supabase未返回用户信息，可能未登录`);
          }
        }
        else{
          addLog(`5.6.4 Supabase未返回会话信息，可能未登录`);
        }
      } catch (authErr: any) {
        addLog(`5.6.5 查询Supabase用户时出错: ${authErr.message}`);
      }
    }
    
    // 使用获取到的用户ID保存钱包地址
    if (currentUserId) {
      addLog(`5.7 开始保存钱包地址到数据库，用户ID: ${currentUserId.substring(0, 8)}...`);
      try {
        await saveUserWithWalletAddress(currentUserId, address);
        addLog(`5.8 成功保存钱包地址到数据库`);
      } catch (saveErr: any) {
        addLog(`5.8 保存钱包地址失败: ${saveErr.message}`);
      }
    } else {
      addLog(`5.7 未能获取有效用户ID，跳过保存钱包地址到数据库`);
    }
    
    // 【步骤4】创建zkLogin签名
    addLog(`6. 【开始】生成zkLogin签名...`);
    const zkLoginSignature = getZkLoginSignature({
      inputs: {
        ...proofResponse,
        addressSeed: userSalt
      },
      maxEpoch: zkpMaxEpoch,
      userSignature: '0x' + '00'.repeat(64)
    });
    
    addLog(`6.1 zkLogin签名生成成功，包含字段: ${Object.keys(zkLoginSignature).join(', ')}`);
    localStorage.setItem('zkLogin_signature', JSON.stringify(zkLoginSignature));
    addLog(`6.2 已保存zkLogin签名到localStorage`);
    
    addLog(`7. 【完成】zkLogin全流程执行完毕！`);
    addLog(`8. 【开始】尝试激活zkLogin地址...`);
    try {
      const response = await fetch('https://faucet.devnet.sui.io/v2/gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          FixedAmountRequest: { recipient: address }
        })
      });
      
      if (response.ok) {
        addLog(`8.1 成功发送激活请求，地址应该很快在链上可见`);
      } else {
        addLog(`8.2 激活请求失败，状态码: ${response.status}`);
      }
    } catch (err) {
      addLog(`8.3 激活请求出错: ${err}`);
    }
    return {
      address,
      zkLoginSignature
    };
  };

  // 处理Google登录后的JWT - 主函数，协调整个流程
  const handleJwtReceived = async (jwt: string) => {
    if (!ephemeralKeypair) {
      setError("找不到临时密钥对，请重新开始");
      addLog("找不到临时密钥对，请重新开始");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // 步骤1: 解析JWT
      const payload = parseJwt(jwt);
      
      // 步骤2: 获取用户salt
      const userSalt = await fetchUserSaltAndNotify(jwt);
      
      // 步骤3: 准备密钥对数据
      const { storedData, originalNonce, originalMaxEpoch, originalRandomnessStr } = prepareKeypairFromStorage();
      
      // 步骤4: 重建密钥对
      const { ephemeralKeypair, extendedEphemeralPublicKey } = rebuildKeypairAndExtendPublicKey(storedData);
      
      // 步骤5: 计算zkLogin地址
      const address = deriveZkLoginAddress(jwt, userSalt);
      
      // 步骤6: 准备zkProof参数
      const { jwtRandomness, zkpMaxEpoch } = prepareZkProofParams(storedData, originalRandomnessStr, originalMaxEpoch);
      
      // 步骤7: 获取零知识证明
      const proofResponse = await getZkProof(
        jwt,
        extendedEphemeralPublicKey,
        jwtRandomness,
        zkpMaxEpoch,
        userSalt,
        originalNonce
      );
      
      // 步骤8: 保存地址和证明
      await saveAddressAndProof(address, proofResponse, userSalt, zkpMaxEpoch);
      
    } catch (err: any) {
      console.error("处理JWT出错:", err);
      setError(`处理JWT失败: ${err.message}`);
      addLog(`处理JWT失败: ${err.message}`);
      
      // 添加更详细的错误信息
      if (err.stack) {
        addLog(`错误堆栈: ${err.stack.split('\n')[0]}`);
      }
      if (err.cause) {
        addLog(`错误原因: ${err.cause}`);
      }
    } finally {
      setLoading(false);
    }
  };
  
  
  const handleGoogleAuth = async () => {
    try {
      if (!ephemeralKeypair) {
        const nonce = await prepareKeypair();
        if (!nonce) {
          addLog("无法继续：临时密钥对创建失败");
          return;
        }
      }
      
      const { epoch } = await suiClient.getLatestSuiSystemState();
      const maxEpoch = Number(epoch) + 2;
      const randomness = generateRandomness();
      
      const ephemeralDataStr = localStorage.getItem('zkLogin_ephemeral');
      if (!ephemeralDataStr) {
        addLog("未找到临时密钥对数据");
        return;
      }
      
      const storedData = JSON.parse(ephemeralDataStr);
      
      const secretKey = storedData.keypair.secretKey;
      const keypair = Ed25519Keypair.fromSecretKey(secretKey);
      
      const nonce = generateNonce(keypair.getPublicKey(), maxEpoch, randomness);
      
      addLog(`生成的nonce: ${nonce.substring(0, 10)}...`);
      
      localStorage.setItem('zklogin_nonce', nonce);
      localStorage.setItem('zklogin_maxEpoch', maxEpoch.toString());
      localStorage.setItem('zklogin_randomness', JSON.stringify(Array.from(randomness)));
      
      addLog("开始 Google 授权流程...");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(window.location.pathname)}`,
          queryParams: {
            prompt: 'consent',
            response_type: 'id_token',
            scope: 'openid email profile',
            nonce: nonce
          }
        }
      });

      if (error) {
        addLog(`Google 授权错误: ${error.message}`);
        setError(error.message);
        return;
      }

      addLog("Google 授权请求已发送");
    } catch (err: any) {
      addLog(`Google 授权异常: ${err.message}`);
      setError(err.message);
    }
  };
  
  useEffect(() => {
    if (autoInitialize && !ephemeralKeypair) {
      addLog("自动初始化：未检测到现有密钥对，开始创建新密钥对");
      prepareKeypair();
    } else if (autoInitialize && ephemeralKeypair) {
      addLog("自动初始化：检测到现有密钥对，使用现有密钥对");
    }
  }, [autoInitialize, ephemeralKeypair]);
  
  useEffect(() => {
    methodsRef.current = {
      initiateLogin: prepareKeypair,
      handleGoogleAuth: handleGoogleAuth
    };
  }, [ephemeralKeypair]);
  
  useEffect(() => {
    if (onReady && !onReadyCalledRef.current) {
      onReady(methodsRef.current);
      onReadyCalledRef.current = true;
    }
  }, [onReady]);
  
  return (
    <div ref={componentRef} className="mt-4">
      {zkLoginAddress ? (
        <div className="p-4 bg-slate-700 rounded-lg text-white">
          <h3 className="text-lg font-bold">已连接到Sui Devnet</h3>
          <p className="text-sm truncate">地址: {zkLoginAddress}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
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

async function fetchUserSalt(jwt: string): Promise<string> {
  try {
    console.log("开始获取用户salt...");
    const defaultSalt = "0000000000000000000000000000000000000000000000000000000000000000";
    console.log(`返回默认salt: ${defaultSalt}`);
    return defaultSalt;
  } catch (error) {
    console.error("获取salt失败:", error);
    return "0000000000000000000000000000000000000000000000000000000000000000";
  }
}

// 调用Mysten Labs的证明服务
async function fetchZkProof(
  jwt: string,
  extendedEphemeralPublicKey: string,
  jwtRandomness: string,
  maxEpoch: number,
  userSalt: string,
  originalNonce?: string
) {
  // 使用Mysten Labs的开发网络证明服务
  const proverUrl = "https://prover-dev.mystenlabs.com/v1";
  
  // 确保salt格式正确
  const salt = userSalt;
  
  if (originalNonce) {
    console.log(`使用原始OAuth nonce: ${originalNonce.substring(0, 10)}...`);
  } else {
    console.log(`没有提供原始OAuth nonce`);
  }
  
  // 准备请求负载
  const payload = {
    jwt,
    extendedEphemeralPublicKey,
    jwtRandomness, 
    maxEpoch,
    salt, // 使用正确的参数名"salt"
    keyClaimName: "sub", 
    oauthProvider: "google"
  };
  
  if (originalNonce) {
    console.log(`OAuth流程中使用的原始nonce: ${originalNonce}`);
  }
  
  console.log("向Mysten Labs证明服务发送请求:", {
    ...payload,
    jwt: payload.jwt.substring(0, 20) + "...", // 截断JWT以避免日志过长
    salt: typeof salt === 'string' && salt.length > 10 ? salt.substring(0, 10) + "..." : salt
  });
  
  try {
    console.log(`开始调用证明服务，URL: ${proverUrl}`);
    
    // 注意：直接从前端调用可能会遇到CORS错误
    // 官方建议：在生产环境中应通过后端服务中转此请求以避免CORS问题
    const response = await fetch(proverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`证明服务返回错误 (${response.status}): ${errorText}`);
      
      // 提供更详细的错误信息，特别是对常见错误的处理
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
    console.log("证明服务返回成功:", {
      ...proofData,
      proofPoints: proofData.proofPoints ? "已接收" : "未包含在响应中" // 确认是否包含proofPoints
    });
    
    // 验证返回的数据结构是否完整
    if (!proofData.proofPoints || !proofData.issBase64Details || !proofData.headerBase64) {
      console.warn("证明服务返回的数据结构不完整:", Object.keys(proofData).join(", "));
    }
    
    return proofData;
  } catch (error) {
    console.error("调用证明服务失败:", error);
    throw new Error(`无法获取ZK证明: ${error instanceof Error ? error.message : String(error)}`);
  }
}
