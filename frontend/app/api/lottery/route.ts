import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { LotteryRecord, LotteryHistoryResponse } from '@/interfaces/Lottery';

/**
 * 抽奖历史记录API
 * 
 * GET /api/lottery
 * 
 * 查询参数:
 * - limit: 返回记录数量限制
 * - player: 指定玩家地址
 * - winners_only: 是否只返回中奖记录
 */
export async function GET(req: NextRequest): Promise<NextResponse<LotteryHistoryResponse>> {
  try {
    // 获取查询参数
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const player = searchParams.get('player');
    const winnersOnly = searchParams.get('winners_only') === 'true';
    
    // 创建Supabase客户端
    const supabase = await createClient();
    
    // 构建查询
    let query = supabase
      .from('lottery_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    // 如果指定了玩家地址
    if (player) {
      query = query.eq('player_address', player);
    }
    
    // 如果只查询中奖记录
    if (winnersOnly) {
      query = query.gt('win_amount', 0);
    }
    
    // 执行查询
    const { data, error } = await query;
    
    if (error) {
      console.error('获取抽奖记录失败:', error);
      return NextResponse.json<LotteryHistoryResponse>({
        success: false,
        error: `获取抽奖记录失败: ${error.message}`
      }, { status: 500 });
    }
    
    // 获取统计数据 - 修改为正确的Supabase查询语法
    const { count, error: countError } = await supabase
      .from('lottery_records')
      .select('*', { count: 'exact' })
      .eq(player ? 'player_address' : 'id', player || '00000000-0000-0000-0000-000000000000')
      .or(player ? '' : 'id.neq.00000000-0000-0000-0000-000000000000');
    
    // 获取总金额
    const { data: sumData, error: sumError } = await supabase
      .rpc('sum_win_amount', { 
        player_filter: player || null 
      });
    
    if (countError) {
      console.error('获取统计数据失败:', countError);
    }
    
    if (sumError) {
      console.error('获取总金额失败:', sumError);
    }
    
    // 返回数据 - 使用正确的字段访问方式
    return NextResponse.json<LotteryHistoryResponse>({
      success: true,
      records: data as LotteryRecord[],
      total_count: count || 0,
      total_amount: (sumData as number) || 0
    }, { status: 200 });
  } catch (error: any) {
    // 返回请求处理错误响应
    console.error('处理抽奖历史记录请求失败:', error);
    return NextResponse.json<LotteryHistoryResponse>({ 
      success: false,
      error: `获取抽奖历史记录失败: ${error.message}` 
    }, { status: 500 });
  }
}

/**
 * 记录抽奖结果API
 * 
 * POST /api/lottery
 * 
 * 请求体:
 * - player_address: 玩家地址
 * - tx_hash: 交易哈希
 * - win_amount: 中奖金额
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 解析请求体
    const { player_address, tx_hash, win_amount = 0 } = await req.json();
    
    // 输入验证
    if (!player_address || !tx_hash) {
      return NextResponse.json({ 
        success: false, 
        error: '缺少必要参数: player_address, tx_hash' 
      }, { status: 400 });
    }
    
    // 创建Supabase客户端
    const supabase = await createClient();
    
    // 保存抽奖记录
    const { error } = await supabase
      .from('lottery_records')
      .insert({
        player_address,
        tx_hash,
        win_amount
    });
    
    if (error) {
      console.error('保存抽奖记录失败:', error);
      return NextResponse.json({ 
        success: false, 
        error: `保存抽奖记录失败: ${error.message}` 
      }, { status: 500 });
    }
    
    // 返回成功响应
    return NextResponse.json({
      success: true,
      message: '抽奖记录已保存'
    }, { status: 200 });
  } catch (error: any) {
    // 返回请求处理错误响应
    console.error('处理抽奖记录请求失败:', error);
    return NextResponse.json({ 
      success: false,
      error: `保存抽奖记录失败: ${error.message}` 
    }, { status: 500 });
  }
} 