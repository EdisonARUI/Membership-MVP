import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

interface SaltRequestBody {
  jwt: string;
  keyClaimName?: string;
}

/**
 * 获取zkLogin用户盐值的API端点
 * 
 * POST /api/zkLogin/salt
 * 
 * 此API作为代理，将请求转发到内部服务，避免前端直接调用导致的CORS问题
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 解析请求体
    const { jwt, keyClaimName = 'sub' }: SaltRequestBody = await req.json();
    
    if (!jwt) {
      return NextResponse.json({ 
        success: false, 
        error: '缺少必要参数: jwt' 
      }, { status: 400 });
    }
    
    // 获取服务地址从环境变量
    const saltServiceUrl = process.env.SALT_SERVICE_URL || 'https://salt-service.example.com';
    
    // 转发请求到内部服务
    console.log('正在请求用户盐值服务...');
    const response = await axios.post(`${saltServiceUrl}/salt/get`, {
      jwt,
      keyClaimName
    });
    
    // 获取响应
    const saltResponse = response.data;
    
    // 返回成功响应
    return NextResponse.json({
      success: true,
      salt: saltResponse.salt
    }, { status: 200 });
  } catch (error: any) {
    console.error('获取用户盐值失败:', error);
    
    // 检查是否API错误
    if (error.response) {
      // 服务器返回了错误状态码
      return NextResponse.json({ 
        success: false,
        error: `盐值服务返回错误: ${error.response.status} ${error.response.statusText}`,
        details: error.response.data
      }, { status: error.response.status });
    }
    
    // 网络或其他错误
    return NextResponse.json({ 
      success: false,
      error: `获取用户盐值失败: ${error.message || '未知错误'}`
    }, { status: 500 });
  }
} 