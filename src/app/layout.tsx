'use client';

import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import MainLayout from '@/components/main-layout';
import { ClientOnly } from '@/components/client-only';
import { usePathname } from 'next/navigation';
import { AuthLayout } from '@/components/auth-layout';
import { useState, useEffect } from 'react';
import { SplashScreen } from '@/components/splash-screen';

export const metadata = {
  title: 'V2V AlertCast',
  description: 'Vehicle-to-Vehicle Real-time Alert System',
};


export default function RootLayout({
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
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
      </body>
    </html>
  );
}
