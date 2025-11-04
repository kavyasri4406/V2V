import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from '@/components/ui/sidebar';
import Header from '@/components/header';
import Link from 'next/link';
import { Home, Send, Settings, RadioTower, MessageSquareWarning, Siren } from 'lucide-react';


const navigationItems: { name: string, icon: React.ElementType, href: string }[] = [
    { name: 'Home', icon: Home, href: '/' },
    { name: 'Broadcast Alert', icon: Siren, href: '/send-alert'},
    { name: 'Detailed Alert', icon: MessageSquareWarning, href: '/detailed-alert'},
    { name: 'Live Alert Feed', icon: RadioTower, href: '/live-feed'},
]

export const metadata: Metadata = {
  title: 'V2V AlertCast',
  description: 'Vehicle-to-Vehicle Real-time Alert System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <SidebarProvider>
              <div className="flex min-h-screen flex-col">
              <Header />
                <div className="flex flex-1">
                  <Sidebar collapsible="icon" className="p-2">
                    <SidebarContent>
                      <SidebarGroup>
                        <SidebarMenu>
                          {navigationItems.map(item => (
                            <SidebarMenuItem key={item.name}>
                              <Link href={item.href}>
                                <SidebarMenuButton tooltip={item.name}>
                                  <item.icon />
                                  <span>{item.name}</span>
                                </SidebarMenuButton>
                              </Link>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </SidebarGroup>
                       <SidebarGroup>
                        <SidebarMenu>
                            <SidebarMenuItem>
                              <Link href="/settings">
                                <SidebarMenuButton tooltip="Settings">
                                  <Settings />
                                  <span>Settings</span>
                                </SidebarMenuButton>
                              </Link>
                            </SidebarMenuItem>
                        </SidebarMenu>
                      </SidebarGroup>
                    </SidebarContent>
                  </Sidebar>
                  <main className="flex-1 bg-muted/30 p-4 sm:p-6 md:p-8">
                    {children}
                  </main>
                </div>
              </div>
          </SidebarProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
