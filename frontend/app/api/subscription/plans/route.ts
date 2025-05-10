import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * RESTful API Endpoint for Subscription Plans
 * 
 * @api {get} /api/subscription/plans Get Subscription Plans
 * @apiName GetSubscriptionPlans
 * @apiGroup Subscription
 * @apiVersion 1.0.0
 * 
 * @apiQuery {String} [plan_id] Optional plan ID to get specific plan details
 * 
 * @apiSuccess {Boolean} success Indicates if the request was successful
 * @apiSuccess {Object} [plan] Single plan details when plan_id is provided
 * @apiSuccess {Array} [plans] List of all plans when no plan_id is provided
 * 
 * @apiError (500) {Boolean} success Always false
 * @apiError (500) {String} error Error message for plan retrieval failure
 * 
 * @apiExample {curl} Example usage:
 *     # Get all plans
 *     curl -X GET http://localhost:3000/api/subscription/plans
 *     
 *     # Get specific plan
 *     curl -X GET http://localhost:3000/api/subscription/plans?plan_id=123
 * 
 * @apiSuccessExample {json} Success-Response (All Plans):
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "plans": [...]
 *     }
 * 
 * @apiSuccessExample {json} Success-Response (Single Plan):
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "plan": {...}
 *     }
 */
export async function GET(request: Request) {
  console.log('📝 [API] Subscription plans request started');
  
  try {
    console.log('📝 [API] Creating Supabase client');
    const supabase = await createClient();
    
    const url = new URL(request.url);
    const planId = url.searchParams.get('plan_id');
    console.log(`📝 [API] Parsed request parameters: plan_id=${planId || 'not specified'}`);
    
    // Query based on whether plan_id parameter is present
    if (planId) {
      console.log(`📝 [API] Querying single plan: ${planId}`);
      // Query single plan
      const { data: plan, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();
      
      console.log(`📝 [API] Query result: success=${!error}, data=${plan ? 'retrieved' : 'not found'}`);
      
      if (error) {
        console.error('❌ [API] Failed to get plan details:', error);
        console.error('❌ [API] Error details:', JSON.stringify(error, null, 2));
        return NextResponse.json({
          success: false, 
          error: `Failed to get plan details: ${error.message}`
        }, { status: 500 });
      }
      
      // Process features field
      console.log('📝 [API] Processing plan features field');
      const formattedPlan = {
        ...plan,
        features: typeof plan.features === 'string' 
          ? JSON.parse(plan.features) 
          : plan.features
      };
      
      console.log('✅ [API] Successfully returned single plan data');
      return NextResponse.json({
        success: true,
        plan: formattedPlan
      });
    } else {
      console.log('📝 [API] Querying all plans');
      console.log('Environment URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('Attempting to query all plans...');
      const { data, error, status } = await supabase.from('subscription_plans').select('*');
      console.log('Query status:', status);
      console.log('Query error:', error);
      console.log('Query data:', data);
      
      if (error) {
        console.error('❌ [API] Failed to get plan list:', error);
        console.error('❌ [API] Error details:', JSON.stringify(error, null, 2));
        return NextResponse.json({
          success: false, 
          error: `Failed to get plan list: ${error.message}`
        }, { status: 500 });
      }
      
      // Process features field for each plan
      console.log('📝 [API] Processing features field for all plans');
      const formattedPlans = data.map((plan: any) => ({
        ...plan,
        features: typeof plan.features === 'string' 
          ? JSON.parse(plan.features) 
          : plan.features
      }));
      
      console.log('✅ [API] Successfully returned all plans data');
      return NextResponse.json({
        success: true,
        plans: formattedPlans
      });
    }
  } catch (error: any) {
    console.error('❌ [API] Subscription plans API error:', error);
    console.error('❌ [API] Error stack:', error.stack);
    return NextResponse.json({
      success: false, 
      error: `Subscription plans API error: ${error.message}`
    }, { status: 500 });
  }
} 