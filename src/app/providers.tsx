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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Apply theme on initial load
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // High-speed transition sequence
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 100);

    const loadTimer = setTimeout(() => {
      setIsLoading(false);
    }, 250);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(loadTimer);
    };
  }, []);

  // Server-safe class generation to prevent hydration mismatches.
  // We use fixed duration values that are identical on server and client.
  const splashContainerClasses = cn(
    "fixed inset-0 z-[100] transition-opacity duration-150",
    isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
  );

  const contentWrapperClasses = cn(
    "transition-all duration-150",
    isLoading ? 'opacity-0 scale-99 blur-sm' : 'opacity-100 scale-100 blur-0'
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
                  <div className="animate-in fade-in slide-in-from-bottom-1 duration-150 ease-out fill-mode-forwards">
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
