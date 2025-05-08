import { ApiError } from '../../interfaces/Error';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

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
    
    // 先获取响应文本
    const responseText = await response.text();
    
    // 检查响应是否为JSON
    let data: any;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError: unknown) {
      // 如果响应不是JSON格式，返回具有原始响应文本的错误
      const error = parseError as Error;
      return {
        success: false,
        error: {
          status: response.status,
          code: 'INVALID_JSON_RESPONSE',
          message: `服务器返回了非JSON响应: ${error.message}`,
          details: { 
            responseText: responseText.substring(0, 500), // 限制大小
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
    // 确保错误被完整捕获和返回
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

// 常用方法封装
export const api = {
  get: <T>(url: string, headers?: Record<string, string>) => 
    apiRequest<T>(url, { method: 'GET', headers }),
    
  post: <T>(url: string, body?: any, headers?: Record<string, string>) => 
    apiRequest<T>(url, { method: 'POST', body, headers }),
    
  put: <T>(url: string, body?: any, headers?: Record<string, string>) => 
    apiRequest<T>(url, { method: 'PUT', body, headers }),
    
  delete: <T>(url: string, headers?: Record<string, string>) => 
    apiRequest<T>(url, { method: 'DELETE', headers })
};
