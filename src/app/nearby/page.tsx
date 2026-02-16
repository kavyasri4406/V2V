'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Loader2, Fuel, Hospital, Car, Bike, MapPin, Search } from 'lucide-react';
import { getNearbyPlaces, type GetNearbyPlacesOutput } from '@/ai/flows/get-nearby-places-flow';
import { defaultLocation } from '@/lib/location';

type PlaceType = 'petrol station' | 'hospital' | 'car repair' | 'bike repair';

const placeTypes: { name: PlaceType; icon: React.ElementType, title: string }[] = [
  { name: 'petrol station', icon: Fuel, title: 'Petrol Stations' },
  { name: 'hospital', icon: Hospital, title: 'Hospitals' },
  { name: 'car repair', icon: Car, title: 'Car Repair' },
  { name: 'bike repair', icon: Bike, title: 'Bike Repair' },
];

type PlacesState = {
  [key in PlaceType]?: {
    data: GetNearbyPlacesOutput['places'] | null;
    isLoading: boolean;
    error: string | null;
    isRateLimited: boolean;
  };
};

const RATE_LIMIT_COOLDOWN_MS = 60 * 1000; // 1 minute

export default function NearbyPage() {
  const [placesState, setPlacesState] = useState<PlacesState>({});
  const userLocation = defaultLocation;

  const fetchPlaces = useCallback(async (placeType: PlaceType) => {
    setPlacesState(prev => ({
      ...prev,
      [placeType]: { data: null, isLoading: true, error: null, isRateLimited: false },
    }));

    try {
      const { latitude, longitude } = userLocation;
      const result = await getNearbyPlaces({ latitude, longitude, placeType });
      setPlacesState(prev => ({
        ...prev,
        [placeType]: { data: result.places, isLoading: false, error: null, isRateLimited: false },
      }));
    } catch (e: any) {
      let errorMessage = `Could not fetch ${placeType}. The AI service may be unavailable.`;
      let rateLimited = false;
      if (typeof e.message === 'string' && (e.message.includes('429') || e.message.includes('Too Many Requests'))) {
        errorMessage = 'Rate limit reached. Please wait a moment before trying again.';
        rateLimited = true;
      }
      
      setPlacesState(prev => {
        const newState = {
            ...prev,
            [placeType]: { data: null, isLoading: false, error: errorMessage, isRateLimited: rateLimited },
        };
        if (rateLimited) {
            setTimeout(() => {
                setPlacesState(curr => ({
                    ...curr,
                    [placeType]: { ...curr[placeType]!, isRateLimited: false }
                }));
            }, RATE_LIMIT_COOLDOWN_MS);
        }
        return newState;
      });
    }
  }, [userLocation]);

  const renderPlaceCardContent = (placeType: PlaceType) => {
    const state = placesState[placeType];

    if (state?.isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-5 w-5 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (state?.error) {
      return (
        <div className="text-center text-destructive flex flex-col items-center gap-2">
          <AlertCircle className="h-6 w-6" />
          <p className="text-sm">{state.error}</p>
           {!state.isRateLimited && (
                <Button variant="outline" size="sm" onClick={() => fetchPlaces(placeType)} className="mt-2">Try Again</Button>
            )}
        </div>
      );
    }

    if (state?.data && state.data.length > 0) {
      return (
        <div className="space-y-3">
          {state.data.map((place, index) => (
            <div key={index} className="flex items-start gap-3">
              <MapPin className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">{place.name}</p>
                <p className="text-sm text-muted-foreground">{place.address}</p>
              </div>
              <p className="text-sm text-muted-foreground whitespace-nowrap">{place.distance}</p>
            </div>
          ))}
        </div>
      );
    }
    
    if (state?.data && state.data.length === 0) {
        return <p className="text-muted-foreground text-sm text-center">No nearby {placeType} found.</p>;
    }

    // Initial state before fetching
    return (
        <div className="text-center flex flex-col items-center gap-4 py-4">
            <p className="text-muted-foreground text-sm">Find nearby {placeType}s.</p>
            <Button onClick={() => fetchPlaces(placeType)} disabled={state?.isRateLimited}>
                {state?.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4" />} Find
            </Button>
        </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Nearby Places</h1>
        <p className="text-muted-foreground">Find essential services near your location.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {placeTypes.map(({ name, icon: Icon, title }) => (
          <Card key={name}>
            <CardHeader className="flex flex-row items-center gap-3">
              <Icon className="h-6 w-6 text-accent" />
              <CardTitle className="capitalize">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              {renderPlaceCardContent(name)}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
