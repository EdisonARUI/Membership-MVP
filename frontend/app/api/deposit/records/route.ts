import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { DepositRecord, DepositRecordsResponse } from '@/interfaces/Deposit';

/**
 * 充值历史记录API
 * 
 * GET /api/deposit/records
 * 
 * 查询参数:
 * - limit: 返回记录数量限制
 * - user: 指定用户地址
 * - page: 分页页码（从1开始）
 */
export async function GET(req: NextRequest): Promise<NextResponse<DepositRecordsResponse>> {
  try {
    console.log('📥 GET /api/deposit/records - 开始处理获取充值记录请求');
    
    // 获取查询参数
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const user = searchParams.get('user');
    const page = parseInt(searchParams.get('page') || '1');
    
    console.log(`📋 查询参数: limit=${limit}, user=${user}, page=${page}`);
    
    // 计算偏移量，用于分页
    const offset = (page - 1) * limit;
    
    // 创建Supabase客户端
    const supabase = await createClient();
    console.log('🔌 Supabase客户端创建成功');
    
    // 构建查询
    let query = supabase
      .from('deposit_records')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // 如果指定了用户地址
    if (user) {
      query = query.eq('user_address', user);
    }
    
    console.log(`🔍 执行查询: ${user ? `user_address=${user}` : '所有记录'}`);
    
    // 执行查询
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ 获取充值记录失败:', error);
      return NextResponse.json<DepositRecordsResponse>({
        success: false,
        error: `获取充值记录失败: ${error.message}`
      }, { status: 500 });
    }
    
    console.log(`✅ 查询成功，获取到 ${data?.length || 0} 条记录`);
    
    // 计算总计金额和总数
    let total_amount = 0;
    if (data) {
      total_amount = data.reduce((sum, record) => sum + record.amount, 0);
    }
    
    console.log(`📊 总计金额: ${total_amount}, 总记录数: ${data?.length || 0}`);
    
    // 返回数据
    return NextResponse.json<DepositRecordsResponse>({
      success: true,
      records: data as DepositRecord[],
      total_count: data?.length || 0,
      total_amount: total_amount
    }, { status: 200 });
  } catch (error: any) {
    // 返回请求处理错误响应
    console.error('❌ 处理充值历史记录请求失败:', error);
    return NextResponse.json<DepositRecordsResponse>({ 
      success: false,
      error: `获取充值历史记录失败: ${error.message}` 
    }, { status: 500 });
  }
}

/**
 * 添加充值记录API
 * 
 * POST /api/deposit/records
 * 
 * 请求体:
 * - user_address: 用户地址
 * - tx_hash: 交易哈希
 * - amount: 充值金额
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    console.log('📥 POST /api/deposit/records - 开始处理添加充值记录请求');
    
    const body = await request.json();
    console.log('📦 请求数据:', JSON.stringify(body, null, 2));
    
    const { user_address, tx_hash, amount } = body;
    
    // 验证必要参数
    if (!user_address || !tx_hash || amount === undefined) {
      console.error('❌ 参数验证失败:', { user_address, tx_hash, amount });
      return NextResponse.json({ 
        success: false, 
        error: '请提供必要的参数' 
      }, { status: 400 });
    }
    
    console.log('✅ 参数验证通过:', { user_address, tx_hash, amount });
    
    // 数据类型验证
    if (typeof user_address !== 'string' || typeof tx_hash !== 'string' || typeof amount !== 'number') {
      console.error('❌ 数据类型验证失败:', { 
        user_address_type: typeof user_address, 
        tx_hash_type: typeof tx_hash, 
        amount_type: typeof amount 
      });
      return NextResponse.json({ 
        success: false, 
        error: '参数类型错误' 
      }, { status: 400 });
    }
    
    console.log('✅ 数据类型验证通过');
    
    // 创建Supabase客户端
    const supabase = await createClient();
    console.log('🔌 Supabase客户端创建成功');
    
    // 数据转换（确保amount是bigint）
    const parsedAmount = BigInt(amount);
    console.log(`🔄 转换amount: ${amount} -> ${parsedAmount}`);
    
    // 构建插入数据
    const recordData = {
      user_address,
      tx_hash,
      amount: Number(parsedAmount), // 转回number，因为Supabase不直接支持BigInt
      created_at: new Date().toISOString()
    };
    
    console.log('📝 准备插入数据:', recordData);
    
    // 插入充值记录
    const { data, error } = await supabase
      .from('deposit_records')
      .insert(recordData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ 记录充值失败:', error);
      return NextResponse.json({ 
        success: false, 
        error: `记录充值失败: ${error.message}` 
      }, { status: 500 });
    }
    
    console.log('✅ 充值记录添加成功:', data);
    
    return NextResponse.json({ 
      success: true, 
      recordId: data.id,
      amount: amount
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('❌ 处理充值记录请求失败:', error, error.stack);
    return NextResponse.json({ 
      success: false, 
      error: `记录充值失败: ${error.message}` 
    }, { status: 500 });
  }
}
