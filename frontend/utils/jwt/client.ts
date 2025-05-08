// utils/jwt/client.ts (客户端版本)
import { JwtPayload } from './common';

export function parseJwt(jwt: string): JwtPayload {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      throw new Error("无效的JWT格式");
    }

    const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64Payload));

    return payload;
  } catch (error) {
    throw error;
  }
}