'use client';

import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import MainLayout from '@/components/main-layout';
import { ClientOnly } from '@/components/client-only';
import { usePathname } from 'next/navigation';
import { AuthLayout } from '@/components/auth-layout';
import { useState, useEffect } from 'react';
import { SplashScreen } from '@/components/splash-screen';
import { cn } from '@/lib/utils';

export function AppProviders({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login';
  const [isLoading, setIsLoading] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Significantly reduced splash screen time for immediate access
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => setIsLoading(false), 300); // Snappier fade
    }, 800); 

    return () => clearTimeout(timer);
  }, []);


  return (
    <>
        {isLoading && (
          <div className={cn(
            "fixed inset-0 z-[100] transition-opacity duration-300",
            isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
          )}>
            <SplashScreen />
          </div>
        )}
        <div className={cn(
          "transition-all duration-300",
          isLoading ? 'opacity-0 scale-98 blur-sm' : 'opacity-100 scale-100 blur-0'
        )}>
        <FirebaseClientProvider>
            {isAuthPage ? (
            <AuthLayout>{children}</AuthLayout>
            ) : (
            <MainLayout>
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out fill-mode-forwards">
                  {children}
                </div>
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
