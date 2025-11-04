'use client';

import { useMemo, useState } from 'react';
import { collection, query, orderBy, limit, Timestamp, getDocs, writeBatch } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Alert } from '@/lib/types';
import { AlertCard } from '@/components/alert-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function LiveAlertFeedPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const alertsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'alerts'), orderBy('timestamp', 'desc'), limit(50));
  }, [firestore]);

  const { data: alerts, isLoading } = useCollection<Omit<Alert, 'id' | 'timestamp'> & { timestamp: Timestamp | null }>(alertsQuery);

  const processedAlerts = useMemo(() => {
    return alerts?.map(doc => {
       const timestamp = doc.timestamp;
       const timestampMs = timestamp instanceof Timestamp
        ? timestamp.toMillis()
        : Date.now();

      return {
        ...doc,
        timestamp: timestampMs,
      };
    }).sort((a, b) => b.timestamp - a.timestamp) ?? [];
  }, [alerts]);

  const handleClearAlerts = async () => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Database not available.',
      });
      return;
    }
    setIsDeleting(true);
    try {
      const alertsRef = collection(firestore, 'alerts');
      const querySnapshot = await getDocs(alertsRef);
      
      if (querySnapshot.empty) {
        toast({
          title: 'No alerts to clear',
        });
        setIsDeleting(false);
        return;
      }

      const batch = writeBatch(firestore);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      toast({
        title: 'Success!',
        description: 'All alerts have been cleared from the feed.',
      });

    } catch (error) {
      console.error("Error clearing alerts: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to clear alerts. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
      <div className="w-full max-w-4xl mx-auto">
          <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle>Live Alert Feed</CardTitle>
                  <CardDescription>Real-time updates from the V2V network.</CardDescription>
              </div>
              <AlertDialog>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" disabled={isLoading || processedAlerts.length === 0 || isDeleting}>
                          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          <span className="sr-only">Clear All Alerts</span>
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Clear All Alerts</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all alerts
                      from the network.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAlerts} disabled={isDeleting}>
                      {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
