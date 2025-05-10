import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * RESTful API Endpoint for Subscription Status
 * 
 * @api {get} /api/subscription/status Get User Subscription Status
 * @apiName GetSubscriptionStatus
 * @apiGroup Subscription
 * @apiVersion 1.0.0
 * 
 * @apiHeader {String} Authorization User's authentication token
 * 
 * @apiSuccess {Boolean} success Indicates if the request was successful
 * @apiSuccess {Array} subscriptions List of user's subscriptions
 * @apiSuccess {Object} active_subscription Currently active subscription
 * 
 * @apiError (401) {Boolean} success Always false
 * @apiError (401) {String} error Unauthorized access message
 * 
 * @apiError (500) {Boolean} success Always false
 * @apiError (500) {String} error Error message for subscription status retrieval failure
 * 
 * @apiExample {curl} Example usage:
 *     curl -X GET -H "Authorization: Bearer <token>" http://localhost:3000/api/subscription/status
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "subscriptions": [...],
 *       "active_subscription": {...}
 *     }
 */
export async function GET(request: Request) {
  console.log('📝 [API] Subscription status query request started');
  
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
    
    const userId = user.id;
    console.log(`📝 [API] User information retrieved, userId=${userId}`);
    
    console.log(`📝 [API] Querying user subscription status, userId=${userId}`);
    // Get user subscription status
    const { data: subscriptions, error } = await supabase
      .from('user_subscription_status')
      .select('*')
      .eq('user_id', userId)
      .order('end_date', { ascending: false });
    
    console.log(`📝 [API] Query result: success=${!error}, subscription count=${subscriptions?.length || 0}`);
    
    if (error) {
      console.error('❌ [API] Failed to get subscription status:', error);
      console.error('❌ [API] Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({
        success: false, 
        error: `Failed to get subscription status: ${error.message}`
      }, { status: 500 });
    }
    
    // Find active subscription
    const activeSubscription = subscriptions?.find((sub: any) => sub.is_active);
    console.log(`📝 [API] Active subscription search result: ${activeSubscription ? 'Active subscription found' : 'No active subscription'}`);
    if (activeSubscription) {
      console.log(`📝 [API] Active subscription ID: ${activeSubscription.id}, Plan: ${activeSubscription.plan_name}`);
    }
    
    console.log('✅ [API] Successfully returned user subscription status data');
    return NextResponse.json({
      success: true,
      subscriptions,
      active_subscription: activeSubscription || null
    });
    
  } catch (error: any) {
    console.error('❌ [API] Subscription status API error:', error);
    console.error('❌ [API] Error stack:', error.stack);
    return NextResponse.json({
      success: false, 
      error: `Subscription status API error: ${error.message}`
    }, { status: 500 });
  }
} 