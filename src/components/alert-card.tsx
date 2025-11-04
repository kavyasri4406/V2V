"use client";

import type { Alert } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { AlertIcon } from "./alert-icon";

type AlertCardProps = {
  alert: Alert;
};

export function AlertCard({ alert }: AlertCardProps) {
  return (
    <Card className="animate-in fade-in-0 duration-500">
      <CardContent className="p-4 flex items-start gap-4">
        <div className="p-3 rounded-full bg-accent/10 text-accent">
          <AlertIcon type={alert.type} className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between items-center">
            <p className="font-semibold text-card-foreground">{alert.type}</p>
            {alert.timestamp ? (
                <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(alert.timestamp), {
                    addSuffix: true,
                })}
                </p>
            ) : (
                <p className="text-xs text-muted-foreground">Just now</p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{alert.message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
