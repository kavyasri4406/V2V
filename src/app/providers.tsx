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
  
  // Use consistent initial state for hydration
  const [isLoading, setIsLoading] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Significantly reduced splash screen time for immediate access
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => setIsLoading(false), 300); // Snappier fade
    }, 800); 

    return () => clearTimeout(timer);
  }, []);

  // During SSR and initial hydration, we render the splash screen 
  // with static classes to avoid mismatch.
  const splashContainerClasses = cn(
    "fixed inset-0 z-[100] transition-opacity duration-300",
    isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
  );

  const contentWrapperClasses = cn(
    "transition-all duration-300",
    isLoading ? 'opacity-0 scale-98 blur-sm' : 'opacity-100 scale-100 blur-0'
  );

  return (
    <>
        {isLoading && (
          <div className={splashContainerClasses}>
            <SplashScreen />
          </div>
        )}
        <div className={contentWrapperClasses}>
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
