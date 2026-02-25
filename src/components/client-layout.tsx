'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';

import { collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useAuth, useUser } from '@/firebase';
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
    LogOut,
    LogIn,
    NotebookPen,
    Navigation,
    Activity,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { AppLogo } from './app-logo';

const navigationItems = [
    { name: 'Home', href: '/', icon: Home, auth: false },
    { name: 'Send Alert', href: '/send-alert', icon: Send, auth: true },
    { name: 'Quick Alert', href: '/detailed-alert', icon: MessageSquareWarning, auth: true },
    { name: 'Accelerometer', href: '/accelerometer', icon: Activity, auth: true },
    { name: 'Nearby Places', href: '/nearby', icon: Navigation, auth: true },
    { name: 'Live Feed', href: '/live-feed', icon: RadioTower, auth: true },
    { name: 'Notes', href: '/notes', icon: NotebookPen, auth: true },
    { name: 'Settings', href: '/settings', icon: Settings, auth: true },
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
    const [isClient, setIsClient] = useState(false);
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const router = useRouter();

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isUserLoading && !user && navigationItems.find(item => item.href === pathname && item.auth)) {
            router.push('/login');
        }
    }, [user, isUserLoading, pathname, router]);
    
    if (!isClient || isUserLoading) {
        return null;
    }

    const handleSignOut = async () => {
        await signOut(auth);
        router.push('/login');
    }

    return (
        <SidebarProvider>
            <VoiceAlertManager />
            <div className="flex min-h-screen">
                <Sidebar collapsible="icon" className="p-2">
                    <SidebarHeader>
                        <div className="flex items-center justify-center p-2 group-data-[collapsible=icon]:p-0">
                           <AppLogo isCompact={true} />
                        </div>
                    </SidebarHeader>
                    <SidebarContent>
                        <SidebarMenu>
                            {navigationItems.map((item) => (
                                (!item.auth || user) &&
                                <SidebarMenuItem key={item.name}>
                                <Link href={item.href} className="w-full">
                                    <SidebarMenuButton tooltip={item.name} isActive={pathname === item.href}>
                                        <item.icon />
                                        <span className="group-data-[collapsible=icon]:hidden">{item.name}</span>
                                    </SidebarMenuButton>
                                </Link>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarContent>
                    <SidebarFooter>
                         <SidebarMenu>
                            {user ? (
                                <SidebarMenuItem>
                                    <SidebarMenuButton tooltip="Sign Out" onClick={handleSignOut}>
                                        <LogOut />
                                        <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ) : (
                                <SidebarMenuItem>
                                    <Link href="/login">
                                        <SidebarMenuButton tooltip="Sign In" isActive={pathname === '/login'}>
                                            <LogIn />
                                            <span className="group-data-[collapsible=icon]:hidden">Sign In</span>
                                        </SidebarMenuButton>
                                    </Link>
                                </SidebarMenuItem>
                            )}
                        </SidebarMenu>
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
