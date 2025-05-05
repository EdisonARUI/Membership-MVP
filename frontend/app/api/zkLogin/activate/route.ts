import { NextRequest, NextResponse } from 'next/server';
import { SuiService } from '@/utils/sui';

interface ActivateAddressRequest {
  address: string;
}

/**
 * 激活zkLogin地址的API端点
 * 
 * POST /api/zkLogin/activate
 * 
 * 此API处理zkLogin地址的激活过程
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 解析请求体
    const { address }: ActivateAddressRequest = await req.json();
    
    if (!address) {
      return NextResponse.json({ 
        success: false, 
        error: '缺少必要参数: address' 
      }, { status: 400 });
    }
    
    // 激活地址
    await SuiService.activateAddress(address);
    
    // 返回成功响应
    return NextResponse.json({ 
      success: true,
      message: '地址激活请求已发送'
    }, { status: 200 });
  } catch (error: any) {
    console.error('激活地址失败:', error);
    
    // 返回错误响应
    return NextResponse.json({ 
      success: false,
      error: `激活地址失败: ${error.message || '未知错误'}`
    }, { status: 500 });
  }
} 