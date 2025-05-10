import { NextRequest, NextResponse } from 'next/server';
import { SuiService } from '@/utils/SuiService';

/**
 * Request body interface for address activation
 */
interface ActivateAddressRequest {
  address: string;
}

/**
 * RESTful API Endpoint for zkLogin Address Activation
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const { address }: ActivateAddressRequest = await req.json();
    
    if (!address) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameter: address' 
      }, { status: 400 });
    }
    
    // Activate the address
    await SuiService.activateAddress(address);
    
    // Return success response
    return NextResponse.json({ 
      success: true,
      message: 'Address activation request sent'
    }, { status: 200 });
  } catch (error: any) {
    console.error('Failed to activate address:', error);
    
    // Return error response
    return NextResponse.json({ 
      success: false,
      error: `Failed to activate address: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
} 