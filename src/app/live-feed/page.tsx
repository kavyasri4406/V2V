'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Alert } from '@/lib/types';
import { AlertCard } from '@/components/alert-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function LiveAlertFeedPage() {
  const firestore = useFirestore();
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const lastSpokenAlertId = useRef<string | null>(null);

  const alertsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'alerts'), orderBy('timestamp', 'desc'), limit(50));
  }, [firestore]);

  const { data: alerts, isLoading } = useCollection<Omit<Alert, 'id' | 'timestamp'> & { timestamp: Timestamp | null }>(alertsQuery);

  const processedAlerts = useMemo(() => {
    return alerts?.map(doc => ({
      ...doc,
      timestamp: doc.timestamp ? (doc.timestamp instanceof Timestamp ? doc.timestamp.toMillis() : doc.timestamp) : Date.now(),
    })).sort((a, b) => b.timestamp - a.timestamp) ?? [];
  }, [alerts]);
  
  useEffect(() => {
    const isEnabled = localStorage.getItem('voiceAlertsEnabled') === 'true';
    setVoiceEnabled(isEnabled);

    const handleStorageChange = () => {
       const isEnabled = localStorage.getItem('voiceAlertsEnabled') === 'true';
       setVoiceEnabled(isEnabled);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    }
  }, []);

  useEffect(() => {
    if (voiceEnabled && processedAlerts.length > 0) {
      const latestAlert = processedAlerts[0];
      if (latestAlert && latestAlert.id !== lastSpokenAlertId.current) {
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(`New alert from ${latestAlert.driver_name}. ${latestAlert.message}`);
          window.speechSynthesis.speak(utterance);
          lastSpokenAlertId.current = latestAlert.id;
        }
      }
    }
  }, [processedAlerts, voiceEnabled]);

  return (
    <div className="w-full max-w-4xl mx-auto">
        <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Live Alert Feed</CardTitle>
                <CardDescription>Real-time updates from the V2V network.</CardDescription>
            </div>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
            {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <div className="flex items-center space-x-4 p-4" key={i}>
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                        </div>
                    </div>
                ))
            ) : processedAlerts.length > 0 ? (
                processedAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
            ) : (
                <p className="text-muted-foreground text-center py-8">
                No recent alerts to display. The network is quiet.
                </p>
            )}
            </div>
        </CardContent>
        </Card>
    </div>
  );
}
