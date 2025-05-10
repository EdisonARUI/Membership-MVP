/**
 * API endpoint for obtaining zkLogin proofs from the Mysten Labs ZKP service.
 *
 * POST /api/zklogin/proofs
 *
 * This endpoint acts as a proxy to the Mysten Labs ZKP service, forwarding requests and handling CORS issues.
 *
 * Features:
 * - Validates required parameters for proof generation
 * - Implements in-memory caching for proof results
 * - Retries requests on rate limiting or server errors
 * - Returns proof data or error details in the response
 */
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { 
  PartialZkLoginSignature, 
  ZkProofRequestBody,
  ZkProofResponseData
} from '@/interfaces/ZkLogin';
import { ZKPROOF_URL } from '@/config/zklogin';

/**
 * Simple in-memory cache entry for proof results
 */
type CacheEntry = {
  timestamp: number;
  data: PartialZkLoginSignature;
};

// In-memory cache for proof results (valid only within the same instance)
const proofCache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Creates a cache key from proof request payload
 * @param payload - The proof request body
 * @returns {string} The cache key
 */
function createCacheKey(payload: ZkProofRequestBody): string {
  if (!payload.jwt || !payload.ephemeralPublicKey || !payload.userSalt) {
    throw new Error('Cannot create cache key: missing required parameters');
  }
  // Generate cache key from key parameters
  return `${payload.jwt.substring(0, 20)}_${payload.ephemeralPublicKey}_${payload.userSalt}_${payload.maxEpoch || 2}`;
}

/**
 * Makes a request with retries for rate limiting and server errors
 * @param url - The request URL
 * @param options - Axios request options
 * @param maxRetries - Maximum number of retries
 * @returns {Promise<any>} The response
 */
async function fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<any> {
  let lastError: any;
  let retryDelay = 1000; // Initial delay 1s
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retrying request (${attempt}/${maxRetries}) after ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
      return await axios(url, options);
    } catch (error: any) {
      lastError = error;
      // Retry on rate limiting (402/429) or server errors (5xx)
      const shouldRetry = 
        attempt < maxRetries && 
        error.response && 
        (error.response.status === 402 || 
         error.response.status === 429 || 
         error.response.status >= 500);
      if (!shouldRetry) {
        throw error;
      }
      console.log(`Encountered error (${error.response?.status}): ${error.message}. Retrying...`);
      // Exponential backoff
      retryDelay *= 2;
    }
  }
  throw lastError;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const zkpRequestPayload: ZkProofRequestBody = await req.json();
    console.log('Received ZKP request params:', JSON.stringify({
      jwt_length: zkpRequestPayload.jwt?.length || 0,
      ephemeralPublicKey: zkpRequestPayload.ephemeralPublicKey?.substring(0, 10) + '...',
      salt: zkpRequestPayload.userSalt?.substring(0, 10) + '...',
      maxEpoch: zkpRequestPayload.maxEpoch
    }));
    // Validate required parameters
    if (!zkpRequestPayload.jwt || !zkpRequestPayload.ephemeralPublicKey || !zkpRequestPayload.userSalt) {
      return NextResponse.json<ZkProofResponseData>({ 
        success: false,
        error: 'Missing required parameters: jwt, ephemeralPublicKey, userSalt' 
      }, { status: 400 });
    }
    let cacheKey: string;
    try {
      // Generate cache key
      cacheKey = createCacheKey(zkpRequestPayload);
      // Check in-memory cache
      const cachedResult = proofCache.get(cacheKey);
      if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_TTL) {
        console.log('Using cached ZKP result');
        // Construct safe response object
        const response: ZkProofResponseData = {
          success: true,
          proof: cachedResult.data,
          cached: true
        };
        return NextResponse.json(response, { status: 200 });
      }
    } catch (cacheError) {
      console.warn('Cache check failed:', cacheError);
      // Continue processing if cache fails
    }
    // Prepare request body for Mysten Labs ZKP service
    const requestBody = {
      jwt: zkpRequestPayload.jwt,
      extendedEphemeralPublicKey: zkpRequestPayload.ephemeralPublicKey,
      maxEpoch: zkpRequestPayload.maxEpoch || 2,
      jwtRandomness: zkpRequestPayload.jwtRandomness || '',
      salt: zkpRequestPayload.userSalt,
      keyClaimName: "sub"
    };
    // Forward request to Mysten Labs ZKP service
    console.log('Requesting Mysten Labs ZKP service');
    console.log('ZKPROOF_URL:', ZKPROOF_URL);
    console.log('Request params:', JSON.stringify(requestBody, (key, value) => 
      key === 'jwt' ? `${value.substring(0, 15)}...` : value
    ));
    // Use fetchWithRetry for robust requests
    const response = await fetchWithRetry(ZKPROOF_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000,
      data: requestBody
    }, 3);
    console.log('ZKP service response status:', response.status);
    console.log('ZKP service response headers:', JSON.stringify(response.headers));
    // Get response data
    const rawProofResponse = response.data;
    console.log('ZKP service response data keys:', Object.keys(rawProofResponse));
    // Validate proofPoints structure
    if (!rawProofResponse.proofPoints || 
        !Array.isArray(rawProofResponse.proofPoints.a) || 
        !Array.isArray(rawProofResponse.proofPoints.b) || 
        !Array.isArray(rawProofResponse.proofPoints.c)) {
      throw new Error("ZKP service returned invalid proofPoints structure");
    }
    // Convert structure to frontend expected format
    const proofResponse: PartialZkLoginSignature = {
      inputs: {
        proofPoints: rawProofResponse.proofPoints,
        issBase64Details: rawProofResponse.issBase64Details,
        headerBase64: rawProofResponse.headerBase64
      },
      maxEpoch: zkpRequestPayload.maxEpoch || 2
    };
    // Validate response format
    if (proofResponse && proofResponse.inputs) {
      // Log key fields for debugging
      console.log("Converted ZKP service key fields:", {
        hasProofPoints: !!proofResponse.inputs.proofPoints,
        hasIssBase64Details: !!proofResponse.inputs.issBase64Details,
        hasHeaderBase64: !!proofResponse.inputs.headerBase64,
        maxEpoch: proofResponse.maxEpoch
      });
      // Store result in in-memory cache
      cacheKey = createCacheKey(zkpRequestPayload);
      proofCache.set(cacheKey, {
        timestamp: Date.now(),
        data: proofResponse
      });
    }
    // Construct safe response object
    const apiResponse: ZkProofResponseData = {
      success: true,
      proof: proofResponse
    };
    // Return success response
    return NextResponse.json(apiResponse, { status: 200 });
  } catch (error: any) {
    console.error('Failed to get ZKP:', error);
    // Enhanced error logging
    if (error.response) {
      console.error('ZKP service response status:', error.response.status);
      console.error('ZKP service response headers:', JSON.stringify(error.response.headers));
      console.error('ZKP service response data:', JSON.stringify(error.response.data));
    } else if (error.request) {
      console.error('No response from ZKP service, request info:', error.request);
    } else {
      console.error('Request config error:', error.config);
    }
    // Check for API error
    if (error.response) {
      // Rate limiting error
      if (error.response.status === 402 || error.response.status === 429) {
        return NextResponse.json<ZkProofResponseData>({ 
          success: false,
          error: `ZKP service request rate too high, please try again later`,
          details: error.response.data
        }, { status: 429 });
      }
      // Server returned error status code
      return NextResponse.json<ZkProofResponseData>({ 
        success: false,
        error: `ZKP service returned error: ${error.response.status} ${error.response.statusText}`,
        details: error.response.data
      }, { status: error.response.status });
    }
    // Network or other error
    return NextResponse.json<ZkProofResponseData>({ 
      success: false,
      error: `Failed to get ZKP: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
} 