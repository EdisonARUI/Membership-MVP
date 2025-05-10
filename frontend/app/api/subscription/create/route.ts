import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  console.log('📝 [API] 创建订阅接口请求开始');
  
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
    const { plan_id, tx_hash, auto_renew } = requestData;
    console.log(`📝 [API] 请求参数: plan_id=${plan_id}, tx_hash=${tx_hash?.substring(0, 8)}..., auto_renew=${auto_renew}`);
    
    // 验证必要参数
    if (!plan_id || !tx_hash) {
      console.log('❌ [API] 参数验证失败: 缺少必要参数');
      return NextResponse.json({ 
        success: false, 
        error: '缺少必要参数' 
      }, { status: 400 });
    }
    
    const userId = user.id;
    console.log(`📝 [API] 用户ID: ${userId}`);
    
    console.log(`📝 [API] 第1步: 开始获取计划详情 plan_id=${plan_id}`);
    // 1. 获取计划详情
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single();
    
    if (planError) {
      console.error('❌ [API] 获取计划详情失败:', planError);
      console.error('❌ [API] 错误详情:', JSON.stringify(planError, null, 2));
      return NextResponse.json({
        success: false, 
        error: `获取计划详情失败: ${planError.message}`
      }, { status: 500 });
    }
    
    console.log(`📝 [API] 已获取计划详情: ${plan.name}, 价格: ${plan.price}, 周期: ${plan.period}`);
    
    console.log('📝 [API] 第2步: 计算订阅日期');
    // 2. 计算日期
    const startDate = new Date();
    const endDate = new Date();
    
    switch (plan.period) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }
    
    console.log(`📝 [API] 订阅日期: 开始=${startDate.toISOString()}, 结束=${endDate.toISOString()}`);
    
    console.log('📝 [API] 第3步: 创建订阅记录');
    // 3. 创建订阅记录
    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        plan_id,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        auto_renew: auto_renew === false ? false : true,
        contract_object_id: requestData.contract_object_id
      })
      .select()
      .single();
    
    if (subscriptionError) {
      console.error('❌ [API] 创建订阅记录失败:', subscriptionError);
      console.error('❌ [API] 错误详情:', JSON.stringify(subscriptionError, null, 2));
      return NextResponse.json({
        success: false, 
        error: `创建订阅记录失败: ${subscriptionError.message}`
      }, { status: 500 });
    }
    
    console.log(`📝 [API] 订阅记录创建成功: ID=${subscription.id}`);
    
    console.log('📝 [API] 第4步: 创建支付记录');
    // 4. 创建支付记录
    const { error: paymentError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: userId,
        subscription_id: subscription.id,
        amount: plan.price,
        currency: 'USDT',
        status: 'completed',
        payment_method: 'crypto',
        transaction_hash: tx_hash
      });
    
    if (paymentError) {
      console.error('❌ [API] 创建支付记录失败:', paymentError);
      console.error('❌ [API] 错误详情:', JSON.stringify(paymentError, null, 2));
      return NextResponse.json({
        success: false, 
        error: `创建支付记录失败: ${paymentError.message}`
      }, { status: 500 });
    }
    
    console.log('📝 [API] 支付记录创建成功');
    
    // 5. 返回结果
    console.log('✅ [API] 创建订阅成功，准备返回结果');
    return NextResponse.json({
      success: true,
      subscription: {
        ...subscription,
        plan_name: plan.name,
        plan_period: plan.period
      }
    });
    
  } catch (error: any) {
    console.error('❌ [API] 创建订阅API错误:', error);
    console.error('❌ [API] 错误调用栈:', error.stack);
    return NextResponse.json({
      success: false, 
      error: `创建订阅API错误: ${error.message}`
    }, { status: 500 });
  }
} 