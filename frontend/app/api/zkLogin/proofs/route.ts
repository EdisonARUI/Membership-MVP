import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { 
  PartialZkLoginSignature, 
  ZkProofRequestBody,
  ZkProofResponseData
} from '@/interfaces/ZkLogin';

/**
 * 获取zkLogin证明的API端点
 * 
 * POST /api/zkLogin/proofs
 * 
 * 此API作为代理，将请求转发到内部ZKP服务，避免前端直接调用导致的CORS问题
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 解析请求体
    const zkpRequestPayload: ZkProofRequestBody = await req.json();
    
    // 验证必要参数
    if (!zkpRequestPayload.jwt || !zkpRequestPayload.ephemeralPublicKey || !zkpRequestPayload.userSalt) {
      return NextResponse.json<ZkProofResponseData>({ 
        success: false,
        error: '缺少必要参数: jwt, ephemeralPublicKey, userSalt' 
      }, { status: 400 });
    }
    
    // 设置默认值
    const networkType = zkpRequestPayload.networkType || 'devnet';
    
    // 获取ZKP服务地址从环境变量
    const zkpServiceUrl = process.env.ZKP_SERVICE_URL || 'https://zkp-service.example.com';
    
    // 转发请求到内部ZKP服务
    console.log('正在请求ZKP服务:', `${zkpServiceUrl}/zkp/get`);
    const response = await axios.post(`${zkpServiceUrl}/zkp/get`, zkpRequestPayload);
    
    // 获取响应
    const proofResponse = response.data as PartialZkLoginSignature;
    
    // 返回成功响应
    return NextResponse.json<ZkProofResponseData>({
      success: true,
      proof: proofResponse
    }, { status: 200 });
  } catch (error: any) {
    console.error('获取ZKP失败:', error);
    
    // 检查是否API错误
    if (error.response) {
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