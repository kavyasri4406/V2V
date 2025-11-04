'use client';

import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import MainLayout from '@/components/main-layout';
import { ClientOnly } from '@/components/client-only';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" className="light">
      <head>
        <title>V2V AlertCast</title>
        <meta name="description" content="Vehicle-to-Vehicle Real-time Alert System" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <MainLayout>
            {children}
          </MainLayout>
        </FirebaseClientProvider>
        <ClientOnly>
          <Toaster />
        </ClientOnly>
      </body>
    </html>
  );
}
