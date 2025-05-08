'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { PaymentProvider } from '@/contexts/PaymentContext';
import { ZkLoginProvider } from '@/contexts/ZkLoginContext';
import { Toaster } from 'react-hot-toast';
import { useLog } from '@/hooks/useLog';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const { addLog } = useLog();
  
  return (
    <ZkLoginProvider onLog={addLog}>
      <AuthProvider>
        <SubscriptionProvider>
          <PaymentProvider>
            {children}
            <Toaster position="top-right" />
          </PaymentProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </ZkLoginProvider>
  );
} 