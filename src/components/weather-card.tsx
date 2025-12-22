'use client';

import { useState, useEffect } from 'react';
import {
  getWeather,
  type GetWeatherOutput,
} from '@/ai/flows/get-weather-flow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, AlertTriangle } from 'lucide-react';
import { WeatherIcon } from './weather-icon';

type WeatherState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: GetWeatherOutput }
  | { status: 'error'; message: string };

export function WeatherCard() {
  const [weather, setWeather] = useState<WeatherState>({ status: 'idle' });
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    // Check for location permission on mount
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'denied') {
          setPermissionDenied(true);
          setWeather({ status: 'error', message: 'Location permission denied.' });
        } else if (result.state === 'granted') {
          handleGetWeather();
        }
        // if prompt, do nothing until user clicks button
      });
    }
  }, []);

  const handleGetWeather = () => {
    setWeather({ status: 'loading' });
    setPermissionDenied(false);

    if (!navigator.geolocation) {
      setWeather({ status: 'error', message: 'Geolocation is not supported.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const weatherData = await getWeather({ latitude, longitude });
          setWeather({ status: 'success', data: weatherData });
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
          setPermissionDenied(true);
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
              Get local weather updates.
            </p>
            <Button onClick={handleGetWeather}>Enable Location</Button>
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
            {permissionDenied && (
              <p className="text-xs text-muted-foreground mt-1">
                Please enable location access in your browser settings.
              </p>
            )}
            {!permissionDenied && (
              <Button variant="outline" size="sm" className="mt-4" onClick={handleGetWeather}>
                Try Again
              </Button>
            )}
          </div>
        );
      case 'success':
        const { data } = weather;
        return (
          <div className="flex items-center gap-4">
            <WeatherIcon condition={data.condition} className="h-10 w-10 text-primary" />
            <div>
              <div className="text-3xl font-bold">
                {Math.round(data.temperature)}&deg;C
              </div>
              <div className="text-sm text-muted-foreground">{data.location}</div>
            </div>
          </div>
        );
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
