import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { 
  PartialZkLoginSignature, 
  ZkProofRequestBody,
  ZkProofResponseData
} from '@/interfaces/ZkLogin';
import { ZKPROOF_URL } from '@/config/zklogin';

// 简单缓存实现
type CacheEntry = {
  timestamp: number;
  data: PartialZkLoginSignature;
};

// 在内存中缓存结果 - 注意：这只在同一实例中有效
const proofCache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时缓存有效期

// 创建缓存键
function createCacheKey(payload: ZkProofRequestBody): string {
  if (!payload.jwt || !payload.ephemeralPublicKey || !payload.userSalt) {
    throw new Error('无法创建缓存键：缺少必要参数');
  }
  
  // 从关键参数生成缓存键，避免过于冗长
  return `${payload.jwt.substring(0, 20)}_${payload.ephemeralPublicKey}_${payload.userSalt}_${payload.maxEpoch || 2}`;
}

// 带重试的请求函数
async function fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<any> {
  let lastError: any;
  let retryDelay = 1000; // 初始延迟1秒
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`重试请求 (${attempt}/${maxRetries}) 延迟 ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
      
      return await axios(url, options);
    } catch (error: any) {
      lastError = error;
      
      // 如果是限流错误(402或429)或服务器错误(5xx)，则重试
      const shouldRetry = 
        attempt < maxRetries && 
        error.response && 
        (error.response.status === 402 || 
         error.response.status === 429 || 
         error.response.status >= 500);
      
      if (!shouldRetry) {
        throw error;
      }
      
      console.log(`遇到错误 (${error.response?.status}): ${error.message}. 准备重试...`);
      
      // 指数退避策略
      retryDelay *= 2;
    }
  }
  
  throw lastError;
}

/**
 * 获取zkLogin证明的API端点
 * 
 * POST /api/zkLogin/proofs
 * 
 * 此API作为代理，将请求转发到Mysten Labs的ZKP服务，避免前端直接调用导致的CORS问题
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 解析请求体
    const zkpRequestPayload: ZkProofRequestBody = await req.json();
    
    console.log('收到ZKP请求参数:', JSON.stringify({
      jwt_length: zkpRequestPayload.jwt?.length || 0,
      ephemeralPublicKey: zkpRequestPayload.ephemeralPublicKey?.substring(0, 10) + '...',
      salt: zkpRequestPayload.userSalt?.substring(0, 10) + '...',
      maxEpoch: zkpRequestPayload.maxEpoch
    }));
    
    // 验证必要参数
    if (!zkpRequestPayload.jwt || !zkpRequestPayload.ephemeralPublicKey || !zkpRequestPayload.userSalt) {
      return NextResponse.json<ZkProofResponseData>({ 
        success: false,
        error: '缺少必要参数: jwt, ephemeralPublicKey, userSalt' 
      }, { status: 400 });
    }

    let cacheKey: string;
    try {
      // 生成缓存键
      cacheKey = createCacheKey(zkpRequestPayload);
      
      // 检查内存缓存
      const cachedResult = proofCache.get(cacheKey);
      if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_TTL) {
        console.log('使用缓存的ZKP结果');
        
        // 构造安全的响应对象
        const response: ZkProofResponseData = {
          success: true,
          proof: cachedResult.data,
          cached: true
        };
        
        return NextResponse.json(response, { status: 200 });
      }
    } catch (cacheError) {
      console.warn('缓存检查失败:', cacheError);
      // 缓存失败继续处理，不影响主流程
    }

    // 注意: Mysten Labs服务要求的参数名可能与当前不同
    // 根据zkLogin文档调整请求体格式
    const requestBody = {
      jwt: zkpRequestPayload.jwt,
      // 注意: 服务可能期望的是extendedEphemeralPublicKey而不是ephemeralPublicKey
      extendedEphemeralPublicKey: zkpRequestPayload.ephemeralPublicKey,
      maxEpoch: zkpRequestPayload.maxEpoch || 2,
      jwtRandomness: zkpRequestPayload.jwtRandomness || '', // 确保有值
      salt: zkpRequestPayload.userSalt,
      keyClaimName: "sub" // 默认使用"sub"作为键声明名称
    };
    
    // 转发请求到Mysten Labs的ZKP服务
    console.log('正在请求Mysten Labs ZKP服务');
    console.log('ZKPROOF_URL是:', ZKPROOF_URL);
    console.log('请求参数:', JSON.stringify(requestBody, (key, value) => 
      key === 'jwt' ? `${value.substring(0, 15)}...` : value
    ));

    // 使用带重试的请求函数
    const response = await fetchWithRetry(ZKPROOF_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000, // 设置30秒超时
      data: requestBody
    }, 3); // 最多重试3次
    
    console.log('ZKP服务响应状态:', response.status);
    console.log('ZKP服务响应头:', JSON.stringify(response.headers));
    
    // 获取响应
    const rawProofResponse = response.data;
    console.log('ZKP服务响应数据结构:', Object.keys(rawProofResponse));

    // 在route.ts中添加验证
    if (!rawProofResponse.proofPoints || 
        !Array.isArray(rawProofResponse.proofPoints.a) || 
        !Array.isArray(rawProofResponse.proofPoints.b) || 
        !Array.isArray(rawProofResponse.proofPoints.c)) {
      throw new Error("ZKP服务返回的proofPoints结构不正确");
    }

    // 转换结构为前端期望的格式
    const proofResponse: PartialZkLoginSignature = {
      inputs: {
        proofPoints: rawProofResponse.proofPoints,
        issBase64Details: rawProofResponse.issBase64Details,
        headerBase64: rawProofResponse.headerBase64
      },
      maxEpoch: zkpRequestPayload.maxEpoch || 2
    };

    // 检查响应格式是否有效
    if (proofResponse && proofResponse.inputs) {
      // 记录关键字段以便调试
      console.log("转换后的ZKP服务关键字段:", {
        hasProofPoints: !!proofResponse.inputs.proofPoints,
        hasIssBase64Details: !!proofResponse.inputs.issBase64Details,
        hasHeaderBase64: !!proofResponse.inputs.headerBase64,
        maxEpoch: proofResponse.maxEpoch
      });
      
      // 将结果存入内存缓存
      cacheKey = createCacheKey(zkpRequestPayload);
      proofCache.set(cacheKey, {
        timestamp: Date.now(),
        data: proofResponse
      });
    }
    
    // 构造安全的响应对象
    const apiResponse: ZkProofResponseData = {
      success: true,
      proof: proofResponse
    };
    
    // 返回成功响应
    return NextResponse.json(apiResponse, { status: 200 });
  } catch (error: any) {
    console.error('获取ZKP失败:', error);
    
    // 增强错误日志
    if (error.response) {
      console.error('ZKP服务响应状态:', error.response.status);
      console.error('ZKP服务响应头:', JSON.stringify(error.response.headers));
      console.error('ZKP服务响应数据:', JSON.stringify(error.response.data));
    } else if (error.request) {
      console.error('未收到ZKP服务响应，请求信息:', error.request);
    } else {
      console.error('请求配置错误:', error.config);
    }
    
    // 检查是否API错误
    if (error.response) {
      // 如果是限流错误，提供更明确的错误消息
      if (error.response.status === 402 || error.response.status === 429) {
        return NextResponse.json<ZkProofResponseData>({ 
          success: false,
          error: `ZKP服务请求频率过高，请稍后再试`,
          details: error.response.data
        }, { status: 429 });
      }
      
      // 服务器返回了错误状态码
      return NextResponse.json<ZkProofResponseData>({ 
        success: false,
        error: `ZKP服务返回错误: ${error.response.status} ${error.response.statusText}`,
        details: error.response.data
      }, { status: error.response.status });
    }
    
    // 网络或其他错误
    return NextResponse.json<ZkProofResponseData>({ 
      success: false,
      error: `获取ZKP失败: ${error.message || '未知错误'}`
    }, { status: 500 });
  }
} 