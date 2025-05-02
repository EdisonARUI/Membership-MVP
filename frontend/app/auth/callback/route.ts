import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = requestUrl.searchParams.get("redirect") || "/";

  const url = new URL(request.url);
  const hashParams = url.hash ? new URLSearchParams(url.hash.substring(1)) : null;
  const idToken = hashParams?.get('id_token');

  if (code) {
    const supabase = await createClient();
    
    // 交换 code 获取 session
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error("授权错误:", error);
      return NextResponse.redirect(new URL("/?error=auth_failed", requestUrl.origin));
    }

    // 优先返回 id_token（JWT），否则用 provider_token
    const id_token = session?.provider_token;
    if (id_token) {
      // 重定向回原始页面，并带上 JWT
      return NextResponse.redirect(
        new URL(`${redirectTo}?id_token=${id_token}`, requestUrl.origin)
      );
    }
  }

  if (idToken) {
    const supabase = await createClient();
    
    // 使用ID令牌建立会话
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    
    if (error) {
      console.error("授权错误:", error);
      return NextResponse.redirect(new URL("/?error=auth_failed", requestUrl.origin));
    }

    const jwt = (data as any)?.id_token;
    if (jwt) {
      // 重定向回原始页面，并带上 JWT
      return NextResponse.redirect(
        new URL(`${redirectTo}?jwt=${jwt}`, requestUrl.origin)
      );
    }
  }

  // 如果没有 code 或 session，重定向到首页
  return NextResponse.redirect(new URL("/", requestUrl.origin));
}

