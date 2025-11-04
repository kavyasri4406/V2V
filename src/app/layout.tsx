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
import { Home, Settings, TrafficCone, Car, ShieldAlert, TriangleAlert, CloudSun } from 'lucide-react';
import type { AlertType } from '@/lib/types';


const navigationItems: { name: string, icon: React.ElementType, href: string }[] = [
    { name: 'Home', icon: Home, href: '/' },
]

const alertTypes: { name: AlertType; icon: React.ElementType, href: string }[] = [
  { name: 'Traffic', icon: TrafficCone, href: '/alerts/traffic' },
  { name: 'Accident', icon: Car, href: '/alerts/accident' },
  { name: 'Collision', icon: ShieldAlert, href: '/alerts/collision' },
  { name: 'Road Hazard', icon: TriangleAlert, href: '/alerts/road-hazard' },
  { name: 'Weather', icon: CloudSun, href: '/alerts/weather' }
];


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
