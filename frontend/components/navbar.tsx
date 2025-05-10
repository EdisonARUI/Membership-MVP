/**
 * Navbar component provides the main navigation bar for the Web3 membership system.
 * It displays navigation links and user authentication status.
 *
 * Features:
 * - Displays site title and navigation links
 * - Shows user profile and sign out when logged in
 * - Shows sign in and sign up links when not logged in
 */
import Link from "next/link";
import { useUser } from "@/hooks/useUser";

/**
 * Navbar component for main navigation and user authentication actions
 *
 * @returns {JSX.Element} The rendered navigation bar
 */
export function Navbar() {
  const { user } = useUser();
  
  return (
    <nav className="bg-slate-900 py-4">
      <div className="container mx-auto flex justify-between items-center px-4">
        <Link href="/" className="text-xl font-bold">Web3 Membership System</Link>
        
        <div className="flex gap-4">
          {user ? (
            <>
              <Link href="/profile" className="text-white hover:text-yellow-400">
                Profile
              </Link>
              <form action="/auth/signout" method="post">
                <button type="submit" className="text-white hover:text-red-400">
                  Sign Out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="text-white hover:text-yellow-400">
                Sign In
              </Link>
              <Link href="/sign-up" className="text-white hover:text-yellow-400">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
