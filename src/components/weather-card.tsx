'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, MapPin, RefreshCw, Wind, Droplets } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getWeather, type GetWeatherOutput } from '@/ai/flows/get-weather-flow';
import { useToast } from '@/hooks/use-toast';
import { WeatherIcon } from './weather-icon';

type WeatherData = GetWeatherOutput & {
  timestamp: number;
};

const CACHE_KEY = 'weatherData';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export function WeatherCard() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const { toast } = useToast();

  const handleGetWeather = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    if (!forceRefresh) {
      const cachedData = sessionStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const parsed = JSON.parse(cachedData) as WeatherData;
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          setWeather(parsed);
          setIsLoading(false);
          return;
        }
      }
    }
    
    if (typeof navigator.geolocation === 'undefined') {
      setError('Geolocation is not supported by your browser.');
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setPermissionStatus('granted');
        const { latitude, longitude } = position.coords;
        try {
          const weatherData = await getWeather({ latitude, longitude });
          const newWeatherData = { ...weatherData, timestamp: Date.now() };
          setWeather(newWeatherData);
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(newWeatherData));
        } catch (e: any) {
          setError('Could not fetch weather. The AI service may be temporarily unavailable.');
          toast({
            variant: 'destructive',
            title: 'Weather Error',
            description: 'Failed to fetch weather data. Please try again later.',
          });
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        setError('Please enable location access in your browser settings to see local weather.');
        setIsLoading(false);
        setPermissionStatus('denied');
      }
    );
  }, [toast]);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((status) => {
        setPermissionStatus(status.state);
        
        // Only load from cache initially, don't fetch.
        const cachedData = sessionStorage.getItem(CACHE_KEY);
        if (cachedData) {
            const parsed = JSON.parse(cachedData) as WeatherData;
            if (Date.now() - parsed.timestamp < CACHE_DURATION) {
                setWeather(parsed);
            }
        }
        setIsLoading(false);

        status.onchange = () => {
            setPermissionStatus(status.state);
             // If permissions are granted, the user can now click the button
            if (status.state !== 'granted') {
                setWeather(null); // Clear weather if permissions are revoked
            }
        };
      });
    } else {
        setIsLoading(false);
        setError('Geolocation is not available.');
    }
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return <WeatherSkeleton />;
    }

    if (weather) {
      return (
        <>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{weather.locationName}</p>
              <p className="text-4xl font-bold">{Math.round(weather.temperature)}°C</p>
              <p className="text-sm capitalize text-muted-foreground">{weather.condition}</p>
            </div>
            <WeatherIcon condition={weather.condition} className="w-16 h-16 text-accent" />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mt-4">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-primary" />
              <span>Humidity: {weather.humidity}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-primary" />
              <span>Wind: {weather.windSpeed.toFixed(1)} km/h</span>
            </div>
          </div>
           <div className="text-xs text-muted-foreground mt-4 text-right">
              Last updated: {formatDistanceToNow(weather.timestamp, { addSuffix: true })}
            </div>
        </>
      );
    }

    if (error) {
        return (
          <div className="text-center text-destructive p-4 flex flex-col items-center gap-4">
            <AlertTriangle className="w-8 h-8" />
            <p className="font-semibold">Weather Unavailable</p>
            <p className="text-sm">{error}</p>
            <Button onClick={() => handleGetWeather(true)} size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        );
      }

    if (permissionStatus !== 'granted') {
         return (
            <div className="text-center text-muted-foreground p-4 flex flex-col items-center gap-4">
                <MapPin className="w-8 h-8" />
                <p className="font-semibold">Location Access Needed</p>
                <p className="text-sm">Enable location to see local weather.</p>
                <Button onClick={() => handleGetWeather(false)} size="sm">Get Weather</Button>
            </div>
        )
    }

    return (
        <div className="text-center text-muted-foreground p-4 flex flex-col items-center gap-4">
            <MapPin className="w-8 h-8" />
            <p className="font-semibold">Local Weather</p>
            <p className="text-sm">Get the current weather conditions for your location.</p>
            <Button onClick={() => handleGetWeather(false)} size="sm">Get Weather</Button>
        </div>
    );
  };

  return (
    <Card className="animate-in fade-in-0 delay-200 duration-500">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>Weather</span>
           <Button variant="ghost" size="icon" onClick={() => handleGetWeather(true)} disabled={isLoading || !weather}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh Weather</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}

function WeatherSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-16 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
      </div>
       <Skeleton className="h-3 w-28 float-right" />
    </div>
  )
}
