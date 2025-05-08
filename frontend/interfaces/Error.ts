export interface ApiError {
  status: number;         // HTTP状态码
  code: string;           // 错误代码
  message: string;        // 错误消息
  details?: any;          // 错误详情
}

export class AppError extends Error {
  code: string;
  status?: number;
  details?: any;

  constructor(message: string, code: string = 'APP_ERROR', status?: number, details?: any) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
    this.name = 'AppError';
  }

  // 将API错误转换为应用错误
  static fromApiError(apiError: ApiError): AppError {
    return new AppError(
      apiError.message,
      apiError.code,
      apiError.status,
      apiError.details
    );
  }
}
