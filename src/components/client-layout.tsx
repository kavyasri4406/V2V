'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Alert } from '@/lib/types';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import Header from '@/components/header';
import {
    Home,
    Send,
    RadioTower,
    Settings,
    MessageSquareWarning,
    Car,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const navigationItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Broadcast', href: '/send-alert', icon: Send },
    { name: 'Quick Alert', href: '/detailed-alert', icon: MessageSquareWarning },
    { name: 'Live Feed', href: '/live-feed', icon: RadioTower },
    { name: 'Settings', href: '/settings', icon: Settings },
];

function VoiceAlertManager() {
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();
    const [lastSpokenAlertId, setLastSpokenAlertId] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const handleStorageChange = () => {
                const updatedValue = localStorage.getItem('voiceAlertsEnabled') === 'true';
                setVoiceEnabled(updatedValue);
            };
            
            handleStorageChange();

            window.addEventListener('storage', handleStorageChange);
            return () => {
                window.removeEventListener('storage', handleStorageChange);
            };
        }
    }, []);

    const alertsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'alerts'), orderBy('timestamp', 'desc'), limit(1));
    }, [firestore]);

    const { data: alerts } = useCollection<Omit<Alert, 'id' | 'timestamp'> & { timestamp: Timestamp | number | null }>(alertsQuery);

    useEffect(() => {
        if (voiceEnabled && alerts && alerts.length > 0) {
            const latestAlert = alerts[0];
            if (latestAlert && latestAlert.id !== lastSpokenAlertId) {
                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(latestAlert.message);
                    window.speechSynthesis.speak(utterance);
                    setLastSpokenAlertId(latestAlert.id);
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Unsupported Browser',
                        description: 'Your browser does not support voice synthesis.',
                    });
                }
            }
        }
    }, [alerts, voiceEnabled, toast, lastSpokenAlertId]);

    return null; // This component does not render anything
}


export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    
    return (
        <SidebarProvider>
            <VoiceAlertManager />
            <div className="flex min-h-screen">
                <Sidebar collapsible="icon" className="p-2">
                    <SidebarHeader>
                        <div className="flex items-center gap-2 p-2">
                            <Car className="w-6 h-6 text-primary" />
                            <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
                                V2V AlertCast
                            </span>
                        </div>
                    </SidebarHeader>
                    <SidebarContent>
                        <SidebarMenu>
                            {navigationItems.map((item) => (
                                <SidebarMenuItem key={item.name}>
                                <Link href={item.href} className="w-full">
                                    <SidebarMenuButton tooltip={item.name} isActive={pathname === item.href}>
                                        <item.icon />
                                        <span>{item.name}</span>
                                    </SidebarMenuButton>
                                </Link>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarContent>
                    <SidebarFooter className="group-data-[collapsible=icon]:hidden">
                        <p className="text-xs text-muted-foreground p-2">
                            &copy; {new Date().getFullYear()} V2V AlertCast
                        </p>
                    </SidebarFooter>
                </Sidebar>
                <div className="flex flex-col flex-1">
                    <Header />
                    <main className="flex-1 bg-muted/30 p-4 sm:p-6 md:p-8">
                        {children}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
