"use client";

import type { Alert } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { AlertIcon } from "./alert-icon";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertCardProps = {
  alert: Alert & { distance?: number };
};

export function AlertCard({ alert }: AlertCardProps) {
  return (
    <Card className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50 overflow-hidden animate-in fade-in slide-in-from-right-4">
      <CardContent className="p-5 flex items-start gap-4">
        <div className="p-4 rounded-2xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white transition-colors duration-300">
          <AlertIcon message={alert.message} className="h-6 w-6" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold text-foreground">
                {alert.driver_name} 
                <span className="ml-2 font-medium text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {alert.sender_vehicle}
                </span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">
                {formatDistanceToNow(new Date(alert.timestamp), {
                    addSuffix: true,
                })}
              </p>
              {alert.distance !== undefined && (
                <div className="flex items-center text-[11px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md">
                  <MapPin className="h-3 w-3 mr-1" />
                  <span>{alert.distance.toFixed(1)} km</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground/90 leading-relaxed pt-1">
            {alert.message}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
