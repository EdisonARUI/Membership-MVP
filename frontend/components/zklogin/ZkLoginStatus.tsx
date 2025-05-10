/**
 * ZkLoginStatus component displays the current zkLogin authentication status for the user.
 * It shows loading, error, connected, and not connected states with appropriate UI feedback.
 *
 * Features:
 * - Shows loading spinner during authentication
 * - Displays error messages if authentication fails
 * - Shows connected status and zkLogin address when authenticated
 * - Provides guidance when not connected
 */
'use client';

import { useZkLogin } from "@/contexts/ZkLoginContext";

/**
 * ZkLoginStatus component for displaying zkLogin authentication status
 *
 * @returns {JSX.Element} The rendered status panel
 */
export function ZkLoginStatus() {
  // Get properties from zkLogin state
  const { state } = useZkLogin();
  const { zkLoginAddress, loading, error } = state;

  if (loading) {
    return (
      <div className="p-4 bg-slate-700 rounded-lg text-white">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent"></div>
          <span>Processing...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/20 rounded-lg text-red-400">
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (zkLoginAddress) {
    return (
      <div className="p-4 bg-slate-700 rounded-lg text-white">
        <h3 className="text-lg font-bold">Connected to Sui Devnet</h3>
        <p className="text-sm truncate mt-1">Address: {zkLoginAddress}</p>
      </div>
    );
  }

  // Show guidance when not logged in
  return (
    <div className="p-4 bg-slate-700 rounded-lg text-white">
      <h3 className="text-lg font-bold">Not connected to Sui network</h3>
      <p className="text-sm mt-1">Click the "zkLogin" button at the top to quickly log in with your Google account and create a Sui wallet.</p>
    </div>
  );
} 