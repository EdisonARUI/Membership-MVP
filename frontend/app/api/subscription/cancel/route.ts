import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  console.log('📝 [API] 取消订阅接口请求开始');
  
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
    const { subscription_id, tx_hash } = requestData;
    console.log(`📝 [API] 请求参数: subscription_id=${subscription_id}, tx_hash=${tx_hash ? (tx_hash.substring(0, 8) + '...') : '无'}`);
    
    // 验证必要参数
    if (!subscription_id) {
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
      return NextResponse.json({
        success: false, 
        error: '无权操作该订阅或订阅不存在'
      }, { status: 403 });
    }
    
    console.log(`📝 [API] 订阅验证通过, 订阅ID=${subscription_id}, 当前状态=${existingSubscription.status}`);
    
    console.log('📝 [API] 第2步: 更新订阅状态为已取消');
    // 2. 更新订阅状态
    const { data: subscription, error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'canceled',
        auto_renew: false
      })
      .eq('id', subscription_id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ [API] 更新订阅状态失败:', updateError);
      console.error('❌ [API] 错误详情:', JSON.stringify(updateError, null, 2));
      return NextResponse.json({
        success: false, 
        error: `取消订阅失败: ${updateError.message}`
      }, { status: 500 });
    }
    
    console.log(`📝 [API] 订阅状态更新成功, ID=${subscription.id}, 新状态=canceled`);
    
    // 3. 记录交易哈希（如果有）
    if (tx_hash) {
      console.log('📝 [API] 第3步: 记录交易哈希');
      const { error: txError } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: userId,
          subscription_id: subscription_id,
          amount: 0,
          currency: 'USDT',
          status: 'completed',
          payment_method: 'crypto',
          transaction_hash: tx_hash
        });
      
      if (txError) {
        console.error('⚠️ [API] 记录交易哈希失败:', txError);
        console.error('⚠️ [API] 错误详情:', JSON.stringify(txError, null, 2));
        // 不返回错误，因为取消订阅已经成功
      } else {
        console.log('📝 [API] 交易记录创建成功');
      }
    }
    
    console.log('✅ [API] 取消订阅成功，准备返回结果');
    return NextResponse.json({
      success: true,
      subscription
    });
    
  } catch (error: any) {
    console.error('❌ [API] 取消订阅API错误:', error);
    console.error('❌ [API] 错误调用栈:', error.stack);
    return NextResponse.json({
      success: false, 
      error: `取消订阅API错误: ${error.message}`
    }, { status: 500 });
  }
} 