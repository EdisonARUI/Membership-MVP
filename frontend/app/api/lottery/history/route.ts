import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { LotteryRecord, LotteryHistoryResponse } from '@/interfaces/Lottery';

/**
 * RESTful API Endpoint for Lottery History
 * 
 * @api {get} /api/lottery/history Get Lottery History
 * @apiName GetLotteryHistory
 * @apiGroup Lottery
 * @apiVersion 1.0.0
 * 
 * @apiQuery {Number} [limit=10] Number of records to return
 * @apiQuery {String} [player] Optional player address to filter records
 * @apiQuery {Boolean} [winners_only=false] Whether to return only winning records
 * @apiQuery {Number} [page=1] Page number for pagination (starts from 1)
 * 
 * @apiSuccess {Boolean} success Indicates if the request was successful
 * @apiSuccess {Array} records List of lottery records
 * 
 * @apiError (500) {Boolean} success Always false
 * @apiError (500) {String} error Error message for history retrieval failure
 * 
 * @apiExample {curl} Example usage:
 *     # Get all records with default pagination
 *     curl -X GET http://localhost:3000/api/lottery/history
 *     
 *     # Get winning records for a specific player
 *     curl -X GET "http://localhost:3000/api/lottery/history?player=0x...&winners_only=true&limit=20&page=1"
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "records": [
 *         {
 *           "player_address": "0x...",
 *           "tx_hash": "0x...",
 *           "win_amount": 100,
 *           "created_at": "2024-03-20T10:00:00Z"
 *         }
 *       ]
 *     }
 */
export async function GET(req: NextRequest): Promise<NextResponse<LotteryHistoryResponse>> {
  try {
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const player = searchParams.get('player');
    const winnersOnly = searchParams.get('winners_only') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Create Supabase client
    const supabase = await createClient();
    
    // Build query
    let query = supabase
      .from('lottery_records')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Filter by player address if specified
    if (player) {
      query = query.eq('player_address', player);
    }
    
    // Filter winning records if requested
    if (winnersOnly) {
      query = query.gt('win_amount', 0);
    }
    
    // Execute query
    const { data, error } = await query;
    
    if (error) {
      console.error('Failed to get lottery records:', error);
      return NextResponse.json<LotteryHistoryResponse>({
        success: false,
        error: `Failed to get lottery records: ${error.message}`
      }, { status: 500 });
    }
    
    // Return data
    return NextResponse.json<LotteryHistoryResponse>({
      success: true,
      records: data as LotteryRecord[],
    }, { status: 200 });
  } catch (error: any) {
    // Return error response
    console.error('Failed to process lottery history request:', error);
    return NextResponse.json<LotteryHistoryResponse>({ 
      success: false,
      error: `Failed to get lottery history: ${error.message}` 
    }, { status: 500 });
  }
} 