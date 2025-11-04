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
    <Card className="animate-in fade-in-0 duration-500 border-accent/50 bg-accent/10">
      <CardContent className="p-4 flex items-start gap-4">
        <div className="p-2 rounded-full bg-accent/20">
          <AlertIcon type={alert.type} className="h-6 w-6 text-accent-foreground" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-card-foreground">{alert.message}</p>
          {alert.timestamp ? (
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(alert.timestamp), {
                addSuffix: true,
              })}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Just now</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
