'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Loader2, Fuel, Hospital, Car, Bike, Navigation, MapPin, Search } from 'lucide-react';
import { getNearbyPlaces, type GetNearbyPlacesOutput, type GetNearbyPlacesInput } from '@/ai/flows/get-nearby-places-flow';

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
  };
};

export default function NearbyPage() {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [placesState, setPlacesState] = useState<PlacesState>({});

  const fetchPlaces = useCallback(async (placeType: PlaceType) => {
    if (!userLocation) {
        setLocationError('Could not get location. Please enable location services.');
        return;
    }

    setPlacesState(prev => ({
      ...prev,
      [placeType]: { data: null, isLoading: true, error: null },
    }));

    try {
      const { latitude, longitude } = userLocation;
      const result = await getNearbyPlaces({ latitude, longitude, placeType });
      setPlacesState(prev => ({
        ...prev,
        [placeType]: { data: result.places, isLoading: false, error: null },
      }));
    } catch (e: any) {
      const errorMessage = e.message.includes('429') 
        ? 'Rate limit reached. Please wait a moment.'
        : `Could not fetch ${placeType}. The AI service may be unavailable.`;
      setPlacesState(prev => ({
        ...prev,
        [placeType]: { data: null, isLoading: false, error: errorMessage },
      }));
    }
  }, [userLocation]);

  const handleGetLocation = useCallback(() => {
    setIsLocationLoading(true);
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setIsLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        setIsLocationLoading(false);
      },
      () => {
        setLocationError('Could not get location. Please enable location services.');
        setIsLocationLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    handleGetLocation();
  }, [handleGetLocation]);

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
            <Button onClick={() => fetchPlaces(placeType)} disabled={!userLocation}>
                <Search className="mr-2 h-4 w-4" /> Find
            </Button>
        </div>
    );
  };

  const renderInitialState = () => {
    if (isLocationLoading) {
        return (
            <Card className="flex flex-col items-center justify-center p-8 gap-4 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <CardTitle>Finding Your Location</CardTitle>
                <CardDescription>Please wait while we determine your current position.</CardDescription>
            </Card>
        );
    }

    if (locationError) {
        return (
             <Card className="flex flex-col items-center justify-center p-8 gap-4 text-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <CardTitle>Location Error</CardTitle>
                <CardDescription>{locationError}</CardDescription>
                <Button onClick={handleGetLocation}>
                    <Navigation className="mr-2 h-4 w-4" /> Try Again
                </Button>
            </Card>
        )
    }

    return null;
  }

  if (isLocationLoading || locationError) {
    return (
        <div className="w-full max-w-4xl mx-auto">
            {renderInitialState()}
        </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Nearby Places</h1>
        <p className="text-muted-foreground">Find essential services near your current location.</p>
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
