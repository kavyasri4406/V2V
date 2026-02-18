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
import { Trash2, Loader2, RadioTower } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


export default function LiveAlertFeedPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const alertsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'alerts'), orderBy('timestamp', 'desc'), limit(150));
  }, [firestore]);


  const { data: allAlerts, isLoading } = useCollection<Omit<Alert, 'id' | 'timestamp'> & { timestamp: Timestamp | null }>(alertsQuery);

  const processedAlerts = useMemo(() => {
    if (!allAlerts) return [];
    
    return allAlerts.map(doc => {
       const timestamp = doc.timestamp;
       const timestampMs = timestamp instanceof Timestamp ? timestamp.toMillis() : Date.now();
      return {
        ...doc,
        id: doc.id,
        timestamp: timestampMs,
      };
    }).sort((a, b) => b.timestamp - a.timestamp);

  }, [allAlerts]);

  const handleClearAlerts = async () => {
    if (!firestore) return;
    setIsDeleting(true);

    const alertsRef = collection(firestore, 'alerts');
    
    const querySnapshot = await getDocs(alertsRef);

    if (!querySnapshot) return;
    
    if (querySnapshot.empty) {
      toast({ title: 'No alerts to clear' });
      setIsDeleting(false);
      return;
    }

    const batch = writeBatch(firestore);
    querySnapshot.forEach((doc) => batch.delete(doc.ref));

    await batch.commit()
      .then(() => toast({ title: 'Success!', description: 'All alerts cleared.' }))
      .catch((err) => {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not clear alerts.',
        });
      })
      .finally(() => setIsDeleting(false));
  };

  return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
          <Card className="h-full border-none shadow-none bg-transparent">
          <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-2 px-0 pt-0">
              <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <RadioTower className="h-5 w-5 text-accent animate-pulse" />
                    <CardTitle className="text-3xl">Live Feed</CardTitle>
                  </div>
                  <CardDescription className="text-base font-medium">
                    Monitoring Krishnankovil and surrounding areas.
                  </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <AlertDialog>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive hover:text-white" disabled={isLoading || isDeleting || (processedAlerts.length === 0 && !isLoading)}>
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            <span className="sr-only">Clear All</span>
                          </Button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Wipe Network Feed</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all active alerts from the network.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearAlerts} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Wipe Feed
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
          </CardHeader>
          <CardContent className="px-0 pt-4">
              <div className="space-y-4">
              {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                      <div className="flex items-center space-x-4 p-6 bg-card border rounded-xl" key={i}>
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="space-y-2">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-4 w-[200px]" />
                          </div>
                      </div>
                  ))
              ) : processedAlerts.length > 0 ? (
                  processedAlerts.map((alert) => <AlertCard alert={alert} key={alert.id} />)
              ) : (
                  <div className="text-center py-20 bg-card rounded-2xl border-2 border-dashed border-muted flex flex-col items-center gap-4">
                    <RadioTower className="h-12 w-12 text-muted-foreground/30" />
                    <p className="text-muted-foreground font-medium text-lg">
                      No recent alerts on the network.
                    </p>
                  </div>
              )}
              </div>
          </CardContent>
          </Card>
      </div>
  );
}
