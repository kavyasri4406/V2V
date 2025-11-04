'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Alert } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCard } from '@/components/alert-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, AlertTriangle } from 'lucide-react';

export default function Home() {
  const firestore = useFirestore();

  const latestAlertQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'alerts'), orderBy('timestamp', 'desc'), limit(1));
  }, [firestore]);

  const allAlertsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'alerts'));
  }, [firestore]);

  const { data: latestAlertData, isLoading: isLatestLoading } = useCollection<Omit<Alert, 'id' | 'timestamp'> & { timestamp: Timestamp | null }>(latestAlertQuery);
  const { data: allAlertsData, isLoading: areAllLoading } = useCollection(allAlertsQuery);

  const latestAlert = useMemo(() => {
    if (!latestAlertData || latestAlertData.length === 0) return null;
    const alert = latestAlertData[0];
    const timestamp = alert.timestamp;

    // Handle both Firestore Timestamp and number (from Date.now())
    const timestampMs = timestamp instanceof Timestamp
      ? timestamp.toMillis()
      : typeof timestamp === 'number'
      ? timestamp
      : Date.now();

    return {
      ...alert,
      timestamp: timestampMs,
    };
  }, [latestAlertData]);

  const totalAlertsToday = useMemo(() => {
    if (!allAlertsData) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allAlertsData.filter(doc => {
      if (!doc.timestamp) return false;
      const alertDate = doc.timestamp instanceof Timestamp ? doc.timestamp.toDate() : new Date(doc.timestamp);
      return alertDate >= today;
    }).length;
  }, [allAlertsData]);

  const activeDrivers = useMemo(() => {
    if (!allAlertsData) return 0;
    const uniqueDrivers = new Set(allAlertsData.map(doc => doc.driver_name));
    return uniqueDrivers.size;
  }, [allAlertsData]);


  return (
      <div className="container mx-auto p-4 md:p-8">
        <div className="space-y-8">
          <Card className="bg-card shadow-lg border-none animate-in fade-in-0 duration-500">
            <CardHeader>
              <CardTitle className="text-3xl font-bold tracking-tight">Welcome to the V2V Safety Network</CardTitle>
              <CardDescription className="text-lg text-muted-foreground">
                Stay aware. Stay connected. Get real-time alerts from nearby vehicles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/live-feed">
                <Button size="lg" className="bg-primary hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 transition-shadow duration-300">
                  Go to Live Feed
                </Button>
              </Link>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="animate-in fade-in-0 delay-150 duration-500">
              <CardHeader>
                <CardTitle>Latest Alert</CardTitle>
                <CardDescription>The most recent broadcast on the network.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLatestLoading ? (
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

            <Card className="animate-in fade-in-0 delay-300 duration-500">
              <CardHeader>
                <CardTitle>Network Stats</CardTitle>
                <CardDescription>Real-time network activity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-accent/10 text-accent">
                      <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{areAllLoading ? <Skeleton className="h-6 w-12" /> : totalAlertsToday}</div>
                    <div className="text-sm text-muted-foreground">Alerts Today</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                      <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{areAllLoading ? <Skeleton className="h-6 w-12" /> : activeDrivers}</div>
                    <div className="text-sm text-muted-foreground">Active Drivers</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
  );
}
