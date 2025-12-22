'use client';

import { useMemo, useState, useEffect } from 'react';
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
} from "@/components/ui/alert-dialog"
import { Trash2, Loader2, LocateFixed, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getWeather, type GetWeatherOutput } from '@/ai/flows/get-weather-flow';
import { getDistance } from '@/lib/utils';


type LocationState = {
    latitude: number;
    longitude: number;
} | null;

export default function LiveAlertFeedPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationState>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'local' | 'global'>('global');
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [isFetchingLocationName, setIsFetchingLocationName] = useState(false);

  useEffect(() => {
    const storedLocation = localStorage.getItem('locationEnabled') === 'true';
    setLocationEnabled(storedLocation);

    const fetchLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setUserLocation(newLocation);
            setLocationError(null);
            fetchLocationName(newLocation);
          },
          () => {
            setLocationError('Could not get location. Showing global alerts.');
            setFilterMode('global');
          }
        );
      }
    };
    
    if (storedLocation) {
      setFilterMode('local');
      fetchLocation();
    }

    const handleLocationUpdate = (event: Event) => {
        const customEvent = event as CustomEvent;
        const newLocation = customEvent.detail;
        if(newLocation) {
          setUserLocation(newLocation);
          fetchLocationName(newLocation);
        }
    };

    window.addEventListener('locationUpdated', handleLocationUpdate);

    return () => {
        window.removeEventListener('locationUpdated', handleLocationUpdate);
    };

  }, []);

  const fetchLocationName = async (location: { latitude: number; longitude: number; }) => {
    setIsFetchingLocationName(true);
    try {
      const weatherData = await getWeather(location);
      setLocationName(weatherData.location);
    } catch (e) {
      console.error("Failed to fetch location name on live feed:", e);
      setLocationName(null); // It's okay if this fails, we just won't show the name
    } finally {
      setIsFetchingLocationName(false);
    }
  };


  const alertsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'alerts'), orderBy('timestamp', 'desc'), limit(150));
  }, [firestore]);


  const { data: allAlerts, isLoading } = useCollection<Omit<Alert, 'id' | 'timestamp'> & { timestamp: Timestamp | null }>(alertsQuery);

  const processedAlerts = useMemo(() => {
    if (!allAlerts) return [];
    
    const mappedAlerts = allAlerts.map(doc => {
       const timestamp = doc.timestamp;
       const timestampMs = timestamp instanceof Timestamp ? timestamp.toMillis() : Date.now();
      return {
        ...doc,
        id: doc.id,
        timestamp: timestampMs,
      };
    });

    if (filterMode === 'local' && userLocation) {
        return mappedAlerts.filter(alert => {
            if (alert.latitude && alert.longitude) {
                const distance = getDistance(userLocation.latitude, userLocation.longitude, alert.latitude, alert.longitude);
                return distance <= 5; // 5km radius
            }
            return false;
        }).sort((a, b) => b.timestamp - a.timestamp);
    }

    return mappedAlerts.sort((a, b) => b.timestamp - a.timestamp);

  }, [allAlerts, filterMode, userLocation]);

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
  
  const toggleFilterMode = () => {
      setFilterMode(current => current === 'local' ? 'global' : 'local');
  }

  const getFeedDescription = () => {
    if (filterMode === 'local' && locationEnabled) {
      if (isFetchingLocationName) {
        return 'Finding your location...';
      }
      if (locationName) {
        return `Showing alerts within 5km of ${locationName}.`;
      }
      return 'Showing alerts within 5km of your location.';
    }
    return 'Showing all alerts.';
  };


  return (
      <div className="w-full max-w-4xl mx-auto">
          <Card className="h-full">
          <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex-1">
                  <CardTitle>Live Alert Feed</CardTitle>
                  <CardDescription>
                    {getFeedDescription()}
                    {locationError && <span className="text-destructive"> {locationError}</span>}
                  </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {locationEnabled && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                 <Button variant="outline" size="icon" onClick={toggleFilterMode} disabled={!userLocation && filterMode === 'global'}>
                                    {filterMode === 'local' ? <LocateFixed className="h-4 w-4 text-primary" /> : <Globe className="h-4 w-4" />}
                                    <span className="sr-only">Toggle between local and global alerts</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{filterMode === 'local' ? 'Show Global Alerts' : 'Show Local Alerts'}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                <AlertDialog>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" disabled={isLoading || isDeleting || (processedAlerts.length === 0 && !isLoading)}>
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
              </div>
          </CardHeader>
          <CardContent className="pt-0">
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
                  processedAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} userLocation={userLocation} />)
              ) : (
                  <p className="text-muted-foreground text-center py-8">
                  {filterMode === 'local' ? 'No alerts in your area.' : 'No recent alerts to display.'}
                  </p>
              )}
              </div>
          </CardContent>
          </Card>
      </div>
  );
}
