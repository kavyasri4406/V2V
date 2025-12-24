'use client';

import { useState, useCallback, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { getNearbyPlaces } from '@/ai/flows/get-nearby-places-flow';
import type { GetNearbyPlacesOutput, GetNearbyPlacesInput } from '@/ai/flows/nearby-places-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Loader2, MapPin, Hospital, Fuel, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Place = GetNearbyPlacesOutput['places'][0];
type PlaceCategory = 'Hospitals' | 'Gas Stations' | 'Mechanics';

const placeCategories: { name: PlaceCategory; icon: React.ElementType, query: string }[] = [
  { name: 'Hospitals', icon: Hospital, query: 'hospital' },
  { name: 'Gas Stations', icon: Fuel, query: 'gas station' },
  { name: 'Mechanics', icon: Wrench, query: 'auto repair mechanic' },
];

export default function NearbyPage() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<PlaceCategory | null>(null);
  const { toast } = useToast();

  const handleSearch = useCallback(async (category: PlaceCategory, query: string) => {
    setActiveCategory(category);
    setIsLoading(true);
    setError(null);
    setPlaces([]);
    setSelectedPlace(null);

    const getLocation = new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (userLocation) {
        resolve(userLocation);
        return;
      }
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newUserLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(newUserLocation);
          resolve(newUserLocation);
        },
        () => {
          reject(new Error('Could not get your location. Please enable location services.'));
        }
      );
    });

    try {
      const location = await getLocation;
      const input: GetNearbyPlacesInput = {
        latitude: location.lat,
        longitude: location.lng,
        placeType: query,
      };
      const result = await getNearbyPlaces(input);
      setPlaces(result.places);
      if (result.places.length === 0) {
        toast({
            title: 'No places found',
            description: `The AI couldn't find any nearby ${category.toLowerCase()}.`,
        });
      }
    } catch (e: any) {
      const errorMessage = e.message || 'An unexpected error occurred.';
      if (typeof errorMessage === 'string' && (errorMessage.includes('429') || errorMessage.includes('Too Many Requests'))) {
        setError('Rate limit reached. Please wait a moment before trying again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userLocation, toast]);
  
  useEffect(() => {
    // Center map on selected place
    if (selectedPlace) {
        setUserLocation({ lat: selectedPlace.latitude, lng: selectedPlace.longitude });
    }
  }, [selectedPlace]);


  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-lg text-center">
            <CardHeader>
                <CardTitle>Configuration Error</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-destructive">The Google Maps API key is missing. Please ask the developer to configure it.</p>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-10rem)]">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Nearby Places</CardTitle>
              <CardDescription>Find essential services near your location.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2">
              {placeCategories.map(({ name, icon: Icon, query }) => (
                <Button
                  key={name}
                  variant={activeCategory === name ? 'default' : 'outline'}
                  onClick={() => handleSearch(name, query)}
                  disabled={isLoading && activeCategory === name}
                >
                  {isLoading && activeCategory === name ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="mr-2 h-4 w-4" />
                  )}
                  {name}
                </Button>
              ))}
            </CardContent>
          </Card>
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>{activeCategory ? `Showing nearby ${activeCategory.toLowerCase()}`: 'Select a category to search'}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1">
                    <div className="p-6 pt-0 space-y-4">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="h-3 w-48" />
                                </div>
                            </div>
                        ))
                    ) : error ? (
                        <div className="text-destructive text-center flex flex-col items-center gap-2 py-8">
                            <AlertCircle className="h-8 w-8" />
                            <p>{error}</p>
                        </div>
                    ) : places.length > 0 ? (
                        places.map((place) => (
                            <div
                            key={place.name + place.address}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedPlace?.name === place.name ? 'bg-primary/20' : 'hover:bg-muted'}`}
                            onClick={() => setSelectedPlace(place)}
                            >
                            <p className="font-semibold">{place.name}</p>
                            <p className="text-sm text-muted-foreground">{place.address}</p>
                            </div>
                        ))
                    ) : (
                        <div className="text-muted-foreground text-center py-8">
                           {activeCategory ? 'No places found.' : 'Results will appear here.'}
                        </div>
                    )}
                    </div>
                </ScrollArea>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2 rounded-lg overflow-hidden border">
           <Map
                mapId="v2v-nearby-map"
                defaultZoom={12}
                defaultCenter={{ lat: 40.7128, lng: -74.0060 }}
                center={userLocation}
                gestureHandling={'greedy'}
                disableDefaultUI={true}
            >
                {userLocation && (
                    <AdvancedMarker position={userLocation} title="Your Location">
                         <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg" />
                    </AdvancedMarker>
                )}
                {places.map((place) => (
                    <AdvancedMarker
                        key={place.name}
                        position={{ lat: place.latitude, lng: place.longitude }}
                        onClick={() => setSelectedPlace(place)}
                        title={place.name}
                    >
                        <Pin 
                            background={selectedPlace?.name === place.name ? 'hsl(var(--primary))' : '#FF5252'}
                            glyphColor={'#fff'}
                            borderColor={selectedPlace?.name === place.name ? 'hsl(var(--primary))' : '#D32F2F'}
                        />
                    </AdvancedMarker>
                ))}
            </Map>
        </div>
      </div>
    </APIProvider>
  );
}
