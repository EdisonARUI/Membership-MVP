'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { PaymentProvider } from '@/contexts/PaymentContext';
import { ZkLoginProvider } from '@/contexts/ZkLoginContext';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ZkLoginProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <PaymentProvider>
            {children}
          </PaymentProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </ZkLoginProvider>
  );
} 