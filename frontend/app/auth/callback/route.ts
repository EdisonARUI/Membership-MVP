import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString();

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.session) {
      // 检查是否有OAuth提供商的访问令牌
      if (data.session.provider_token) {
        // 获取用户信息，包括Google JWT
        const jwt = data.session.provider_token;
        
        // 重定向到个人资料页面，并附加JWT
        return NextResponse.redirect(`${origin}/profile?jwt=${jwt}`);
      }
    }
  }

  if (redirectTo) {
    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  // 默认重定向到个人资料页面
  return NextResponse.redirect(`${origin}/profile`);
}
