"use client";

import type { Alert } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { AlertIcon } from "./alert-icon";
import { getDistance } from "@/lib/utils";
import { MapPin } from "lucide-react";

type AlertCardProps = {
  alert: Alert;
  userLocation: { latitude: number; longitude: number } | null;
};

export function AlertCard({ alert, userLocation }: AlertCardProps) {
  const distance =
    userLocation && alert.latitude && alert.longitude
      ? getDistance(
          userLocation.latitude,
          userLocation.longitude,
          alert.latitude,
          alert.longitude
        )
      : null;

  return (
    <Card className="transition-all hover:shadow-md hover:-translate-y-1 animate-in fade-in-0 duration-300">
      <CardContent className="p-4 flex items-start gap-4">
        <div className="p-3 rounded-full bg-accent/10 text-accent">
          <AlertIcon message={alert.message} className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between items-center">
            <p className="font-semibold text-card-foreground">{alert.driver_name} <span className="font-normal text-muted-foreground">({alert.sender_vehicle})</span></p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(alert.timestamp), {
                  addSuffix: true,
              })}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{alert.message}</p>
          {distance !== null && (
             <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                <MapPin className="h-3 w-3" />
                <span>{distance.toFixed(1)} km away</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
