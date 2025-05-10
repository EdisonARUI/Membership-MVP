/**
 * API client utilities for making RESTful HTTP requests to backend endpoints.
 * Provides generic request and response handling, error management, and convenience methods for GET/POST/PUT/DELETE.
 *
 * Features:
 * - Generic API request function with error and JSON response handling
 * - Standardized ApiResponse type for all API calls
 * - Convenience methods for common HTTP verbs
 */
import { ApiError } from '../../interfaces/Error';

/**
 * Supported HTTP methods for API requests
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Options for making an API request
 */
interface RequestOptions {
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
}

/**
 * Standardized API response type
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * Makes a generic API request to the specified endpoint
 * Handles JSON parsing, error management, and response formatting
 *
 * @param endpoint - The API endpoint URL
 * @param options - Request options including method, headers, and body
 * @returns {Promise<ApiResponse<T>>} The API response
 */
export async function apiRequest<T>(
  endpoint: string, 
  options: RequestOptions
): Promise<ApiResponse<T>> {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const requestOptions: RequestInit = {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    };

    const response = await fetch(endpoint, requestOptions);
    
    // Get response text first
    const responseText = await response.text();
    
    // Check if response is JSON
    let data: any;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError: unknown) {
      // If response is not JSON, return error with raw response text
      const error = parseError as Error;
      return {
        success: false,
        error: {
          status: response.status,
          code: 'INVALID_JSON_RESPONSE',
          message: `Server returned a non-JSON response: ${error.message}`,
          details: { 
            responseText: responseText.substring(0, 500), // Limit size
            contentType: response.headers.get('content-type')
          }
        }
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: {
          status: response.status,
          code: data.code || 'UNKNOWN_ERROR',
          message: data.error || 'Unknown error occurred',
          details: data.details || { responseText }
        }
      };
    }

    return {
      success: true,
      data
    };
  } catch (error: any) {
    // Ensure error is fully captured and returned
    return {
      success: false,
      error: {
        status: 500,
        code: 'CLIENT_ERROR',
        message: error.message || 'Client side error occurred',
        details: { 
          originalError: error.toString(),
          stack: error.stack
        }
      }
    };
  }
}

/**
 * Convenience methods for common HTTP verbs (GET, POST, PUT, DELETE)
 */
export const api = {
  /**
   * Makes a GET request to the specified URL
   */
  get: <T>(url: string, headers?: Record<string, string>) => 
    apiRequest<T>(url, { method: 'GET', headers }),
  
  /**
   * Makes a POST request to the specified URL with optional body
   */
  post: <T>(url: string, body?: any, headers?: Record<string, string>) => 
    apiRequest<T>(url, { method: 'POST', body, headers }),
  
  /**
   * Makes a PUT request to the specified URL with optional body
   */
  put: <T>(url: string, body?: any, headers?: Record<string, string>) => 
    apiRequest<T>(url, { method: 'PUT', body, headers }),
  
  /**
   * Makes a DELETE request to the specified URL
   */
  delete: <T>(url: string, headers?: Record<string, string>) => 
    apiRequest<T>(url, { method: 'DELETE', headers })
};
