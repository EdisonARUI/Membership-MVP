'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { PaymentProvider } from '@/contexts/PaymentContext';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <PaymentProvider>
          {children}
        </PaymentProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
} 