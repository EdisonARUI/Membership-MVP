import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { LotteryStats } from '@/interfaces/Lottery';

/**
 * 抽奖统计数据API
 * 
 * GET /api/lottery/stats
 * 
 * 查询参数:
 * - player: 指定玩家地址（可选，如不提供则返回全局统计）
 * - period: 统计周期（可选，支持 all/week/month/day，默认all）
 */
export async function GET(req: NextRequest): Promise<NextResponse<LotteryStats>> {
  try {
    // 获取查询参数
    const { searchParams } = new URL(req.url);
    const player = searchParams.get('player');
    const period = searchParams.get('period') || 'all';
    
    // 创建Supabase客户端
    const supabase = await createClient();
    
    // 构建时间范围条件
    let timeConstraint = '';
    const now = new Date();
    if (period === 'day') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      timeConstraint = `created_at >= '${today}'`;
    } else if (period === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      timeConstraint = `created_at >= '${weekStart.toISOString()}'`;
    } else if (period === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      timeConstraint = `created_at >= '${monthStart}'`;
    }
    
    // 获取总记录数
    let countQuery = supabase
      .from('lottery_records')
      .select('*', { count: 'exact' });
    
    // 根据条件筛选
    if (player) {
      countQuery = countQuery.eq('player_address', player);
    }
    
    if (timeConstraint) {
      countQuery = countQuery.filter('created_at', 'gte', timeConstraint);
    }
    
    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.error('获取统计数据失败:', countError);
      return NextResponse.json<LotteryStats>({
        success: false,
        error: `获取统计数据失败: ${countError.message}`
      }, { status: 500 });
    }
    
    // 获取中奖记录数
    let winCountQuery = supabase
      .from('lottery_records')
      .select('*', { count: 'exact' })
      .gt('win_amount', 0);
    
    if (player) {
      winCountQuery = winCountQuery.eq('player_address', player);
    }
    
    if (timeConstraint) {
      winCountQuery = winCountQuery.filter('created_at', 'gte', timeConstraint);
    }
    
    const { count: winCount, error: winCountError } = await winCountQuery;
    
    if (winCountError) {
      console.error('获取中奖统计数据失败:', winCountError);
    }
    
    // 获取总中奖金额
    let sumQuery = supabase
      .from('lottery_records')
      .select('win_amount');
    
    if (player) {
      sumQuery = sumQuery.eq('player_address', player);
    }
    
    if (timeConstraint) {
      sumQuery = sumQuery.filter('created_at', 'gte', timeConstraint);
    }
    
    const { data: sumData, error: sumError } = await sumQuery;
    
    if (sumError) {
      console.error('获取总中奖金额失败:', sumError);
    }
    
    // 手动计算总和
    const totalAmount = sumData 
      ? sumData.reduce((sum, record) => sum + (record.win_amount || 0), 0) 
      : 0;
    
    // 返回统计数据 (移除win_rate字段)
    return NextResponse.json<LotteryStats>({
      success: true,
      total_count: count || 0,
      total_amount: totalAmount,
      win_count: winCount || 0
    }, { status: 200 });
  } catch (error: any) {
    // 返回请求处理错误响应
    console.error('处理抽奖统计数据请求失败:', error);
    return NextResponse.json<LotteryStats>({ 
      success: false,
      error: `获取抽奖统计数据失败: ${error.message}` 
    }, { status: 500 });
  }
} 