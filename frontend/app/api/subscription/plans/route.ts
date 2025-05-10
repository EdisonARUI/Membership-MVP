import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// 获取订阅计划 - 支持获取所有计划或单个计划(通过plan_id查询参数)
export async function GET(request: Request) {
  console.log('📝 [API] 订阅计划接口请求开始');
  
  try {
    console.log('📝 [API] 创建Supabase客户端');
    const supabase = await createClient();
    
    const url = new URL(request.url);
    const planId = url.searchParams.get('plan_id');
    console.log(`📝 [API] 解析请求参数: plan_id=${planId || '未指定'}`);
    
    // 根据是否有plan_id参数决定查询方式
    if (planId) {
      console.log(`📝 [API] 开始查询单个计划: ${planId}`);
      // 查询单个计划
      const { data: plan, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();
      
      console.log(`📝 [API] 查询结果: 成功=${!error}, 数据=${plan ? '已获取' : '未找到'}`);
      
      if (error) {
        console.error('❌ [API] 获取订阅计划详情失败:', error);
        console.error('❌ [API] 错误详情:', JSON.stringify(error, null, 2));
        return NextResponse.json({
          success: false, 
          error: `获取订阅计划详情失败: ${error.message}`
        }, { status: 500 });
      }
      
      // 处理features字段
      console.log('📝 [API] 处理计划features字段');
      const formattedPlan = {
        ...plan,
        features: typeof plan.features === 'string' 
          ? JSON.parse(plan.features) 
          : plan.features
      };
      
      console.log('✅ [API] 成功返回单个计划数据');
      return NextResponse.json({
        success: true,
        plan: formattedPlan
      });
    } else {
      console.log('📝 [API] 开始查询所有计划');
      console.log('环境URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('尝试查询所有计划...');
      const { data, error, status } = await supabase.from('subscription_plans').select('*');
      console.log('查询状态:', status);
      console.log('查询错误:', error);
      console.log('查询数据:', data);
      
      if (error) {
        console.error('❌ [API] 获取订阅计划列表失败:', error);
        console.error('❌ [API] 错误详情:', JSON.stringify(error, null, 2));
        return NextResponse.json({
          success: false, 
          error: `获取订阅计划列表失败: ${error.message}`
        }, { status: 500 });
      }
      
      // 对每个计划处理features字段
      console.log('📝 [API] 处理所有计划的features字段');
      const formattedPlans = data.map((plan: any) => ({
        ...plan,
        features: typeof plan.features === 'string' 
          ? JSON.parse(plan.features) 
          : plan.features
      }));
      
      console.log('✅ [API] 成功返回所有计划数据');
      return NextResponse.json({
        success: true,
        plans: formattedPlans
      });
    }
  } catch (error: any) {
    console.error('❌ [API] 订阅计划API错误:', error);
    console.error('❌ [API] 错误调用栈:', error.stack);
    return NextResponse.json({
      success: false, 
      error: `订阅计划API错误: ${error.message}`
    }, { status: 500 });
  }
} 