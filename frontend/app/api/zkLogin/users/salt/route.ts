/**
 * API endpoint for retrieving or creating a zkLogin user salt.
 *
 * POST /api/zklogin/users/salt
 *
 * This endpoint fetches or creates a user salt from the Supabase database for zkLogin authentication.
 *
 * Features:
 * - Decodes JWT and validates required fields
 * - Checks for existing salt in the database, or generates and saves a new one
 * - Returns the salt value in the response
 * - Handles error and warning cases with appropriate status codes
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { parseJwt } from '@/utils/jwt/server';
import crypto from 'crypto';

/**
 * Request body for salt retrieval
 */
interface SaltRequestBody {
  jwt: string;
  keyClaimName?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const { jwt, keyClaimName = 'sub' }: SaltRequestBody = await req.json();
    
    if (!jwt) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameter: jwt' 
      }, { status: 400 });
    }
    
    // Decode JWT to get user info
    let decodedJwt;
    try {
      decodedJwt = parseJwt(jwt);
    } catch (error) {
      console.error('JWT decode failed:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'JWT decode failed, please provide a valid JWT token' 
      }, { status: 400 });
    }
    
    // Validate required fields in JWT
    if (!decodedJwt.sub || !decodedJwt.iss) {
      return NextResponse.json({ 
        success: false, 
        error: 'JWT missing required fields: sub and/or iss' 
      }, { status: 400 });
    }
    
    // Extract required info
    const provider = decodedJwt.iss;
    const providerUserId = decodedJwt.sub;
    const audience = Array.isArray(decodedJwt.aud) ? decodedJwt.aud[0] : decodedJwt.aud || '';
    
    // Create Supabase client
    const supabase = await createClient();
    
    // Check if user already has a salt in the database
    const { data: saltData, error: saltError } = await supabase
      .from('zklogin_user_salts')
      .select('salt')
      .eq('provider', provider)
      .eq('provider_user_id', providerUserId)
      .eq('audience', audience)
      .maybeSingle();
    
    if (saltError) {
      console.error('Failed to fetch salt from database:', saltError);
      return NextResponse.json({ 
        success: false, 
        error: `Database query error: ${saltError.message}` 
      }, { status: 500 });
    }
    
    // If salt found, return it
    if (saltData) {
      return NextResponse.json({
        success: true,
        salt: saltData.salt
      }, { status: 200 });
    }
    
    // If not found, generate a new salt (16 bytes = 128 bits)
    const randomBytes = crypto.randomBytes(16);
    let saltValue = '';
    for (let i = 0; i < randomBytes.length; i++) {
      saltValue += randomBytes[i].toString();
    }
    // Ensure salt does not exceed 128-bit integer max value
    const saltString = saltValue.substring(0, 38);
    
    // Get current user ID (if logged in)
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    if (!userId) {
      console.warn('User not logged in, cannot save salt to specific user');
    }
    
    // Save new salt to database
    const { error: insertError } = await supabase
      .from('zklogin_user_salts')
      .insert({
        user_id: userId || '00000000-0000-0000-0000-000000000000',
        provider,
        provider_user_id: providerUserId,
        audience,
        salt: saltString
      });
    
    if (insertError) {
      console.error('Failed to save salt to database:', insertError);
      // Return generated salt even if save fails
      console.warn('Returning unsaved temporary salt');
      return NextResponse.json({
        success: true,
        salt: saltString,
        warning: 'Salt could not be saved to the database and may differ on next request'
      }, { status: 200 });
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      salt: saltString
    }, { status: 200 });
  } catch (error: any) {
    console.error('Failed to get user salt:', error);
    // Return error response
    return NextResponse.json({ 
      success: false,
      error: `Failed to get user salt: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
} 