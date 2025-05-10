import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * RESTful API Endpoint for Canceling Subscription
 * 
 * @api {post} /api/subscription/cancel Cancel Subscription
 * @apiName CancelSubscription
 * @apiGroup Subscription
 * @apiVersion 1.0.0
 * 
 * @apiHeader {String} Authorization User's authentication token
 * 
 * @apiBody {String} subscription_id ID of the subscription to cancel
 * @apiBody {String} [tx_hash] Optional transaction hash for cancellation record
 * 
 * @apiSuccess {Boolean} success Indicates if the request was successful
 * @apiSuccess {Object} subscription Updated subscription details
 * 
 * @apiError (400) {Boolean} success Always false
 * @apiError (400) {String} error Error message for missing parameters
 * 
 * @apiError (401) {Boolean} success Always false
 * @apiError (401) {String} error Unauthorized access message
 * 
 * @apiError (403) {Boolean} success Always false
 * @apiError (403) {String} error Error message for unauthorized subscription access
 * 
 * @apiError (500) {Boolean} success Always false
 * @apiError (500) {String} error Error message for subscription cancellation failure
 * 
 * @apiExample {curl} Example usage:
 *     curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
 *     -d '{"subscription_id":"123","tx_hash":"0x..."}' \
 *     http://localhost:3000/api/subscription/cancel
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "subscription": {
 *         "id": "123",
 *         "status": "canceled",
 *         ...
 *       }
 *     }
 */
export async function POST(request: Request) {
  console.log('📝 [API] Cancel subscription request started');
  
  try {
    console.log('📝 [API] Creating Supabase client');
    // Create Supabase client
    const supabase = await createClient();
    
    console.log('📝 [API] Getting current user information');
    // Get current user information
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ [API] Unauthorized access: User not found');
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized access' 
      }, { status: 401 });
    }
    
    const requestData = await request.json();
    const { subscription_id, tx_hash } = requestData;
    console.log(`📝 [API] Request parameters: subscription_id=${subscription_id}, tx_hash=${tx_hash ? (tx_hash.substring(0, 8) + '...') : 'none'}`);
    
    // Validate required parameters
    if (!subscription_id) {
      console.log('❌ [API] Parameter validation failed: Missing required parameters');
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }
    
    const userId = user.id;
    console.log(`📝 [API] User ID: ${userId}`);
    
    console.log(`📝 [API] Step 1: Verifying subscription ownership, subscription_id=${subscription_id}`);
    // 1. Verify subscription ownership
    const { data: existingSubscription, error: checkError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .eq('user_id', userId)
      .single();
    
    console.log(`📝 [API] Verification result: success=${!checkError}, data=${existingSubscription ? 'found' : 'not found'}`);
    
    if (checkError || !existingSubscription) {
      console.error('❌ [API] Subscription ownership verification failed:', checkError);
      return NextResponse.json({
        success: false, 
        error: 'Unauthorized to access this subscription or subscription does not exist'
      }, { status: 403 });
    }
    
    console.log(`📝 [API] Subscription verified, ID=${subscription_id}, Current status=${existingSubscription.status}`);
    
    console.log('📝 [API] Step 2: Updating subscription status to canceled');
    // 2. Update subscription status
    const { data: subscription, error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'canceled',
        auto_renew: false
      })
      .eq('id', subscription_id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ [API] Failed to update subscription status:', updateError);
      console.error('❌ [API] Error details:', JSON.stringify(updateError, null, 2));
      return NextResponse.json({
        success: false, 
        error: `Failed to cancel subscription: ${updateError.message}`
      }, { status: 500 });
    }
    
    console.log(`📝 [API] Subscription status updated successfully, ID=${subscription.id}, New status=canceled`);
    
    // 3. Record transaction hash (if provided)
    if (tx_hash) {
      console.log('📝 [API] Step 3: Recording transaction hash');
      const { error: txError } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: userId,
          subscription_id: subscription_id,
          amount: 0,
          currency: 'USDT',
          status: 'completed',
          payment_method: 'crypto',
          transaction_hash: tx_hash
        });
      
      if (txError) {
        console.error('⚠️ [API] Failed to record transaction hash:', txError);
        console.error('⚠️ [API] Error details:', JSON.stringify(txError, null, 2));
        // Don't return error since subscription cancellation was successful
      } else {
        console.log('📝 [API] Transaction record created successfully');
      }
    }
    
    console.log('✅ [API] Subscription canceled successfully, preparing response');
    return NextResponse.json({
      success: true,
      subscription
    });
    
  } catch (error: any) {
    console.error('❌ [API] Cancel subscription API error:', error);
    console.error('❌ [API] Error stack:', error.stack);
    return NextResponse.json({
      success: false, 
      error: `Cancel subscription API error: ${error.message}`
    }, { status: 500 });
  }
} 