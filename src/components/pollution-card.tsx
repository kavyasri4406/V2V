'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getPollution, type GetPollutionOutput } from '@/ai/flows/get-pollution-flow';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, Wind, Leaf, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type CachedPollution = {
  data: GetPollutionOutput & { lat: number; lon: number };
  timestamp: number;
};

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function PollutionCard() {
  const [pollution, setPollution] = useState<GetPollutionOutput | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'loading'>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  useEffect(() => {
    const checkCacheAndPermissions = () => {
      setIsLoading(true);
      const cached = sessionStorage.getItem('pollutionCache');
      if (cached) {
        const { data, timestamp }: CachedPollution = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION_MS) {
          setPollution(data);
          setLastUpdated(timestamp);
          const locationData = { latitude: data.lat, longitude: data.lon };
          window.dispatchEvent(new CustomEvent('locationUpdated', { detail: locationData }));
        }
      }
  
      if (navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
          setPermissionStatus(result.state);
          result.onchange = () => setPermissionStatus(result.state);
        });
      } else {
        setPermissionStatus('prompt');
      }
      setIsLoading(false);
    };

    checkCacheAndPermissions();
  }, []);

  const handleGetPollution = async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    if (!forceRefresh) {
      const cached = sessionStorage.getItem('pollutionCache');
      if (cached) {
        const { data, timestamp }: CachedPollution = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION_MS) {
          setPollution(data);
          setLastUpdated(timestamp);
          setIsLoading(false);
          return;
        }
      }
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const locationData = { latitude, longitude };
          
          window.dispatchEvent(new CustomEvent('locationUpdated', { detail: locationData }));
          sessionStorage.setItem('userLocation', JSON.stringify(locationData));
          
          const pollutionData = await getPollution({ lat: latitude, lon: longitude });
          const now = Date.now();
          setPollution(pollutionData);
          setLastUpdated(now);
          sessionStorage.setItem('pollutionCache', JSON.stringify({ data: { ...pollutionData, lat: latitude, lon: longitude }, timestamp: now }));
        } catch (e: any) {
          console.error(e);
          const errorMessage = e.message || 'An unknown error occurred.';
          if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
            setError('Rate limit reached. Please wait a moment before trying again.');
            setIsRateLimited(true);
            setTimeout(() => setIsRateLimited(false), 60000); // Cooldown for 1 minute
          } else {
            setError('Could not fetch air quality. The AI service may be temporarily unavailable.');
          }
          setPollution(null);
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        setError('Could not get location. Please enable it in your browser settings.');
        setIsLoading(false);
      }
    );
  };

  const getAqiColor = (aqi: number) => {
    if (aqi <= 50) return 'text-green-500';
    if (aqi <= 100) return 'text-yellow-500';
    if (aqi <= 150) return 'text-orange-500';
    if (aqi <= 200) return 'text-red-500';
    if (aqi <= 300) return 'text-purple-500';
    return 'text-red-700'; // Hazardous
  }
  
  const renderContent = () => {
    if (permissionStatus === 'loading' || (isLoading && !pollution)) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16" />
            <Skeleton className="h-10 w-24" />
          </div>
          <Skeleton className="h-4 w-1/2" />
        </div>
      );
    }
  
    if (error) {
      return (
        <div className="text-center text-destructive flex flex-col items-center gap-4">
          <AlertCircle className="h-8 w-8" />
          <p>{error}</p>
          {!isRateLimited && <Button onClick={() => handleGetPollution(true)}>Retry</Button>}
        </div>
      );
    }
    
    if (pollution) {
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className={cn("text-2xl", getAqiColor(pollution.aqi))}>{pollution.level}</CardTitle>
              <CardDescription>Dominant: {pollution.dominantPollutant}</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleGetPollution(true)} disabled={isLoading || isRateLimited}>
               {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="sr-only">Refresh Air Quality</span>
            </Button>
          </div>
          <div className={cn("flex items-center gap-4 text-5xl font-bold", getAqiColor(pollution.aqi))}>
            <Wind className="h-16 w-16" />
            <span>{Math.round(pollution.aqi)}</span>
            <span className="text-2xl text-muted-foreground">AQI</span>
          </div>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Leaf className="h-4 w-4" />
              <span>{pollution.recommendations}</span>
            </div>
          </div>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground pt-2">
              Last updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}.
            </p>
          )}
        </div>
      );
    }
    
    if (permissionStatus === 'denied') {
      return (
        <div className="text-center text-destructive flex flex-col items-center gap-4">
          <AlertCircle className="h-8 w-8" />
          <p>Location access denied. Please enable it in your browser settings to see local air quality.</p>
        </div>
      );
    }

    return (
      <div className="text-center flex flex-col items-center gap-4">
        <MapPin className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Check the air quality for your location.</p>
        <Button onClick={() => handleGetPollution()} disabled={isLoading || isRateLimited}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Get Air Quality
        </Button>
      </div>
    );
  };

  return (
    <Card className="animate-in fade-in-0 delay-200 duration-500">
      <CardHeader>
        <CardTitle>Pollution Index</CardTitle>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
