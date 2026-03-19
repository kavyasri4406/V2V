import './globals.css';
import { AppProviders } from './providers';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'V2V AlertCast',
  description: 'Vehicle-to-Vehicle Real-time Alert System',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'V2V AlertCast',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-body antialiased selection:bg-primary/30">
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
