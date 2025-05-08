// utils/jwt/common.ts (共享类型)
export interface JwtPayload {
    iss?: string;
    sub?: string;
    aud?: string[] | string;
    exp?: number;
    iat?: number;
    [key: string]: any;
  }