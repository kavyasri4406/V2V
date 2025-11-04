"use client";

import { useMemo, useEffect } from "react";
import { collection, query, where, orderBy, limit, Timestamp } from "firebase/firestore";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import type { Alert } from "@/lib/types";
import { AlertCard } from "./alert-card";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

type AlertListProps = {
  filterByType?: string;
  voiceEnabled?: boolean;
};

export default function AlertList({ filterByType, voiceEnabled }: AlertListProps) {
  const firestore = useFirestore();

  const alertsQuery = useMemoFirebase(
    () => {
      if (!firestore) return null;
      const coll = collection(firestore, "alerts");
      if (filterByType) {
        return query(
          coll,
          where("type", "==", filterByType),
          orderBy("timestamp", "desc"),
          limit(20)
        );
      }
      return query(coll, orderBy("timestamp", "desc"), limit(20));
    },
    [firestore, filterByType]
  );

  const { data: alerts, isLoading } = useCollection<Omit<Alert, "id" | "timestamp"> & { timestamp: Timestamp | null }>(alertsQuery);

  const processedAlerts = useMemo(() => {
    if (!alerts) return [];
    return alerts?.map(doc => ({
      ...doc,
      timestamp: doc.timestamp instanceof Timestamp ? doc.timestamp.toMillis() : 0,
    })).filter(alert => alert.timestamp > 0)
    .sort((a, b) => b.timestamp - a.timestamp) ?? [];
  }, [alerts]);

  useEffect(() => {
    if (
      processedAlerts.length > 0 &&
      voiceEnabled &&
      typeof window !== "undefined" &&
      window.speechSynthesis
    ) {
      const latestAlert = processedAlerts[0];
      if (latestAlert?.message) {
        const utterance = new SpeechSynthesisUtterance(
          `Alert: ${latestAlert.message}`
        );
        window.speechSynthesis.speak(utterance);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processedAlerts, voiceEnabled]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{filterByType ? `${filterByType} Alerts` : 'Live Alert Feed'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
             Array.from({ length: 3 }).map((_, i) => (
                <div className="flex items-center space-x-4 p-4" key={i}>
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                    </div>
                </div>
            ))
          ) : processedAlerts.length > 0 ? (
            processedAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No recent alerts to display.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
