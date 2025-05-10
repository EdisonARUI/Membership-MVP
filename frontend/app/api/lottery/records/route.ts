import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * 记录抽奖结果API
 * 
 * POST /api/lottery/records
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
    }, { status: 201 });  // 使用201表示资源创建成功
  } catch (error: any) {
    // 返回请求处理错误响应
    console.error('处理抽奖记录请求失败:', error);
    return NextResponse.json({ 
      success: false,
      error: `保存抽奖记录失败: ${error.message}` 
    }, { status: 500 });
  }
} 