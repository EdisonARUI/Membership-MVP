import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  console.log('📝 [API] 更新自动续订状态接口请求开始');
  
  try {
    console.log('📝 [API] 创建Supabase客户端');
    // 创建Supabase客户端
    const supabase = await createClient();
    
    console.log('📝 [API] 开始获取当前用户信息');
    // 获取当前用户信息
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ [API] 未授权访问: 未找到用户信息');
      return NextResponse.json({ 
        success: false, 
        error: '未授权访问' 
      }, { status: 401 });
    }
    
    const requestData = await request.json();
    const { subscription_id, auto_renew } = requestData;
    console.log(`📝 [API] 请求参数: subscription_id=${subscription_id}, auto_renew=${auto_renew}`);
    
    // 验证必要参数
    if (!subscription_id || auto_renew === undefined) {
      console.log('❌ [API] 参数验证失败: 缺少必要参数');
      return NextResponse.json({ 
        success: false, 
        error: '缺少必要参数' 
      }, { status: 400 });
    }
    
    const userId = user.id;
    console.log(`📝 [API] 用户ID: ${userId}`);
    
    console.log(`📝 [API] 第1步: 开始验证订阅归属, subscription_id=${subscription_id}`);
    // 1. 先验证订阅是否属于当前用户
    const { data: existingSubscription, error: checkError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .eq('user_id', userId)
      .single();
    
    console.log(`📝 [API] 验证结果: 成功=${!checkError}, 数据=${existingSubscription ? '已找到' : '未找到'}`);
    
    if (checkError || !existingSubscription) {
      console.error('❌ [API] 验证订阅归属失败:', checkError);
      console.error('❌ [API] 错误详情:', JSON.stringify(checkError, null, 2));
      return NextResponse.json({
        success: false, 
        error: '无权操作该订阅或订阅不存在'
      }, { status: 403 });
    }
    
    console.log(`📝 [API] 订阅验证通过, 订阅ID=${subscription_id}, 当前自动续订状态=${existingSubscription.auto_renew}`);
    
    console.log(`📝 [API] 第2步: 更新自动续订状态为 ${auto_renew}`);
    // 2. 更新自动续订状态
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .update({ auto_renew })
      .eq('id', subscription_id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ [API] 更新自动续订状态失败:', error);
      console.error('❌ [API] 错误详情:', JSON.stringify(error, null, 2));
      return NextResponse.json({
        success: false, 
        error: `更新自动续订状态失败: ${error.message}`
      }, { status: 500 });
    }
    
    console.log(`📝 [API] 自动续订状态更新成功, ID=${subscription.id}, 新状态=${subscription.auto_renew}`);
    console.log('✅ [API] 更新自动续订成功，准备返回结果');
    
    return NextResponse.json({
      success: true,
      subscription: {
        ...subscription
      }
    });
    
  } catch (error: any) {
    console.error('❌ [API] 更新自动续订状态API错误:', error);
    console.error('❌ [API] 错误调用栈:', error.stack);
    return NextResponse.json({
      success: false, 
      error: `更新自动续订状态API错误: ${error.message}`
    }, { status: 500 });
  }
} 