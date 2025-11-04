'use client';

import Link from 'next/link';
import { collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Alert } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCard } from '@/components/alert-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, AlertTriangle, Send, RadioTower } from 'lucide-react';
import { useMemo } from 'react';


export default function Home() {
  const firestore = useFirestore();

  const alertsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'alerts'), orderBy('timestamp', 'desc'), limit(50));
  }, [firestore]);

  const { data: alerts, isLoading } = useCollection<Omit<Alert, 'id' | 'timestamp'> & { timestamp: Timestamp | null }>(alertsQuery);

  const processedAlerts = useMemo(() => {
    if (!alerts) return [];
    return alerts.map(alert => {
      const timestamp = alert.timestamp;
      const timestampMs = timestamp instanceof Timestamp ? timestamp.toMillis() : 0;
      return { ...alert, timestamp: timestampMs };
    }).filter(alert => alert.timestamp > 0) // Filter out alerts with invalid timestamps
    .sort((a, b) => b.timestamp - a.timestamp);
  }, [alerts]);

  const latestAlert = useMemo(() => {
    return processedAlerts.length > 0 ? processedAlerts[0] : null;
  }, [processedAlerts]);

  const totalAlertsToday = useMemo(() => {
    if (!alerts) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    return processedAlerts.filter(alert => alert.timestamp >= todayTimestamp).length;
  }, [processedAlerts]);

  const activeDrivers = useMemo(() => {
    if (!alerts) return 0;
    const uniqueDrivers = new Set(alerts.map(doc => doc.driver_name));
    return uniqueDrivers.size;
  }, [alerts]);


  return (
      <div className="container mx-auto p-4 md:p-8">
        <div className="space-y-8">
          
          <div className="text-center p-8 bg-card rounded-lg shadow-lg border animate-in fade-in-0 duration-500">
            <h1 className="text-4xl font-bold tracking-tight">Welcome to V2V AlertCast</h1>
            <p className="text-lg text-muted-foreground mt-2">The real-time, vehicle-to-vehicle safety network.</p>
            <p className="text-muted-foreground">Stay aware. Stay connected.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link href="/send-alert" className="transform transition-transform duration-300 hover:scale-105">
                <Card className="h-full flex flex-col items-center justify-center text-center p-8 bg-primary/10 hover:bg-primary/20 cursor-pointer">
                    <Send className="h-12 w-12 text-primary mb-4" />
                    <CardTitle className="text-2xl">Broadcast an Alert</CardTitle>
                    <CardDescription>Share a real-time update with the network.</CardDescription>
                </Card>
            </Link>
            <Link href="/live-feed" className="transform transition-transform duration-300 hover:scale-105">
                <Card className="h-full flex flex-col items-center justify-center text-center p-8 bg-accent/10 hover:bg-accent/20 cursor-pointer">
                    <RadioTower className="h-12 w-12 text-accent mb-4" />
                    <CardTitle className="text-2xl">View Live Feed</CardTitle>
                    <CardDescription>See all active alerts from nearby drivers.</CardDescription>
                </Card>
            </Link>
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <Card className="animate-in fade-in-0 delay-150 duration-500">
                  <CardHeader>
                    <CardTitle>Latest Alert</CardTitle>
                    <CardDescription>The most recent broadcast on the network.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex items-center space-x-4">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-[250px]" />
                            <Skeleton className="h-4 w-[200px]" />
                          </div>
                        </div>
                    ) : latestAlert ? (
                      <AlertCard alert={latestAlert} />
                    ) : (
                      <div className="text-muted-foreground text-center py-8">No alerts on the network yet.</div>
                    )}
                  </CardContent>
                </Card>
            </div>
            
            <div className="space-y-8">
                <Card className="animate-in fade-in-0 delay-300 duration-500">
                    <CardHeader>
                        <CardTitle>Network Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-accent/10 text-accent">
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-6 w-12" /> : totalAlertsToday}</div>
                            <div className="text-sm text-muted-foreground">Alerts Today</div>
                        </div>
                        </div>
                        <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-primary/10 text-primary">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-6 w-12" /> : activeDrivers}</div>
                            <div className="text-sm text-muted-foreground">Active Drivers</div>
                        </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

          </div>

        </div>
      </div>
  );
}
