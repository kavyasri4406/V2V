'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Wind, Gauge, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { getPollution, type GetPollutionOutput } from '@/ai/flows/get-pollution-flow';
import { formatDistanceToNow } from 'date-fns';
import { defaultLocation } from '@/lib/location';

const CACHE_KEY = 'pollutionData';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_COOLDOWN_MS = 60 * 1000; // 1 minute

type CachedPollutionData = {
  data: GetPollutionOutput;
  timestamp: number;
};

export function PollutionCard() {
  const [pollutionData, setPollutionData] = useState<GetPollutionOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const handleGetPollution = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    const cachedItem = sessionStorage.getItem(CACHE_KEY);
    if (cachedItem && !forceRefresh) {
      const { data, timestamp } = JSON.parse(cachedItem) as CachedPollutionData;
      if (Date.now() - timestamp < CACHE_DURATION_MS) {
        setPollutionData(data);
        setLastUpdated(new Date(timestamp));
        setIsLoading(false);
        return;
      }
    }
    
    const { latitude, longitude, name } = defaultLocation;

    try {
      const result = await getPollution({ latitude, longitude });
      result.locationName = name; // Override location name
      const now = Date.now();
      setPollutionData(result);
      setLastUpdated(new Date(now));
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, timestamp: now }));
      setError(null);
    } catch (e: any) {
        if (typeof e.message === 'string' && (e.message.includes('429') || e.message.includes('Too Many Requests'))) {
          setError('Rate limit reached. Please wait a moment before trying again.');
          setIsRateLimited(true);
          setTimeout(() => setIsRateLimited(false), RATE_LIMIT_COOLDOWN_MS);
      } else {
          setError('Could not fetch air quality. The AI service may be temporarily unavailable.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    handleGetPollution(false);
  }, [handleGetPollution]);

  const renderContent = () => {
    if (isLoading && !pollutionData) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <div className="flex justify-between">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-6 w-1/4" />
          </div>
          <Skeleton className="h-4 w-full" />
        </div>
      );
    }

    if (error) {
        return (
            <div className="text-center text-destructive flex flex-col items-center gap-4">
                <AlertCircle className="h-8 w-8" />
                <p>{error}</p>
                {!isRateLimited && (
                    <Button variant="outline" onClick={() => handleGetPollution(true)}>Try Again</Button>
                )}
            </div>
        );
    }
    
    if (pollutionData) {
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-start">
             <div>
                <p className="text-muted-foreground">{pollutionData.locationName}</p>
                <CardDescription>Air Quality Index</CardDescription>
            </div>
             <Button
                variant="ghost"
                size="icon"
                onClick={() => handleGetPollution(true)}
                disabled={isLoading || isRateLimited}
                aria-label="Refresh Air Quality"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{pollutionData.aqi}</span>
            <span className="text-muted-foreground">AQI</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-primary" />
              <span>Dominant Pollutant: <strong>{pollutionData.dominantPollutant}</strong></span>
            </div>
             <div className="flex items-center gap-2 pt-2">
                <AlertCircle className="h-4 w-4 text-accent" />
                <p>{pollutionData.healthAdvisory}</p>
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
            <p className="text-muted-foreground">Get real-time air quality information for your location.</p>
            <Button onClick={() => handleGetPollution(false)} disabled={isLoading || isRateLimited}>
                 {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gauge className="mr-2" />}
                Get Air Quality
            </Button>
        </div>
    );
  };

  return (
    <Card className="animate-in fade-in-0 delay-500 duration-500">
      <CardHeader>
            <CardTitle>Air Quality</CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
