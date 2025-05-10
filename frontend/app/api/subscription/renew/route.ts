import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * RESTful API Endpoint for Subscription Renewal
 * 
 * @api {post} /api/subscription/renew Renew Subscription
 * @apiName RenewSubscription
 * @apiGroup Subscription
 * @apiVersion 1.0.0
 * 
 * @apiHeader {String} Authorization User's authentication token
 * 
 * @apiBody {String} subscription_id ID of the subscription to renew
 * @apiBody {String} tx_hash Transaction hash for payment verification
 * 
 * @apiSuccess {Boolean} success Indicates if the request was successful
 * @apiSuccess {Object} subscription Updated subscription details
 * @apiSuccess {String} subscription.plan_name Name of the subscription plan
 * @apiSuccess {String} subscription.plan_period Period of the subscription plan
 * 
 * @apiError (401) {Boolean} success Always false
 * @apiError (401) {String} error Error message for unauthorized access
 * 
 * @apiError (400) {Boolean} success Always false
 * @apiError (400) {String} error Error message for missing parameters
 * 
 * @apiError (403) {Boolean} success Always false
 * @apiError (403) {String} error Error message for subscription ownership validation failure
 * 
 * @apiError (500) {Boolean} success Always false
 * @apiError (500) {String} error Error message for subscription renewal failure
 * 
 * @apiExample {curl} Example usage:
 *     curl -X POST -H "Authorization: Bearer <token>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"subscription_id":"sub_123","tx_hash":"0x..."}' \
 *     http://localhost:3000/api/subscription/renew
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "subscription": {
 *         "id": "sub_123",
 *         "status": "active",
 *         "start_date": "2024-03-20T10:00:00Z",
 *         "end_date": "2024-04-20T10:00:00Z",
 *         "plan_name": "Premium",
 *         "plan_period": "monthly"
 *       }
 *     }
 */
export async function POST(request: Request) {
  console.log('📝 [API] Subscription renewal request started');
  
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
    console.log(`📝 [API] Request parameters: subscription_id=${subscription_id}, tx_hash=${tx_hash?.substring(0, 8)}...`);
    
    // Validate required parameters
    if (!subscription_id || !tx_hash) {
      console.log('❌ [API] Parameter validation failed: Missing required parameters');
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }
    
    const userId = user.id;
    console.log(`📝 [API] User ID: ${userId}`);
    
    console.log(`📝 [API] Step 1: Validating subscription ownership, subscription_id=${subscription_id}`);
    // 1. Verify if the subscription belongs to the current user
    const { data: existingSubscription, error: checkError } = await supabase
      .from('user_subscriptions')
      .select('*, subscription_plans!inner(*)')
      .eq('id', subscription_id)
      .eq('user_id', userId)
      .single();
    
    if (checkError || !existingSubscription) {
      console.error('❌ [API] Subscription ownership validation failed:', checkError);
      return NextResponse.json({
        success: false, 
        error: 'No permission to operate this subscription or subscription does not exist'
      }, { status: 403 });
    }
    
    console.log(`📝 [API] Subscription validation passed, ID=${subscription_id}, Plan=${existingSubscription.subscription_plans.name}`);
    
    console.log('📝 [API] Step 2: Calculating new expiration date');
    // 2. Calculate new expiration date
    const plan = existingSubscription.subscription_plans;
    const startDate = new Date();
    const endDate = new Date();
    
    switch (plan.period) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }
    
    console.log(`📝 [API] New subscription dates: start=${startDate.toISOString()}, end=${endDate.toISOString()}`);
    
    console.log('📝 [API] Step 3: Updating subscription status');
    // 3. Update subscription status
    const { data: subscription, error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      })
      .eq('id', subscription_id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ [API] Failed to update subscription status:', updateError);
      console.error('❌ [API] Error details:', JSON.stringify(updateError, null, 2));
      return NextResponse.json({
        success: false, 
        error: `Failed to update subscription status: ${updateError.message}`
      }, { status: 500 });
    }
    
    console.log(`📝 [API] Subscription status updated successfully, ID=${subscription.id}, New status=active`);
    
    console.log('📝 [API] Step 4: Creating payment record');
    // 4. Create payment record
    const { error: paymentError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: userId,
        subscription_id: subscription_id,
        amount: plan.price,
        currency: 'USDT',
        status: 'completed',
        payment_method: 'crypto',
        transaction_hash: tx_hash
      });
    
    if (paymentError) {
      console.error('❌ [API] Failed to create payment record:', paymentError);
      console.error('❌ [API] Error details:', JSON.stringify(paymentError, null, 2));
      return NextResponse.json({
        success: false, 
        error: `Failed to create payment record: ${paymentError.message}`
      }, { status: 500 });
    }
    
    console.log('📝 [API] Payment record created successfully');
    console.log('✅ [API] Subscription renewal successful, preparing response');
    
    return NextResponse.json({
      success: true,
      subscription: {
        ...subscription,
        plan_name: plan.name,
        plan_period: plan.period
      }
    });
    
  } catch (error: any) {
    console.error('❌ [API] Subscription renewal API error:', error);
    console.error('❌ [API] Error stack trace:', error.stack);
    return NextResponse.json({
      success: false, 
      error: `Subscription renewal API error: ${error.message}`
    }, { status: 500 });
  }
} 