"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { parseJwt } from "@/utils/jwt/server";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  } else {
    return encodedRedirect(
      "success",
      "/sign-up",
      "Thanks for signing up! Please check your email for a verification link.",
    );
  }
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect("/");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signInWithGoogleAction = async (formData: FormData) => {
  const nonce = formData.get("nonce") as string;
  
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      queryParams: {
        nonce,
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    return redirect('/sign-up?error=' + encodeURIComponent(error.message));
  }

  return redirect(data.url);
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};

export async function saveUserWithWalletAddress(userId: string, walletAddress: string) {
  console.log("=== 开始保存钱包地址 ===");
  console.log("用户ID:", userId);
  console.log("钱包地址:", walletAddress);
  
  // 验证输入参数
  if (!userId || !walletAddress) {
    console.error("无效的参数: userId或walletAddress为空");
    return { success: false, error: "无效的参数" };
  }
  
  // 确保userId是UUID格式
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    console.error("用户ID不是有效的UUID格式:", userId);
    return { success: false, error: "用户ID格式错误" };
  }
  
  const supabase = await createClient();
  console.log("Supabase客户端创建成功");
  
  try {
    // 不尝试查询auth.users表，这可能需要特殊权限
    // 直接检查user_wallets表中是否存在记录
    
    // 检查是否已存在记录
    const { data: existingData, error: checkError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('wallet_type', 'zklogin');
    
    if (checkError) {
      console.error("检查现有记录失败:", checkError);
    } else {
      console.log("现有记录检查结果:", existingData);
    }
    
    let saveResult;
    
    // 如果存在记录，尝试更新
    if (existingData && existingData.length > 0) {
      console.log("找到现有记录，尝试更新...");
      const { data: updateData, error: updateError } = await supabase
        .from('user_wallets')
        .update({ 
          wallet_address: walletAddress, 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('wallet_type', 'zklogin')
        .select();

      if (updateError) {
        console.error("更新记录失败:", updateError);
        return { success: false, error: updateError.message };
      } else {
        console.log("记录更新成功:", updateData);
        return { success: true, data: updateData };
      }
    } 
    // 如果不存在记录，尝试插入
    else {
      console.log("未找到现有记录，尝试插入新记录...");
      
      // 使用upsert操作，确保即使有并发操作也不会出错
      const { data: upsertData, error: upsertError } = await supabase
        .from('user_wallets')
        .upsert({
          user_id: userId,
          wallet_address: walletAddress,
          wallet_type: 'zklogin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
        
      if (upsertError) {
        console.error("插入/更新记录失败:", upsertError);
        
        // 如果是外键约束错误，可能是user_id不存在
        if (upsertError.code === 'foreign_key_violation' || 
            upsertError.message?.includes('foreign key constraint')) {
          return { 
            success: false, 
            error: "用户ID不存在，无法保存钱包地址",
            details: upsertError.message
          };
        }
        
        return { success: false, error: upsertError.message };
      } else {
        console.log("新记录插入成功:", upsertData);
        return { success: true, data: upsertData };
      }
    }
  } catch (error: any) {
    console.error("处理钱包地址时发生错误:", error);
    return { success: false, error: error.message };
  }
}

// 检查钱包地址是否保存成功
export async function checkWalletAddressSaved(userId: string) {
  console.log("检查用户钱包地址是否已保存:", userId);
  
  if (!userId) {
    return { saved: false, error: "用户ID不能为空" };
  }
  
  const supabase = await createClient();
  
  try {
    // 直接查询数据库
    const { data, error } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      console.error("查询钱包地址失败:", error);
      return { saved: false, error: error.message };
    }
    
    console.log("查询到的钱包地址:", data);
    
    return {
      saved: data && data.length > 0,
      data: data,
      count: data ? data.length : 0
    };
  } catch (error: any) {
    console.error("检查钱包地址时发生错误:", error);
    return { saved: false, error: error.message };
  }
}

// 检查数据库RLS权限
export async function checkDatabasePermissions() {
  console.log("检查数据库权限...");
  
  const supabase = await createClient();
  const results: any = {};
  
  // 检查user_wallets表
  try {
    console.log("尝试读取 user_wallets 表...");
    const { data, error } = await supabase
      .from('user_wallets')
      .select('id, user_id, wallet_type')
      .limit(1);
      
    if (error) {
      console.error("读取 user_wallets 失败:", error);
      results['user_wallets'] = { success: false, error: error.message };
    } else {
      console.log("成功读取 user_wallets:", data);
      results['user_wallets'] = { success: true, data };
    }
  } catch (error: any) {
    console.error("访问 user_wallets 时发生错误:", error);
    results['user_wallets'] = { success: false, error: error.message };
  }
  
  // 检查数据库可写权限
  try {
    console.log("检查表写入权限...");
    // 尝试执行占位插入（不会真正插入数据）
    const testId = '00000000-0000-0000-0000-000000000000'; // 使用不会与真实数据冲突的ID
    const { error } = await supabase
      .from('user_wallets')
      .insert({
        user_id: testId,
        wallet_address: 'test_write_permission',
        wallet_type: 'test'
      });
    
    if (error) {
      // 如果是外键约束错误，说明有写入权限但测试ID不存在
      // 如果是权限错误，说明没有写入权限
      if (error.code === 'foreign_key_violation') {
        console.log("有写入权限，但测试ID不存在于auth.users表中");
        results['write_permission'] = { 
          success: true, 
          message: "有写入权限，但需要有效的用户ID"
        };
      } else if (error.code === '42501' || error.message?.includes('permission denied')) {
        console.error("没有写入权限:", error);
        results['write_permission'] = { 
          success: false, 
          error: "没有写入权限"
        };
      } else {
        console.error("测试写入权限时发生错误:", error);
        results['write_permission'] = { 
          success: false, 
          error: error.message 
        };
      }
    } else {
      console.log("成功测试写入权限");
      results['write_permission'] = { success: true };
    }
  } catch (error: any) {
    console.error("测试写入权限时发生错误:", error);
    results['write_permission'] = { success: false, error: error.message };
  }
  
  return results;
}

// zkLogin相关函数
export async function getUserSalt(jwt: string) {
  console.log("开始获取用户盐值");
  
  if (!jwt) {
    console.error("JWT为空，无法获取盐值");
    return { success: false, error: "JWT不能为空" };
  }
  
  try {
    // 调用内部API获取盐值
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/zkLogin/salt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jwt }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("获取用户盐值失败:", errorData);
      return { 
        success: false, 
        error: errorData.error || `请求失败：${response.status} ${response.statusText}`
      };
    }
    
    const data = await response.json();
    console.log("成功获取用户盐值:", data);
    
    return {
      success: true,
      salt: data.salt
    };
  } catch (error: any) {
    console.error("获取用户盐值时发生错误:", error);
    return { 
      success: false, 
      error: error.message || "未知错误" 
    };
  }
}

// 关联zkLogin盐值到已登录用户
export async function associateSaltWithUser(jwt: string, salt: string) {
  console.log("开始关联盐值到用户");
  
  const supabase = await createClient();
  
  try {
    // 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("获取当前用户失败:", userError);
      return { 
        success: false, 
        error: userError?.message || "未登录或无法获取用户信息" 
      };
    }
    
    // 解析JWT，提取必要信息
    let decodedJwt;
    try {
      // 使用服务器端 parseJwt 函数
      decodedJwt = parseJwt(jwt);
    } catch (error: any) {
      console.error("JWT解码失败:", error);
      return { 
        success: false, 
        error: `JWT解码失败: ${error.message}` 
      };
    }
    
    // 提取必要信息
    const provider = decodedJwt.iss;
    const providerUserId = decodedJwt.sub;
    const audience = Array.isArray(decodedJwt.aud) ? decodedJwt.aud[0] : decodedJwt.aud || '';
    
    // 更新或插入盐值记录
    const { error: upsertError } = await supabase
      .from('zklogin_user_salts')
      .upsert({
        user_id: user.id,
        provider,
        provider_user_id: providerUserId,
        audience,
        salt,
        updated_at: new Date().toISOString()
      });
    
    if (upsertError) {
      console.error("更新盐值记录失败:", upsertError);
      return { 
        success: false, 
        error: upsertError.message 
      };
    }
    
    return {
      success: true,
      message: "已成功关联盐值到用户账户"
    };
  } catch (error: any) {
    console.error("关联盐值时发生错误:", error);
    return { 
      success: false, 
      error: error.message || "未知错误" 
    };
  }
}
