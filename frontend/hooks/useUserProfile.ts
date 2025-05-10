/**
 * Hook for managing user profile operations
 * Provides CRUD functionality for user profile data
 */
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useLogContext } from '@/contexts/LogContext';

/**
 * Hook for managing user profile data
 * Handles fetching, creating, and updating user profiles via Supabase
 * 
 * @returns {Object} User profile state and operations
 */
export function useUserProfile() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { addLog } = useLogContext();
  const supabase = createClient();

  /**
   * Retrieves user profile data
   * Fetches profile from database based on user ID
   * 
   * @param {string} userId - User ID to fetch profile for
   * @returns {Promise<any|null>} User profile data or null if not found
   */
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
      console.error('Failed to get user profile:', error);
      addLog(`Error: Failed to get user profile - ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Updates user profile data
   * Applies partial updates to existing profile
   * 
   * @param {string} userId - User ID of the profile to update
   * @param {any} updates - Object containing fields to update
   * @returns {Promise<any|null>} Updated profile data or null if update failed
   */
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
      addLog("User profile updated successfully");
      return data;
    } catch (error: any) {
      console.error('Failed to update user profile:', error);
      addLog(`Error: Failed to update user profile - ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Creates a new user profile
   * Initializes profile record with user ID and provided data
   * 
   * @param {string} userId - User ID to create profile for
   * @param {any} profileData - Initial profile data
   * @returns {Promise<any|null>} Created profile data or null if creation failed
   */
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
      addLog("User profile created successfully");
      return data;
    } catch (error: any) {
      console.error('Failed to create user profile:', error);
      addLog(`Error: Failed to create user profile - ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Updates user avatar URL
   * Specialized method for updating just the avatar image
   * 
   * @param {string} userId - User ID of the profile to update
   * @param {string} avatarUrl - New avatar image URL
   * @returns {Promise<any|null>} Updated profile data or null if update failed
   */
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
      addLog("User avatar updated successfully");
      return data;
    } catch (error: any) {
      console.error('Failed to update user avatar:', error);
      addLog(`Error: Failed to update user avatar - ${error.message}`);
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