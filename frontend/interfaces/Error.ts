/**
 * Error handling interfaces and utilities
 * These interfaces standardize error handling throughout the application
 */

/**
 * Standard API error response structure
 * Used to normalize error responses from backend APIs
 */
export interface ApiError {
  /**
   * HTTP status code (e.g., 400, 404, 500)
   */
  status: number;
  
  /**
   * Error code identifier (e.g., "INVALID_INPUT", "NOT_FOUND")
   */
  code: string;
  
  /**
   * Human-readable error message
   */
  message: string;
  
  /**
   * Optional additional error information for debugging
   */
  details?: any;
}

/**
 * Application-specific error class
 * Extends the native Error class with additional properties
 */
export class AppError extends Error {
  /**
   * Error code identifier (e.g., "INVALID_INPUT", "NOT_FOUND")
   */
  code: string;
  
  /**
   * HTTP status code (e.g., 400, 404, 500)
   */
  status?: number;
  
  /**
   * Additional error information for debugging
   */
  details?: any;

  /**
   * Creates a new application error
   * 
   * @param message Human-readable error message
   * @param code Error code identifier (default: 'APP_ERROR')
   * @param status HTTP status code
   * @param details Additional error information
   */
  constructor(message: string, code: string = 'APP_ERROR', status?: number, details?: any) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
    this.name = 'AppError';
  }

  /**
   * Converts an API error to an application error
   * 
   * @param apiError API error response
   * @returns Application error instance
   */
  static fromApiError(apiError: ApiError): AppError {
    return new AppError(
      apiError.message,
      apiError.code,
      apiError.status,
      apiError.details
    );
  }
}
