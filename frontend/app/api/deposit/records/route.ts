import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { DepositRecord, DepositRecordsResponse } from '@/interfaces/Deposit';

/**
 * RESTful API Endpoint for Deposit Records
 * 
 * @api {get} /api/deposit/records Get Deposit Records
 * @apiName GetDepositRecords
 * @apiGroup Deposit
 * @apiVersion 1.0.0
 * 
 * @apiQuery {Number} [limit=10] Number of records to return
 * @apiQuery {String} [user] Optional user address to filter records
 * @apiQuery {Number} [page=1] Page number for pagination (starts from 1)
 * 
 * @apiSuccess {Boolean} success Indicates if the request was successful
 * @apiSuccess {Array} records List of deposit records
 * @apiSuccess {Number} total_count Total number of records
 * @apiSuccess {Number} total_amount Total deposit amount
 * 
 * @apiError (500) {Boolean} success Always false
 * @apiError (500) {String} error Error message for records retrieval failure
 * 
 * @apiExample {curl} Example usage:
 *     # Get all records with default pagination
 *     curl -X GET http://localhost:3000/api/deposit/records
 *     
 *     # Get records for a specific user
 *     curl -X GET "http://localhost:3000/api/deposit/records?user=0x...&limit=20&page=1"
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "records": [
 *         {
 *           "user_address": "0x...",
 *           "tx_hash": "0x...",
 *           "amount": 100,
 *           "created_at": "2024-03-20T10:00:00Z"
 *         }
 *       ],
 *       "total_count": 1,
 *       "total_amount": 100
 *     }
 */
export async function GET(req: NextRequest): Promise<NextResponse<DepositRecordsResponse>> {
  try {
    console.log('📥 GET /api/deposit/records - Processing deposit records request');
    
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const user = searchParams.get('user');
    const page = parseInt(searchParams.get('page') || '1');
    
    console.log(`📋 Query parameters: limit=${limit}, user=${user}, page=${page}`);
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Create Supabase client
    const supabase = await createClient();
    console.log('🔌 Supabase client created successfully');
    
    // Build query
    let query = supabase
      .from('deposit_records')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Filter by user address if specified
    if (user) {
      query = query.eq('user_address', user);
    }
    
    console.log(`🔍 Executing query: ${user ? `user_address=${user}` : 'all records'}`);
    
    // Execute query
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Failed to get deposit records:', error);
      return NextResponse.json<DepositRecordsResponse>({
        success: false,
        error: `Failed to get deposit records: ${error.message}`
      }, { status: 500 });
    }
    
    console.log(`✅ Query successful, retrieved ${data?.length || 0} records`);
    
    // Calculate total amount and count
    let total_amount = 0;
    if (data) {
      total_amount = data.reduce((sum, record) => sum + record.amount, 0);
    }
    
    console.log(`📊 Total amount: ${total_amount}, Total records: ${data?.length || 0}`);
    
    // Return data
    return NextResponse.json<DepositRecordsResponse>({
      success: true,
      records: data as DepositRecord[],
      total_count: data?.length || 0,
      total_amount: total_amount
    }, { status: 200 });
  } catch (error: any) {
    // Return error response
    console.error('❌ Failed to process deposit records request:', error);
    return NextResponse.json<DepositRecordsResponse>({ 
      success: false,
      error: `Failed to get deposit records: ${error.message}` 
    }, { status: 500 });
  }
}

/**
 * RESTful API Endpoint for Creating Deposit Records
 * 
 * @api {post} /api/deposit/records Create Deposit Record
 * @apiName CreateDepositRecord
 * @apiGroup Deposit
 * @apiVersion 1.0.0
 * 
 * @apiBody {String} user_address User's wallet address
 * @apiBody {String} tx_hash Transaction hash for verification
 * @apiBody {Number} amount Deposit amount
 * 
 * @apiSuccess {Boolean} success Indicates if the request was successful
 * @apiSuccess {String} recordId ID of the created deposit record
 * @apiSuccess {Number} amount Deposit amount
 * 
 * @apiError (400) {Boolean} success Always false
 * @apiError (400) {String} error Error message for missing or invalid parameters
 * 
 * @apiError (500) {Boolean} success Always false
 * @apiError (500) {String} error Error message for record creation failure
 * 
 * @apiExample {curl} Example usage:
 *     curl -X POST -H "Content-Type: application/json" \
 *     -d '{"user_address":"0x...","tx_hash":"0x...","amount":100}' \
 *     http://localhost:3000/api/deposit/records
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 201 Created
 *     {
 *       "success": true,
 *       "recordId": "dep_123",
 *       "amount": 100
 *     }
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    console.log('📥 POST /api/deposit/records - Processing create deposit record request');
    
    const body = await request.json();
    console.log('📦 Request data:', JSON.stringify(body, null, 2));
    
    const { user_address, tx_hash, amount } = body;
    
    // Validate required parameters
    if (!user_address || !tx_hash || amount === undefined) {
      console.error('❌ Parameter validation failed:', { user_address, tx_hash, amount });
      return NextResponse.json({ 
        success: false, 
        error: 'Please provide all required parameters' 
      }, { status: 400 });
    }
    
    console.log('✅ Parameter validation passed:', { user_address, tx_hash, amount });
    
    // Validate data types
    if (typeof user_address !== 'string' || typeof tx_hash !== 'string' || typeof amount !== 'number') {
      console.error('❌ Data type validation failed:', { 
        user_address_type: typeof user_address, 
        tx_hash_type: typeof tx_hash, 
        amount_type: typeof amount 
      });
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid parameter types' 
      }, { status: 400 });
    }
    
    console.log('✅ Data type validation passed');
    
    // Create Supabase client
    const supabase = await createClient();
    console.log('🔌 Supabase client created successfully');
    
    // Convert amount to bigint
    const parsedAmount = BigInt(amount);
    console.log(`🔄 Converting amount: ${amount} -> ${parsedAmount}`);
    
    // Prepare record data
    const recordData = {
      user_address,
      tx_hash,
      amount: Number(parsedAmount), // Convert back to number for Supabase
      created_at: new Date().toISOString()
    };
    
    console.log('📝 Preparing to insert data:', recordData);
    
    // Insert deposit record
    const { data, error } = await supabase
      .from('deposit_records')
      .insert(recordData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Failed to create deposit record:', error);
      return NextResponse.json({ 
        success: false, 
        error: `Failed to create deposit record: ${error.message}` 
      }, { status: 500 });
    }
    
    console.log('✅ Deposit record created successfully:', data);
    
    return NextResponse.json({ 
      success: true, 
      recordId: data.id,
      amount: amount
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('❌ Failed to process deposit record request:', error, error.stack);
    return NextResponse.json({ 
      success: false, 
      error: `Failed to create deposit record: ${error.message}` 
    }, { status: 500 });
  }
}
