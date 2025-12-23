'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { WeatherIcon } from '@/components/weather-icon';
import { getWeather, type GetWeatherOutput } from '@/ai/flows/get-weather-flow';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, Wind, Droplets, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

type CachedWeather = {
  data: GetWeatherOutput;
  timestamp: number;
};

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function WeatherCard() {
  const [weather, setWeather] = useState<GetWeatherOutput | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'loading'>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  useEffect(() => {
    // This effect now ONLY checks for cached data and permission status on mount.
    // It does NOT automatically fetch weather.
    const checkCacheAndPermissions = () => {
      setIsLoading(true);
      const cached = sessionStorage.getItem('weatherCache');
      if (cached) {
        const { data, timestamp }: CachedWeather = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION_MS) {
          setWeather(data);
          setLastUpdated(timestamp);
          // Also dispatch event for other components that might need location
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
        // Fallback for older browsers
        setPermissionStatus('prompt');
      }
      setIsLoading(false);
    };

    checkCacheAndPermissions();
  }, []);

  const handleGetWeather = async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    // Re-check cache before fetching, unless forcing a refresh.
    if (!forceRefresh) {
      const cached = sessionStorage.getItem('weatherCache');
      if (cached) {
        const { data, timestamp }: CachedWeather = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION_MS) {
          setWeather(data);
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
          
          // Dispatch event with fresh location data
          window.dispatchEvent(new CustomEvent('locationUpdated', { detail: locationData }));
          sessionStorage.setItem('userLocation', JSON.stringify(locationData));
          
          const weatherData = await getWeather({ lat: latitude, lon: longitude });
          const now = Date.now();
          setWeather(weatherData);
          setLastUpdated(now);
          sessionStorage.setItem('weatherCache', JSON.stringify({ data: { ...weatherData, lat: latitude, lon: longitude }, timestamp: now }));
        } catch (e: any) {
          console.error(e);
          const errorMessage = e.message || 'An unknown error occurred.';
          if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
            setError('Rate limit reached. Please wait a moment before trying again.');
            setIsRateLimited(true);
            setTimeout(() => setIsRateLimited(false), 60000); // Cooldown for 1 minute
          } else {
            setError('Could not fetch weather. The AI service may be temporarily unavailable.');
          }
          setWeather(null);
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        setError('Could not get location. Please enable it in your browser or browser settings.');
        setIsLoading(false);
      }
    );
  };
  
  const renderContent = () => {
    if (permissionStatus === 'loading' || isLoading && !weather) {
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
          {!isRateLimited && <Button onClick={() => handleGetWeather(true)}>Retry</Button>}
        </div>
      );
    }
    
    if (weather) {
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{weather.locationName}</CardTitle>
              <CardDescription>{weather.condition}</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleGetWeather(true)} disabled={isLoading || isRateLimited}>
               {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="sr-only">Refresh Weather</span>
            </Button>
          </div>
          <div className="flex items-center gap-4 text-5xl font-bold text-primary">
            <WeatherIcon condition={weather.condition} className="h-16 w-16" />
            <span>{Math.round(weather.temperature)}°C</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Droplets className="h-4 w-4" />
              <span>Humidity: {weather.humidity}%</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wind className="h-4 w-4" />
              <span>Wind: {weather.windSpeed} km/h</span>
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
          <p>Location access denied. Please enable it in your browser settings to see local weather.</p>
        </div>
      );
    }

    // Default state: prompt the user to get weather
    return (
      <div className="text-center flex flex-col items-center gap-4">
        <MapPin className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Get current weather for your location.</p>
        <Button onClick={() => handleGetWeather()} disabled={isLoading || isRateLimited}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Get Weather
        </Button>
      </div>
    );
  };

  return (
    <Card className="animate-in fade-in-0 delay-200 duration-500">
      <CardHeader>
        <CardTitle>Current Weather</CardTitle>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
