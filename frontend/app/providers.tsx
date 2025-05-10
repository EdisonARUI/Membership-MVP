/**
 * Providers component wraps the application with all required context providers.
 * It ensures that authentication, subscription, payment, zkLogin, lottery, deposit, and logging contexts are available throughout the app.
 *
 * Features:
 * - Provides global context for authentication, subscription, payment, zkLogin, lottery, deposit, and logging
 * - Wraps children with all necessary providers
 * - Includes a global Toaster for notifications
 */
'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { PaymentProvider } from '@/contexts/PaymentContext';
import { ZkLoginProvider } from '@/contexts/ZkLoginContext';
import { LotteryProvider } from '@/contexts/LotteryContext';
import { DepositProvider } from '@/contexts/DepositContext';
import { LogProvider } from '@/contexts/LogContext';
import { Toaster } from 'react-hot-toast';

/**
 * Props for Providers component
 */
interface ProvidersProps {
  /**
   * Child components to be wrapped by providers
   */
  children: ReactNode;
}

/**
 * Providers component for wrapping the app with all context providers
 *
 * @param {ProvidersProps} props - Component props
 * @returns {JSX.Element} The wrapped children with providers
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <LogProvider>
      <ZkLoginProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <PaymentProvider>
              <DepositProvider>
                <LotteryProvider>
                  {children}
                  <Toaster position="top-right" />
                </LotteryProvider>
              </DepositProvider>
            </PaymentProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </ZkLoginProvider>
    </LogProvider>
  );
} 