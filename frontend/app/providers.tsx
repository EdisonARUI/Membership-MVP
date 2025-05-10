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

interface ProvidersProps {
  children: ReactNode;
}

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