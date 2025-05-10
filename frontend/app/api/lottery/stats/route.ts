import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { LotteryStats } from '@/interfaces/Lottery';

/**
 * RESTful API Endpoint for Lottery Statistics
 * 
 * @api {get} /api/lottery/stats Get Lottery Statistics
 * @apiName GetLotteryStats
 * @apiGroup Lottery
 * @apiVersion 1.0.0
 * 
 * @apiQuery {String} [player] Optional player address to get specific player stats
 * @apiQuery {String} [period] Time period for statistics (all/week/month/day, default: all)
 * 
 * @apiSuccess {Boolean} success Indicates if the request was successful
 * @apiSuccess {Number} total_count Total number of lottery records
 * @apiSuccess {Number} total_amount Total winning amount
 * @apiSuccess {Number} win_count Total number of winning records
 * 
 * @apiError (500) {Boolean} success Always false
 * @apiError (500) {String} error Error message for statistics retrieval failure
 * 
 * @apiExample {curl} Example usage:
 *     # Get global statistics
 *     curl -X GET http://localhost:3000/api/lottery/stats
 *     
 *     # Get player statistics for the last week
 *     curl -X GET "http://localhost:3000/api/lottery/stats?player=0x...&period=week"
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "total_count": 100,
 *       "total_amount": 5000,
 *       "win_count": 10
 *     }
 */
export async function GET(req: NextRequest): Promise<NextResponse<LotteryStats>> {
  try {
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const player = searchParams.get('player');
    const period = searchParams.get('period') || 'all';
    
    // Create Supabase client
    const supabase = await createClient();
    
    // Build time range constraint
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
    
    // Get total record count
    let countQuery = supabase
      .from('lottery_records')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (player) {
      countQuery = countQuery.eq('player_address', player);
    }
    
    if (timeConstraint) {
      countQuery = countQuery.filter('created_at', 'gte', timeConstraint);
    }
    
    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.error('Failed to get statistics:', countError);
      return NextResponse.json<LotteryStats>({
        success: false,
        error: `Failed to get statistics: ${countError.message}`
      }, { status: 500 });
    }
    
    // Get winning record count
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
      console.error('Failed to get winning statistics:', winCountError);
    }
    
    // Get total winning amount
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
      console.error('Failed to get total winning amount:', sumError);
    }
    
    // Calculate total amount manually
    const totalAmount = sumData 
      ? sumData.reduce((sum, record) => sum + (record.win_amount || 0), 0) 
      : 0;
    
    // Return statistics (removed win_rate field)
    return NextResponse.json<LotteryStats>({
      success: true,
      total_count: count || 0,
      total_amount: totalAmount,
      win_count: winCount || 0
    }, { status: 200 });
  } catch (error: any) {
    // Return error response
    console.error('Failed to process lottery statistics request:', error);
    return NextResponse.json<LotteryStats>({ 
      success: false,
      error: `Failed to get lottery statistics: ${error.message}` 
    }, { status: 500 });
  }
} 