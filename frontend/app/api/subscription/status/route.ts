import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  console.log('📝 [API] 订阅状态查询接口请求开始');
  
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
    
    const userId = user.id;
    console.log(`📝 [API] 已获取用户信息, userId=${userId}`);
    
    console.log(`📝 [API] 开始查询用户订阅状态, userId=${userId}`);
    // 获取用户订阅状态
    const { data: subscriptions, error } = await supabase
      .from('user_subscription_status')
      .select('*')
      .eq('user_id', userId)
      .order('end_date', { ascending: false });
    
    console.log(`📝 [API] 查询结果: 成功=${!error}, 订阅数量=${subscriptions?.length || 0}`);
    
    if (error) {
      console.error('❌ [API] 获取订阅状态失败:', error);
      console.error('❌ [API] 错误详情:', JSON.stringify(error, null, 2));
      return NextResponse.json({
        success: false, 
        error: `获取订阅状态失败: ${error.message}`
      }, { status: 500 });
    }
    
    // 查找活跃订阅
    const activeSubscription = subscriptions?.find((sub: any) => sub.is_active);
    console.log(`📝 [API] 活跃订阅查找结果: ${activeSubscription ? '找到活跃订阅' : '无活跃订阅'}`);
    if (activeSubscription) {
      console.log(`📝 [API] 活跃订阅ID: ${activeSubscription.id}, 计划: ${activeSubscription.plan_name}`);
    }
    
    console.log('✅ [API] 成功返回用户订阅状态数据');
    return NextResponse.json({
      success: true,
      subscriptions,
      active_subscription: activeSubscription || null
    });
    
  } catch (error: any) {
    console.error('❌ [API] 订阅状态API错误:', error);
    console.error('❌ [API] 错误调用栈:', error.stack);
    return NextResponse.json({
      success: false, 
      error: `订阅状态API错误: ${error.message}`
    }, { status: 500 });
  }
} 