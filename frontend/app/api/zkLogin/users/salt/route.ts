import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { parseJwt } from '@/utils/jwt/server';
import crypto from 'crypto';

interface SaltRequestBody {
  jwt: string;
  keyClaimName?: string;
}

/**
 * 获取zkLogin用户盐值的API端点
 * 
 * POST /api/zkLogin/salt
 * 
 * 此API从Supabase数据库获取或创建用户盐值
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
    
    // 解码JWT获取用户信息
    let decodedJwt;
    try {
      decodedJwt = parseJwt(jwt);
    } catch (error) {
      console.error('JWT解码失败:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'JWT解码失败，请提供有效的JWT令牌' 
      }, { status: 400 });
    }
    
    // 验证JWT中包含必要的字段
    if (!decodedJwt.sub || !decodedJwt.iss) {
      return NextResponse.json({ 
        success: false, 
        error: 'JWT缺少必要字段: sub 和/或 iss' 
      }, { status: 400 });
    }
    
    // 提取必要信息
    const provider = decodedJwt.iss; // 提供商
    const providerUserId = decodedJwt.sub; // 用户ID
    const audience = Array.isArray(decodedJwt.aud) ? decodedJwt.aud[0] : decodedJwt.aud || ''; // 应用ID
    
    // 创建Supabase客户端
    const supabase = await createClient();
    
    // 检查用户是否已经在数据库中有盐值
    const { data: saltData, error: saltError } = await supabase
      .from('zklogin_user_salts')
      .select('salt')
      .eq('provider', provider)
      .eq('provider_user_id', providerUserId)
      .eq('audience', audience)
      .maybeSingle();
    
    if (saltError) {
      console.error('从数据库获取盐值失败:', saltError);
      return NextResponse.json({ 
        success: false, 
        error: `数据库查询错误: ${saltError.message}` 
      }, { status: 500 });
    }
    
    // 如果找到了盐值，返回它
    if (saltData) {
      return NextResponse.json({
        success: true,
        salt: saltData.salt
      }, { status: 200 });
    }
    
    // 如果没有找到盐值，生成一个新的
    // 生成一个随机整数作为盐 (16字节 = 128位)
    // 避免使用BigInt操作，防止兼容性问题
    const randomBytes = crypto.randomBytes(16);
    let saltValue = '';
    for (let i = 0; i < randomBytes.length; i++) {
      saltValue += randomBytes[i].toString();
    }
    // 确保盐值不超过128位整数的最大值
    const saltString = saltValue.substring(0, 38);
    
    // 获取当前用户ID（如果已登录）
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    if (!userId) {
      console.warn('用户未登录，无法保存盐值到特定用户');
    }
    
    // 保存新生成的盐值到数据库
    const { error: insertError } = await supabase
      .from('zklogin_user_salts')
      .insert({
        user_id: userId || '00000000-0000-0000-0000-000000000000', // 使用默认ID如果用户未登录
        provider,
        provider_user_id: providerUserId,
        audience,
        salt: saltString
      });
    
    if (insertError) {
      console.error('保存盐值到数据库失败:', insertError);
      
      // 即使保存失败，仍然返回生成的盐值
      console.warn('返回未保存的临时盐值');
      return NextResponse.json({
        success: true,
        salt: saltString,
        warning: '盐值未能保存到数据库，可能在下次请求时不同'
      }, { status: 200 });
    }
    
    // 返回成功响应
    return NextResponse.json({
      success: true,
      salt: saltString
    }, { status: 200 });
  } catch (error: any) {
    console.error('获取用户盐值失败:', error);
    
    // 返回错误响应
    return NextResponse.json({ 
      success: false,
      error: `获取用户盐值失败: ${error.message || '未知错误'}`
    }, { status: 500 });
  }
} 