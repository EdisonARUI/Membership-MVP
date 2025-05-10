/**
 * AuthCallback page handles the authentication callback from Google OAuth and zkLogin.
 * It processes the id_token, signs in with Supabase, completes zkLogin authentication, and redirects the user.
 *
 * Features:
 * - Handles Google OAuth callback and extracts id_token
 * - Signs in with Supabase using the id_token
 * - Processes zkLogin authentication and completes on-chain registration
 * - Displays authentication status and error feedback
 * - Redirects to the target page after authentication
 */
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { useAuth } from '@/contexts/AuthContext';
import { useLogContext } from '@/contexts/LogContext';
// Temporarily hide LogDisplay for users, but keep for future development debugging
// import { LogDisplay } from '@/components/debug/LogDisplay';
import { ZkLoginService } from '@/utils/ZkLoginService';

/**
 * AuthCallback page component for handling authentication callback
 *
 * @returns {JSX.Element} The rendered authentication callback page
 */
function AuthCallbackContent() {
  const [status, setStatus] = useState('Processing login...');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';
  const { addLog } = useLogContext();
  const { completeAuthentication } = useAuth();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  /**
   * Handles the authentication callback, processes id_token, signs in with Supabase, and completes zkLogin
   */
  const handleSupabaseSignInWithIdToken = async () => {
    setStatus('Starting authentication callback...');

    try {
      // Extract id_token from hash params
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      addLog("Hash parameters obtained");

      const idToken = hashParams.get("id_token");
      if (!idToken) {
        throw new Error("id_token not found");
      }
      
      setStatus('Identity token obtained, processing...');
      addLog("id_token obtained, processing");
      
      // 1. Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      
      if (error) {
        addLog(`Supabase authorization error: ${error.message}`);
        router.push(`/?error=auth_failed`);
        return;
      }
      
      addLog("Supabase login successful");
      setStatus('Supabase login successful, processing zkLogin...');
      
      // 2. Process zkLogin
      const zkLoginResult = await ZkLoginService.processJwt(idToken);
      addLog(`zkLogin processed successfully, address: ${zkLoginResult.zkLoginAddress}`);
      
      setStatus('zkLogin processed successfully, completing authentication...');
      
      // 3. Complete authentication (on-chain registration and user association)
      await completeAuthentication(zkLoginResult);
      
      // 4. Redirect to target page
      addLog(`Authentication complete, redirecting to: ${redirectPath}`);
      sessionStorage.setItem('justLoggedIn', 'true');
      router.push(redirectPath);
    } catch (error: any) {
      console.error('Error during authentication callback:', error);
      setStatus(`Authentication failed: ${error.message}`);
      addLog(`Authentication failed: ${error.message}`);
      
      // Redirect to home after 5 seconds
      setTimeout(() => {
        router.push('/?error=auth_failed');
      }, 5000);
    }
  }

  useEffect(() => {
    addLog("Auth callback page initialized");
    handleSupabaseSignInWithIdToken();
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-lg shadow-xl text-white max-w-md w-full mb-8">
        <h1 className="text-2xl font-bold mb-4">Authentication Processing</h1>
        <div className="flex items-center space-x-3 mb-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-yellow-400 border-t-transparent"></div>
          <p>{status}</p>
        </div>
      </div>
      
      {/* Temporarily hide LogDisplay for users, but keep for future development debugging */}
      {/* <LogDisplay /> */}
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <div className="bg-slate-800 p-8 rounded-lg shadow-xl text-white max-w-md w-full mb-8">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <div className="flex items-center space-x-3 mb-4">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-yellow-400 border-t-transparent"></div>
            <p>Initializing authentication...</p>
          </div>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
