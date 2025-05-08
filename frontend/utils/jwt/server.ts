// utils/jwt/server.ts (服务器端版本)
import { JwtPayload } from './common';

export function parseJwt(jwt: string): JwtPayload {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      throw new Error("无效的JWT格式");
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload;
  } catch (error) {
    throw error;
  }
}