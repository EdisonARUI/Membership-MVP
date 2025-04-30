import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nonce } = body;
    
    // 添加带有hash的重定向参数，阻止自动重定向
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback-popup#noredirect`;
    
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          nonce,
          access_type: 'offline',
          prompt: 'consent',
        },
        // 禁用自动重定向
        skipBrowserRedirect: false,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ url: data.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
