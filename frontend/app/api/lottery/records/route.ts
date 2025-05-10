import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * RESTful API Endpoint for Lottery Records
 * 
 * @api {post} /api/lottery/records Create Lottery Record
 * @apiName CreateLotteryRecord
 * @apiGroup Lottery
 * @apiVersion 1.0.0
 * 
 * @apiBody {String} player_address Player's wallet address
 * @apiBody {String} tx_hash Transaction hash for verification
 * @apiBody {Number} [win_amount=0] Amount won in the lottery
 * 
 * @apiSuccess {Boolean} success Indicates if the request was successful
 * @apiSuccess {String} message Success message
 * 
 * @apiError (400) {Boolean} success Always false
 * @apiError (400) {String} error Error message for missing parameters
 * 
 * @apiError (500) {Boolean} success Always false
 * @apiError (500) {String} error Error message for record creation failure
 * 
 * @apiExample {curl} Example usage:
 *     curl -X POST -H "Content-Type: application/json" \
 *     -d '{"player_address":"0x...","tx_hash":"0x...","win_amount":100}' \
 *     http://localhost:3000/api/lottery/records
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 201 Created
 *     {
 *       "success": true,
 *       "message": "Lottery record saved"
 *     }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const { player_address, tx_hash, win_amount = 0 } = await req.json();
    
    // Input validation
    if (!player_address || !tx_hash) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters: player_address, tx_hash' 
      }, { status: 400 });
    }
    
    // Create Supabase client
    const supabase = await createClient();
    
    // Save lottery record
    const { error } = await supabase
      .from('lottery_records')
      .insert({
        player_address,
        tx_hash,
        win_amount
    });
    
    if (error) {
      console.error('Failed to save lottery record:', error);
      return NextResponse.json({ 
        success: false, 
        error: `Failed to save lottery record: ${error.message}` 
      }, { status: 500 });
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Lottery record saved'
    }, { status: 201 });  // Use 201 for resource creation success
  } catch (error: any) {
    // Return error response
    console.error('Failed to process lottery record request:', error);
    return NextResponse.json({ 
      success: false,
      error: `Failed to save lottery record: ${error.message}` 
    }, { status: 500 });
  }
} 