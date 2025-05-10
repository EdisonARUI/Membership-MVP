/**
 * Hook for managing user authentication state
 * Provides current user information and authentication status
 */
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

/**
 * Hook for tracking authenticated user
 * Handles user session management via Supabase auth
 * 
 * @returns {Object} User state and loading status
 */
export function useUser() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  
  useEffect(() => {
    /**
     * Fetches current user session or user data
     * First checks session storage, then falls back to getUser API
     */
    const fetchUser = async () => {
      // First check session from storage
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        setUser(sessionData.session.user);
        setIsLoading(false);
        return;
      }
      
      // Then try to get user
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) {
        setUser(data.user);
      }
      setIsLoading(false);
    };
    
    fetchUser();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );
    
    // Clean up auth listener on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  
  return { user, isLoading };
}
