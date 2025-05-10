import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * RESTful API Endpoint for Updating Auto-Renewal Status
 * 
 * @api {post} /api/subscription/auto-renew Update Auto-Renewal Status
 * @apiName UpdateAutoRenewal
 * @apiGroup Subscription
 * @apiVersion 1.0.0
 * 
 * @apiHeader {String} Authorization User's authentication token
 * 
 * @apiBody {String} subscription_id ID of the subscription to update
 * @apiBody {Boolean} auto_renew New auto-renewal status
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
 * @apiError (500) {String} error Error message for auto-renewal update failure
 * 
 * @apiExample {curl} Example usage:
 *     curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
 *     -d '{"subscription_id":"123","auto_renew":true}' \
 *     http://localhost:3000/api/subscription/auto-renew
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "subscription": {
 *         "id": "123",
 *         "auto_renew": true,
 *         ...
 *       }
 *     }
 */
export async function POST(request: Request) {
  console.log('📝 [API] Update auto-renewal status request started');
  
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
    const { subscription_id, auto_renew } = requestData;
    console.log(`📝 [API] Request parameters: subscription_id=${subscription_id}, auto_renew=${auto_renew}`);
    
    // Validate required parameters
    if (!subscription_id || auto_renew === undefined) {
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
      console.error('❌ [API] Error details:', JSON.stringify(checkError, null, 2));
      return NextResponse.json({
        success: false, 
        error: 'Unauthorized to access this subscription or subscription does not exist'
      }, { status: 403 });
    }
    
    console.log(`📝 [API] Subscription verified, ID=${subscription_id}, Current auto-renewal status=${existingSubscription.auto_renew}`);
    
    console.log(`📝 [API] Step 2: Updating auto-renewal status to ${auto_renew}`);
    // 2. Update auto-renewal status
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .update({ auto_renew })
      .eq('id', subscription_id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ [API] Failed to update auto-renewal status:', error);
      console.error('❌ [API] Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({
        success: false, 
        error: `Failed to update auto-renewal status: ${error.message}`
      }, { status: 500 });
    }
    
    console.log(`📝 [API] Auto-renewal status updated successfully, ID=${subscription.id}, New status=${subscription.auto_renew}`);
    console.log('✅ [API] Auto-renewal update successful, preparing response');
    
    return NextResponse.json({
      success: true,
      subscription: {
        ...subscription
      }
    });
    
  } catch (error: any) {
    console.error('❌ [API] Update auto-renewal status API error:', error);
    console.error('❌ [API] Error stack:', error.stack);
    return NextResponse.json({
      success: false, 
      error: `Update auto-renewal status API error: ${error.message}`
    }, { status: 500 });
  }
} 