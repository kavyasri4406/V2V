'use client';

import Link from 'next/link';
import { collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Alert } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCard } from '@/components/alert-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, AlertTriangle, Send, RadioTower } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { getDistance } from '@/lib/utils';
import { WeatherCard } from '@/components/weather-card';
import { PollutionCard } from '@/components/pollution-card';
import { defaultLocation } from '@/lib/location';


export default function Home() {
  const firestore = useFirestore();
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number}>(defaultLocation);

  useEffect(() => {
    const handleLocationUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      setUserLocation(customEvent.detail);
    };

    const locationStr = sessionStorage.getItem('userLocation');
    if (locationStr) {
      setUserLocation(JSON.parse(locationStr));
    } else {
      setUserLocation(defaultLocation);
    }

    window.addEventListener('locationUpdated', handleLocationUpdate);

    return () => {
      window.removeEventListener('locationUpdated', handleLocationUpdate);
    };
  }, []);

  const alertsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'alerts'), orderBy('timestamp', 'desc'), limit(50));
  }, [firestore]);

  const { data: allAlerts, isLoading } = useCollection<Omit<Alert, 'id' | 'timestamp'> & { timestamp: Timestamp | null }>(alertsQuery);

  const processedAlerts = useMemo(() => {
    if (!allAlerts) return [];
    
    return allAlerts.map(alert => {
      const timestamp = alert.timestamp;
      const timestampMs = timestamp instanceof Timestamp ? timestamp.toMillis() : (typeof timestamp === 'number' ? timestamp : 0);
      let distance;
      if (userLocation && alert.latitude && alert.longitude) {
        distance = getDistance(userLocation.latitude, userLocation.longitude, alert.latitude, alert.longitude);
      }
      return { ...alert, id: alert.id, timestamp: timestampMs, latitude: alert.latitude, longitude: alert.longitude, distance };
    }).filter(alert => alert.timestamp > 0)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [allAlerts, userLocation]);


  const latestAlert = useMemo(() => {
    return processedAlerts.length > 0 ? processedAlerts[0] : null;
  }, [processedAlerts]);

  const totalAlertsToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    return processedAlerts.filter(alert => alert.timestamp >= todayTimestamp).length;
  }, [processedAlerts]);

  const activeDrivers = useMemo(() => {
    if (!allAlerts) return 0;
    const uniqueDrivers = new Set(allAlerts.map(doc => doc.driver_name));
    return uniqueDrivers.size;
  }, [allAlerts]);


  return (
      <div className="container mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-150">
          <div className="text-center p-8 bg-card rounded-xl shadow-sm border border-border/50 bg-gradient-to-br from-card to-muted/20">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Welcome to V2V</h1>
            <p className="text-sm text-black dark:text-white/90 mt-1 italic whitespace-pre-line font-medium">
              The real-time, Vehicle to Vehicle Communication.
              <br />
              Stay aware. Stay connected.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/detailed-alert" className="group">
                <Card className="h-full flex flex-col items-center justify-center text-center p-8 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all duration-150 hover:shadow-lg hover:-translate-y-0.5">
                    <Send className="h-12 w-12 text-primary mb-4 group-hover:scale-105 transition-transform duration-150" />
                    <CardTitle className="text-2xl">Quick Broadcast</CardTitle>
                    <CardDescription>Send an instant safety alert to nearby drivers.</CardDescription>
                </Card>
            </Link>
            <Link href="/live-feed" className="group">
                <Card className="h-full flex flex-col items-center justify-center text-center p-8 border-accent/20 bg-accent/5 hover:bg-accent/10 transition-all duration-150 hover:shadow-lg hover:-translate-y-0.5">
                    <RadioTower className="h-12 w-12 text-accent mb-4 group-hover:scale-105 transition-transform duration-150" />
                    <CardTitle className="text-2xl">Live Network Feed</CardTitle>
                    <CardDescription>Monitor active broadcasts and hazard reports.</CardDescription>
                </Card>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <Card className="border-none shadow-none bg-transparent">
                  <CardHeader className="px-0">
                    <CardTitle>Latest Incident Report</CardTitle>
                    <CardDescription>The most recent broadcast on the network.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-0">
                    {isLoading ? (
                      <div className="flex items-center space-x-4 bg-card p-6 rounded-lg border">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-[250px]" />
                            <Skeleton className="h-4 w-[200px]" />
                          </div>
                        </div>
                    ) : latestAlert ? (
                      <AlertCard alert={latestAlert} />
                    ) : (
                      <div className="text-muted-foreground text-center py-12 bg-card rounded-lg border border-dashed">
                        No active alerts in Krishnankovil.
                      </div>
                    )}
                  </CardContent>
                </Card>
            </div>
            
            <div className="space-y-6">
                <WeatherCard />
                <PollutionCard />
                <Card className="overflow-hidden border-border/50">
                    <CardHeader className="bg-muted/30">
                        <CardTitle className="text-lg">Network Vitals</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="flex items-center gap-4 group">
                        <div className="p-3 rounded-xl bg-accent/10 text-accent group-hover:scale-105 transition-transform duration-150">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-6 w-12" /> : totalAlertsToday}</div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reports Today</div>
                        </div>
                        </div>
                        <div className="flex items-center gap-4 group">
                        <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform duration-150">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-6 w-12" /> : activeDrivers}</div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Connected Nodes</div>
                        </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
          </div>
      </div>
  );
}
