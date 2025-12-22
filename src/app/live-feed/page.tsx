'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, query, orderBy, limit, Timestamp, getDocs, writeBatch, where, GeoPoint } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
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
import { Trash2, Loader2, LocateFixed, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Geohash calculations
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

const encodeGeohash = (latitude: number, longitude: number, precision: number): string => {
  let isEven = true;
  let latRange = [-90, 90];
  let lonRange = [-180, 180];
  let geohash = '';
  let bit = 0;
  let ch = 0;

  while (geohash.length < precision) {
    if (isEven) {
      const mid = (lonRange[0] + lonRange[1]) / 2;
      if (longitude > mid) {
        ch |= (1 << (4 - bit));
        lonRange[0] = mid;
      } else {
        lonRange[1] = mid;
      }
    } else {
      const mid = (latRange[0] + latRange[1]) / 2;
      if (latitude > mid) {
        ch |= (1 << (4 - bit));
        latRange[0] = mid;
      } else {
        latRange[1] = mid;
      }
    }
    isEven = !isEven;

    if (bit < 4) {
      bit++;
    } else {
      geohash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return geohash;
};

const getNeighbors = (geohash: string): string[] => {
  const neighbors: { [key: string]: string[] } = {
    right: 'p0r21436x8zb9dcf5h7kjnmqesgutwvy',
    left: '14365h7k9dcfesgujnmqp0r2twvyx8zb',
    top: 'bcdefghjkmnpqrstuvwxyz0123456789',
    bottom: '23456789bcdefghjkmnpqrstuvwxyz',
  };
  const borders: { [key: string]: string[] } = {
    right: 'bcfguvyz',
    left: '0145hjnp',
    top: 'prxz',
    bottom: '028b',
  };

  const lastCh = geohash.slice(-1);
  const parent = geohash.slice(0, -1);
  const type = geohash.length % 2 ? 'odd' : 'even';

  const getBorder = (hash: string, dir: 'right' | 'left' | 'top' | 'bottom'): string => {
    if (hash.length === 0) return '';
    const last = hash.slice(-1);
    const p = hash.slice(0, -1);
    return borders[dir].includes(last) ? getBorder(p, dir) + BASE32[neighbors[dir].indexOf(last)] : p + BASE32[neighbors[dir].indexOf(last)];
  };

  const adjacent = (dir: 'right' | 'left' | 'top' | 'bottom'): string => {
    const border = borders[dir].includes(lastCh);
    if (border && parent !== '') {
      return getBorder(parent, dir) + BASE32[neighbors[dir].indexOf(lastCh)];
    }
    return parent + BASE32[neighbors[dir].indexOf(lastCh)];
  };

  const result: string[] = [
    adjacent('top'),
    adjacent('bottom'),
    adjacent('right'),
    adjacent('left'),
  ];

  const diag = (d1: 'top' | 'bottom', d2: 'right' | 'left') => {
      const g1 = adjacent(d1);
      return adjacent.call({geohash: g1, parent: g1.slice(0,-1), lastCh: g1.slice(-1)}, d2)
  };

  result.push(diag('top', 'right'), diag('top', 'left'), diag('bottom', 'right'), diag('bottom', 'left'));
  return result;
};


// Haversine distance
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

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

  useEffect(() => {
    const storedLocation = localStorage.getItem('locationEnabled') === 'true';
    setLocationEnabled(storedLocation);

    if (storedLocation) {
      setFilterMode('local');
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setLocationError(null);
          },
          () => {
            setLocationError('Could not get location. Showing global alerts.');
            setFilterMode('global');
          }
        );
      }
    }
  }, []);


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
                return distance <= 20; // 20km radius
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
    
    const querySnapshot = await getDocs(alertsRef).catch((error) => {
        const permissionError = new FirestorePermissionError({ path: alertsRef.path, operation: 'list' });
        errorEmitter.emit('permission-error', permissionError);
        setIsDeleting(false);
        return null;
    });

    if (!querySnapshot) return;
    
    if (querySnapshot.empty) {
      toast({ title: 'No alerts to clear' });
      setIsDeleting(false);
      return;
    }

    const batch = writeBatch(firestore);
    querySnapshot.forEach((doc) => batch.delete(doc.ref));

    batch.commit()
      .then(() => toast({ title: 'Success!', description: 'All alerts cleared.' }))
      .catch(() => {
        const permissionError = new FirestorePermissionError({ path: alertsRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setIsDeleting(false));
  };
  
  const toggleFilterMode = () => {
      setFilterMode(current => current === 'local' ? 'global' : 'local');
  }

  return (
      <div className="w-full max-w-4xl mx-auto">
          <Card className="h-full">
          <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex-1">
                  <CardTitle>Live Alert Feed</CardTitle>
                  <CardDescription>
                    {filterMode === 'local' && locationEnabled ? 'Showing alerts within 20km.' : 'Showing all alerts.'}
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
                  processedAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
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
