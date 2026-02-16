'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Droplet, Wind, RefreshCw, AlertCircle, MapPin, Loader2 } from 'lucide-react';
import { getWeather, type GetWeatherOutput } from '@/ai/flows/get-weather-flow';
import { WeatherIcon } from './weather-icon';
import { formatDistanceToNow } from 'date-fns';
import { defaultLocation } from '@/lib/location';

const CACHE_KEY = 'weatherData';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_COOLDOWN_MS = 60 * 1000; // 1 minute

type CachedWeatherData = {
  data: GetWeatherOutput;
  timestamp: number;
};

export function WeatherCard() {
  const [weatherData, setWeatherData] = useState<GetWeatherOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const handleGetWeather = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    
    const cachedItem = sessionStorage.getItem(CACHE_KEY);
    if (cachedItem && !forceRefresh) {
        const { data, timestamp } = JSON.parse(cachedItem) as CachedWeatherData;
        if (Date.now() - timestamp < CACHE_DURATION_MS) {
            setWeatherData(data);
            setLastUpdated(new Date(timestamp));
            setIsLoading(false);
            return;
        }
    }

    const { latitude, longitude, name } = defaultLocation;

    // Share location globally
    const locationEvent = new CustomEvent('locationUpdated', { detail: { latitude, longitude } });
    window.dispatchEvent(locationEvent);
    sessionStorage.setItem('userLocation', JSON.stringify({ latitude, longitude }));

    try {
      const result = await getWeather({ latitude, longitude });
      result.locationName = name; // Override location name
      const now = Date.now();
      setWeatherData(result);
      setLastUpdated(new Date(now));
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, timestamp: now }));
      setError(null);
    } catch (e: any) {
        if (typeof e.message === 'string' && (e.message.includes('429') || e.message.includes('Too Many Requests'))) {
          setError('Rate limit reached. Please wait a moment before trying again.');
          setIsRateLimited(true);
          setTimeout(() => setIsRateLimited(false), RATE_LIMIT_COOLDOWN_MS);
      } else {
          setError('Could not fetch weather. The AI service may be temporarily unavailable.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    handleGetWeather(false);
  }, [handleGetWeather]);


  const renderContent = () => {
    if (isLoading && !weatherData) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <div className="flex justify-between">
            <Skeleton className="h-12 w-12" />
            <Skeleton className="h-12 w-1/4" />
          </div>
          <div className="flex justify-around">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-6 w-1/4" />
          </div>
        </div>
      );
    }
    
    if (error) {
        return (
            <div className="text-center text-destructive flex flex-col items-center gap-4">
                <AlertCircle className="h-8 w-8" />
                <p>{error}</p>
                {!isRateLimited && (
                    <Button variant="outline" onClick={() => handleGetWeather(true)}>Try Again</Button>
                )}
            </div>
        );
    }

    if (weatherData) {
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground">{weatherData.locationName}</p>
              <CardDescription>{weatherData.condition}</CardDescription>
            </div>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => handleGetWeather(true)}
                disabled={isLoading || isRateLimited}
                aria-label="Refresh Weather"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WeatherIcon condition={weatherData.condition} className="h-12 w-12 text-accent" />
              <span className="text-4xl font-bold">{weatherData.temperature.toFixed(0)}°C</span>
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Droplet className="h-4 w-4" />
              <span>{weatherData.humidity}%</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Wind className="h-4 w-4" />
              <span>{weatherData.windSpeed.toFixed(1)} km/h</span>
            </div>
          </div>
           {lastUpdated && (
            <p className="text-xs text-muted-foreground text-right pt-2">
              Last updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </p>
          )}
        </div>
      );
    }

    return (
        <div className="text-center flex flex-col items-center gap-4">
            <p className="text-muted-foreground">Get real-time weather updates for your current location.</p>
            <Button onClick={() => handleGetWeather(false)} disabled={isLoading || isRateLimited}>
                 {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2" />}
                Get Weather
            </Button>
        </div>
    );
  };

  return (
    <Card className="animate-in fade-in-0 delay-300 duration-500">
        <CardHeader>
            <CardTitle>Current Weather</CardTitle>
        </CardHeader>
        <CardContent>
            {renderContent()}
        </CardContent>
    </Card>
  );
}
