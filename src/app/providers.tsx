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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Apply theme on initial load
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Ultra-fast splash screen transition
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => setIsLoading(false), 150);
    }, 150); 

    return () => clearTimeout(timer);
  }, []);

  // Hydration safety: These values MUST match the server's initial render.
  // Server-side: isMounted=false, isLoading=true, isFadingOut=false.
  const splashContainerClasses = cn(
    "fixed inset-0 z-[100] transition-opacity duration-200",
    isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
  );

  const contentWrapperClasses = cn(
    "transition-all duration-200",
    (!isMounted || isLoading) ? 'opacity-0 scale-99 blur-sm' : 'opacity-100 scale-100 blur-0'
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
