'use client';

import { useState, useEffect } from 'react';
import {
  getWeather,
  type GetWeatherOutput,
} from '@/ai/flows/get-weather-flow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { WeatherIcon } from './weather-icon';

type WeatherState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: GetWeatherOutput & { latitude?: number, longitude?: number } }
  | { status: 'error'; message: string };

const CACHE_KEY = 'weatherData';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export function WeatherCard() {
  const [weather, setWeather] = useState<WeatherState>({ status: 'loading' });
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  useEffect(() => {
    // 1. Check for cached data first
    const cachedData = sessionStorage.getItem(CACHE_KEY);
    if (cachedData) {
        try {
            const { data, timestamp } = JSON.parse(cachedData);
            if (Date.now() - timestamp < CACHE_DURATION) {
                setWeather({ status: 'success', data });
                setPermissionState('granted');
                if (data.latitude && data.longitude) {
                    window.dispatchEvent(new CustomEvent('locationUpdated', { detail: { latitude: data.latitude, longitude: data.longitude } }));
                }
                return; // Exit if valid cache found
            }
        } catch (e) {
            console.error("Failed to parse weather cache", e);
            sessionStorage.removeItem(CACHE_KEY);
        }
    }

    // 2. Check geolocation permission status if no valid cache
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionState(result.state);
        if (result.state === 'denied') {
            setWeather({ status: 'error', message: 'Location permission denied.' });
        } else {
            // No cached data and permission is not denied, so wait for user to click button.
            setWeather({ status: 'idle' });
        }
        result.onchange = () => {
            setPermissionState(result.state);
            if(result.state === 'denied') {
                setWeather({ status: 'error', message: 'Location permission denied.' });
                sessionStorage.removeItem(CACHE_KEY); // Clear cache if permission is revoked
            } else {
                 setWeather({ status: 'idle' });
            }
        };
      });
    } else {
      // Fallback for older browsers
      setWeather({ status: 'idle' });
    }
  }, []);

  const handleGetWeather = (forceRefresh = false) => {
    if (forceRefresh) {
        sessionStorage.removeItem(CACHE_KEY);
    }
    setWeather({ status: 'loading' });

    if (!navigator.geolocation) {
      setWeather({ status: 'error', message: 'Geolocation is not supported.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const weatherData = await getWeather({ latitude, longitude });
          const dataToCache = { data: { ...weatherData, latitude, longitude }, timestamp: Date.now() };
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(dataToCache));
          setWeather({ status: 'success', data: dataToCache.data });
          window.dispatchEvent(new CustomEvent('locationUpdated', { detail: { latitude, longitude } }));

        } catch (error) {
          console.error('Weather fetching error:', error);
          setWeather({
            status: 'error',
            message: 'Could not fetch weather data.',
          });
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionState('denied');
          setWeather({
            status: 'error',
            message: 'Location permission denied.',
          });
        } else {
          setWeather({ status: 'error', message: 'Could not get location.' });
        }
      }
    );
  };

  const renderContent = () => {
    switch (weather.status) {
      case 'idle':
        return (
          <div className="flex flex-col items-center justify-center text-center h-full">
            <MapPin className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              Get current weather for your location.
            </p>
            <Button onClick={() => handleGetWeather()}>
               Get Weather
            </Button>
          </div>
        );
      case 'loading':
        return (
          <div className="flex items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col items-center justify-center text-center h-full text-destructive">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p className="text-sm font-medium">{weather.message}</p>
            {permissionState === 'denied' && (
              <p className="text-xs text-muted-foreground mt-1">
                Please enable location access in your browser settings.
              </p>
            )}
            {weather.message !== 'Location permission denied.' && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => handleGetWeather()}>
                Try Again
              </Button>
            )}
          </div>
        );
      case 'success':
        const { data } = weather;
        return (
          <div className="flex items-center gap-4 w-full">
            <WeatherIcon condition={data.condition} className="h-10 w-10 text-primary" />
            <div className="flex-1 overflow-hidden">
              <div className="text-3xl font-bold">
                {Math.round(data.temperature)}&deg;C
              </div>
              <div className="text-sm text-muted-foreground truncate" title={data.location}>{data.location}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleGetWeather(true)} className="shrink-0">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <span className="sr-only">Recheck Location</span>
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="animate-in fade-in-0 delay-200 duration-500">
      <CardHeader>
        <CardTitle>Current Weather</CardTitle>
      </CardHeader>
      <CardContent className="min-h-[110px] flex items-center justify-center">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
