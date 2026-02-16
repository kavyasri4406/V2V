'use client';

import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import MainLayout from '@/components/main-layout';
import { ClientOnly } from '@/components/client-only';
import { usePathname } from 'next/navigation';
import { AuthLayout } from '@/components/auth-layout';
import { useState, useEffect } from 'react';
import { SplashScreen } from '@/components/splash-screen';

export function AppProviders({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login';
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This effect runs only once on the client
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000); // Show splash for 3 seconds

    return () => clearTimeout(timer);
  }, []);


  return (
    <>
        {isLoading && <SplashScreen />}
        <div className={isLoading ? 'hidden' : ''}>
        <FirebaseClientProvider>
            {isAuthPage ? (
            <AuthLayout>{children}</AuthLayout>
            ) : (
            <MainLayout>
                {children}
            </MainLayout>
            )}
        </FirebaseClientProvider>
        <ClientOnly>
            <Toaster />
        </ClientOnly>
        </div>
    </>
  );
}
