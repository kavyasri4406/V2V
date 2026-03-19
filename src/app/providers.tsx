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
    
    // Faster, smoother transition from splash to app
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 500);

    const loadTimer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(loadTimer);
    };
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[100] bg-black">
        <SplashScreen />
      </div>
    );
  }

  return (
    <>
        {isLoading && (
          <div className={cn(
            "fixed inset-0 z-[100] transition-opacity duration-500 ease-in-out bg-black",
            isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
          )}>
            <SplashScreen />
          </div>
        )}
        <div className={cn(
          "transition-all duration-700 ease-out",
          isLoading ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'
        )}>
          <FirebaseClientProvider>
              {isAuthPage ? (
              <AuthLayout>{children}</AuthLayout>
              ) : (
              <MainLayout>
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out fill-mode-forwards">
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