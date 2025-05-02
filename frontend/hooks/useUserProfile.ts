import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useLog } from './useLog';

export function useUserProfile() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { addLog } = useLog();
  const supabase = createClient();

  // 获取用户资料
  const fetchUserProfile = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      setUserProfile(data);
      return data;
    } catch (error: any) {
      console.error('获取用户资料失败:', error);
      addLog(`错误: 获取用户资料失败 - ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 更新用户资料
  const updateUserProfile = async (userId: string, updates: any) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      setUserProfile(data);
      addLog("用户资料更新成功");
      return data;
    } catch (error: any) {
      console.error('更新用户资料失败:', error);
      addLog(`错误: 更新用户资料失败 - ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 创建用户资料
  const createUserProfile = async (userId: string, profileData: any) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          ...profileData
        })
        .select()
        .single();

      if (error) throw error;

      setUserProfile(data);
      addLog("用户资料创建成功");
      return data;
    } catch (error: any) {
      console.error('创建用户资料失败:', error);
      addLog(`错误: 创建用户资料失败 - ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 更新用户头像
  const updateUserAvatar = async (userId: string, avatarUrl: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      setUserProfile(data);
      addLog("用户头像更新成功");
      return data;
    } catch (error: any) {
      console.error('更新用户头像失败:', error);
      addLog(`错误: 更新用户头像失败 - ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    userProfile,
    loading,
    fetchUserProfile,
    updateUserProfile,
    createUserProfile,
    updateUserAvatar
  };
} 