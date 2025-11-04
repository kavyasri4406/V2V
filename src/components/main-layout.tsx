'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
import { Home, Send, MessageSquareWarning, RadioTower, Settings } from 'lucide-react';
import { collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { Alert } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';


const navigationItems: { name: string, icon: React.ElementType, href: string }[] = [
    { name: 'Home', icon: Home, href: '/' },
    { name: 'Send', icon: Send, href: '/send-alert'},
    { name: 'Quick Alert', icon: MessageSquareWarning, href: '/detailed-alert'},
    { name: 'Live Alert Feed', icon: RadioTower, href: '/live-feed'},
];

function VoiceAlertManager() {
  const firestore = useFirestore();
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const lastSpokenAlertId = useRef<string | null>(null);

  const alertsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'alerts'), orderBy('timestamp', 'desc'), limit(1));
  }, [firestore]);

  const { data: alerts } = useCollection<Omit<Alert, 'id' | 'timestamp'> & { timestamp: Timestamp | number | null }>(alertsQuery);

  const processedAlerts = useMemo(() => {
    return alerts?.map(doc => {
       const timestamp = doc.timestamp;
       const timestampMs = timestamp instanceof Timestamp
        ? timestamp.toMillis()
        : typeof timestamp === 'number'
        ? timestamp
        : Date.now();

      return {
        ...doc,
        id: doc.id, // ensure id is present
        timestamp: timestampMs,
      };
    }).sort((a, b) => b.timestamp - a.timestamp) ?? [];
  }, [alerts]);

  useEffect(() => {
    const checkVoiceSetting = () => {
      // This check ensures localStorage is only accessed on the client
      const isEnabled = localStorage.getItem('voiceAlertsEnabled') === 'true';
      setVoiceEnabled(isEnabled);
    };

    checkVoiceSetting(); // Initial check on mount

    // Listen for changes from other tabs
    window.addEventListener('storage', checkVoiceSetting);
    return () => {
        window.removeEventListener('storage', checkVoiceSetting);
    }
  }, []);

  useEffect(() => {
    if (voiceEnabled && processedAlerts.length > 0) {
      const latestAlert = processedAlerts[0];
      // Only speak if the alert is new and hasn't been spoken before
      if (latestAlert && latestAlert.id !== lastSpokenAlertId.current) {
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(`New alert from ${latestAlert.driver_name}. ${latestAlert.message}`);
          window.speechSynthesis.speak(utterance);
          lastSpokenAlertId.current = latestAlert.id; // Mark as spoken
        }
      }
    }
  }, [processedAlerts, voiceEnabled]);

  return null; // This component does not render anything
}


export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <SidebarProvider>
          <VoiceAlertManager />
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
                                  <span className="group-data-[collapsible=icon]:hidden">{item.name}</span>
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
                                  <span className="group-data-[collapsible=icon]:hidden">Settings</span>
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
  );
}
