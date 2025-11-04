import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import Header from '@/components/header';
import Link from 'next/link';
import { Home, TrafficCone, CloudSun, Car, TriangleAlert, ShieldAlert, Settings } from 'lucide-react';
import type { AlertType } from '@/lib/types';


const alertTypes: { name: string, icon: React.ElementType, href: string }[] = [
    { name: 'Home', icon: Home, href: '/' },
    { name: 'Traffic', icon: TrafficCone, href: '/alerts/traffic' },
    { name: 'Weather', icon: CloudSun, href: '/alerts/weather' },
    { name: 'Accident', icon: Car, href: '/alerts/accident' },
    { name: 'Road Hazard', icon: TriangleAlert, href: '/alerts/road-hazard' },
    { name: 'Collision', icon: ShieldAlert, href: '/alerts/collision' },
    { name: 'Settings', icon: Settings, href: '/settings'}
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
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
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
                          {alertTypes.map(item => (
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
                    </SidebarContent>
                  </Sidebar>
                  <main className="flex-1">
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
