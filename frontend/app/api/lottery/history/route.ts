import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { LotteryRecord, LotteryHistoryResponse } from '@/interfaces/Lottery';

/**
 * 抽奖历史记录API
 * 
 * GET /api/lottery/history
 * 
 * 查询参数:
 * - limit: 返回记录数量限制
 * - player: 指定玩家地址
 * - winners_only: 是否只返回中奖记录
 * - page: 分页页码（从1开始）
 */
export async function GET(req: NextRequest): Promise<NextResponse<LotteryHistoryResponse>> {
  try {
    // 获取查询参数
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const player = searchParams.get('player');
    const winnersOnly = searchParams.get('winners_only') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    
    // 计算偏移量，用于分页
    const offset = (page - 1) * limit;
    
    // 创建Supabase客户端
    const supabase = await createClient();
    
    // 构建查询
    let query = supabase
      .from('lottery_records')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
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
    
    // 返回数据
    return NextResponse.json<LotteryHistoryResponse>({
      success: true,
      records: data as LotteryRecord[],
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