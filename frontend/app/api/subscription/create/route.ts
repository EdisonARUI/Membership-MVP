import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * RESTful API Endpoint for Creating Subscription
 * 
 * @api {post} /api/subscription/create Create New Subscription
 * @apiName CreateSubscription
 * @apiGroup Subscription
 * @apiVersion 1.0.0
 * 
 * @apiHeader {String} Authorization User's authentication token
 * 
 * @apiBody {String} plan_id ID of the subscription plan
 * @apiBody {String} tx_hash Transaction hash for payment verification
 * @apiBody {Boolean} [auto_renew] Whether to enable auto-renewal
 * @apiBody {String} [contract_object_id] Optional contract object ID
 * 
 * @apiSuccess {Boolean} success Indicates if the request was successful
 * @apiSuccess {Object} subscription Created subscription details
 * 
 * @apiError (400) {Boolean} success Always false
 * @apiError (400) {String} error Error message for missing parameters
 * 
 * @apiError (401) {Boolean} success Always false
 * @apiError (401) {String} error Unauthorized access message
 * 
 * @apiError (500) {Boolean} success Always false
 * @apiError (500) {String} error Error message for subscription creation failure
 * 
 * @apiExample {curl} Example usage:
 *     curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
 *     -d '{"plan_id":"123","tx_hash":"0x...","auto_renew":true}' \
 *     http://localhost:3000/api/subscription/create
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "subscription": {
 *         "id": "123",
 *         "plan_name": "Premium",
 *         "plan_period": "monthly",
 *         ...
 *       }
 *     }
 */
export async function POST(request: Request) {
  console.log('📝 [API] Create subscription request started');
  
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
    const { plan_id, tx_hash, auto_renew } = requestData;
    console.log(`📝 [API] Request parameters: plan_id=${plan_id}, tx_hash=${tx_hash?.substring(0, 8)}..., auto_renew=${auto_renew}`);
    
    // Validate required parameters
    if (!plan_id || !tx_hash) {
      console.log('❌ [API] Parameter validation failed: Missing required parameters');
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }
    
    const userId = user.id;
    console.log(`📝 [API] User ID: ${userId}`);
    
    console.log(`📝 [API] Step 1: Getting plan details plan_id=${plan_id}`);
    // 1. Get plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single();
    
    if (planError) {
      console.error('❌ [API] Failed to get plan details:', planError);
      console.error('❌ [API] Error details:', JSON.stringify(planError, null, 2));
      return NextResponse.json({
        success: false, 
        error: `Failed to get plan details: ${planError.message}`
      }, { status: 500 });
    }
    
    console.log(`📝 [API] Plan details retrieved: ${plan.name}, Price: ${plan.price}, Period: ${plan.period}`);
    
    console.log('📝 [API] Step 2: Calculating subscription dates');
    // 2. Calculate dates
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
    
    console.log(`📝 [API] Subscription dates: Start=${startDate.toISOString()}, End=${endDate.toISOString()}`);
    
    console.log('📝 [API] Step 3: Creating subscription record');
    // 3. Create subscription record
    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        plan_id,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        auto_renew: auto_renew === false ? false : true,
        contract_object_id: requestData.contract_object_id
      })
      .select()
      .single();
    
    if (subscriptionError) {
      console.error('❌ [API] Failed to create subscription record:', subscriptionError);
      console.error('❌ [API] Error details:', JSON.stringify(subscriptionError, null, 2));
      return NextResponse.json({
        success: false, 
        error: `Failed to create subscription record: ${subscriptionError.message}`
      }, { status: 500 });
    }
    
    console.log(`📝 [API] Subscription record created successfully: ID=${subscription.id}`);
    
    console.log('📝 [API] Step 4: Creating payment record');
    // 4. Create payment record
    const { error: paymentError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: userId,
        subscription_id: subscription.id,
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
    
    // 5. Return result
    console.log('✅ [API] Subscription created successfully, preparing response');
    return NextResponse.json({
      success: true,
      subscription: {
        ...subscription,
        plan_name: plan.name,
        plan_period: plan.period
      }
    });
    
  } catch (error: any) {
    console.error('❌ [API] Create subscription API error:', error);
    console.error('❌ [API] Error stack:', error.stack);
    return NextResponse.json({
      success: false, 
      error: `Create subscription API error: ${error.message}`
    }, { status: 500 });
  }
} 