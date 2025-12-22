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
import { WeatherCard } from '@/components/weather-card';
import { getDistance } from '@/lib/utils';


type LocationState = {
    latitude: number;
    longitude: number;
} | null;

export default function Home() {
  const firestore = useFirestore();
  const [userLocation, setUserLocation] = useState<LocationState>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);

  useEffect(() => {
    const storedLocation = localStorage.getItem('locationEnabled') === 'true';
    setLocationEnabled(storedLocation);

    const handleLocationUpdate = (event: Event) => {
        const customEvent = event as CustomEvent;
        if(customEvent.detail) {
          setUserLocation(customEvent.detail);
        }
    };
    
    const handleStorageChange = () => {
        const updatedLocation = localStorage.getItem('locationEnabled') === 'true';
        setLocationEnabled(updatedLocation);
        if (!updatedLocation) {
            setUserLocation(null);
        }
    }

    window.addEventListener('locationUpdated', handleLocationUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
        window.removeEventListener('locationUpdated', handleLocationUpdate);
        window.removeEventListener('storage', handleStorageChange);
    };

  }, []);

  const alertsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'alerts'), orderBy('timestamp', 'desc'), limit(150));
  }, [firestore]);

  const { data: allAlerts, isLoading } = useCollection<Omit<Alert, 'id' | 'timestamp'> & { timestamp: Timestamp | null }>(alertsQuery);

  const processedAlerts = useMemo(() => {
    if (!allAlerts) return [];
    
    const mappedAlerts = allAlerts.map(alert => {
      const timestamp = alert.timestamp;
      const timestampMs = timestamp instanceof Timestamp ? timestamp.toMillis() : (typeof timestamp === 'number' ? timestamp : 0);
      return { ...alert, id: alert.id, timestamp: timestampMs, latitude: alert.latitude, longitude: alert.longitude };
    }).filter(alert => alert.timestamp > 0);

    if (locationEnabled && userLocation) {
        return mappedAlerts.filter(alert => {
            if (alert.latitude && alert.longitude) {
                const distance = getDistance(userLocation.latitude, userLocation.longitude, alert.latitude, alert.longitude);
                return distance <= 5; // 5km radius
            }
            // If location is enabled but alert has no coords, don't show it in local view.
            return false;
        }).sort((a, b) => b.timestamp - a.timestamp);
    }

    return mappedAlerts.sort((a, b) => b.timestamp - a.timestamp);
  }, [allAlerts, locationEnabled, userLocation]);


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
    // Count drivers from all alerts to show total network activity
    const uniqueDrivers = new Set(allAlerts.map(doc => doc.driver_name));
    return uniqueDrivers.size;
  }, [allAlerts]);


  return (
      <div className="container mx-auto p-4 md:p-8">
        <div className="space-y-8">
          
          <div className="text-center p-8 bg-card rounded-lg shadow-lg border animate-in fade-in-0 duration-500">
            <h1 className="text-4xl font-bold tracking-tight">Welcome to V2V AlertCast</h1>
            <p className="text-lg text-muted-foreground mt-2">The real-time, vehicle-to-vehicle safety network.</p>
            <p className="text-muted-foreground">Stay aware. Stay connected.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link href="/detailed-alert" className="transform transition-transform duration-300 hover:scale-105">
                <Card className="h-full flex flex-col items-center justify-center text-center p-8 bg-primary/10 hover:bg-primary/20 cursor-pointer">
                    <Send className="h-12 w-12 text-primary mb-4" />
                    <CardTitle className="text-2xl">Broadcast a Quick Alert</CardTitle>
                    <CardDescription>Send a templated alert with one tap.</CardDescription>
                </Card>
            </Link>
            <Link href="/live-feed" className="transform transition-transform duration-300 hover:scale-105">
                <Card className="h-full flex flex-col items-center justify-center text-center p-8 bg-accent/10 hover:bg-accent/20 cursor-pointer">
                    <RadioTower className="h-12 w-12 text-accent mb-4" />
                    <CardTitle className="text-2xl">View Live Feed</CardTitle>
                    <CardDescription>See active alerts from nearby drivers.</CardDescription>
                </Card>
            </Link>
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <Card className="animate-in fade-in-0 delay-150 duration-500">
                  <CardHeader>
                    <CardTitle>Latest Alert {locationEnabled && '(Nearby)'}</CardTitle>
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
                      <AlertCard alert={latestAlert} userLocation={userLocation} />
                    ) : (
                      <div className="text-muted-foreground text-center py-8">{locationEnabled ? 'No nearby alerts.' : 'No alerts on the network yet.'}</div>
                    )}
                  </CardContent>
                </Card>
            </div>
            
            <div className="space-y-8">
                <WeatherCard />
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
                            <div className="text-sm text-muted-foreground">Alerts Today {locationEnabled && '(Nearby)'}</div>
                        </div>
                        </div>
                        <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-primary/10 text-primary">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-6 w-12" /> : activeDrivers}</div>
                            <div className="text-sm text-muted-foreground">Active Drivers {locationEnabled && '(Total)'}</div>
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
