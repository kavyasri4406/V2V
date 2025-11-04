"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, limit, Timestamp } from "firebase/firestore";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import type { Alert } from "@/lib/types";
import { AlertCard } from "./alert-card";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { BellRing, BellOff } from "lucide-react";

export default function AlertList() {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const firestore = useFirestore();

  const alertsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, "alerts"),
            orderBy("timestamp", "desc"),
            limit(20)
          )
        : null,
    [firestore]
  );

  const { data: alerts, isLoading } = useCollection<Omit<Alert, "id" | "timestamp"> & { timestamp: Timestamp | null }>(alertsQuery);

  const processedAlerts = useMemo(() => {
    return alerts?.map(doc => ({
      ...doc,
      timestamp: doc.timestamp ? doc.timestamp.toDate().getTime() : Date.now(),
    })).sort((a, b) => b.timestamp - a.timestamp) ?? [];
  }, [alerts]);

  useEffect(() => {
    if (
      processedAlerts.length > 0 &&
      voiceEnabled &&
      typeof window !== "undefined" &&
      window.speechSynthesis
    ) {
      const latestAlert = processedAlerts[0];
      const utterance = new SpeechSynthesisUtterance(
        `Alert: ${latestAlert.type}. ${latestAlert.message}`
      );
      window.speechSynthesis.speak(utterance);
    }
  }, [processedAlerts, voiceEnabled]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Live Alert Feed</CardTitle>
        <div className="flex items-center space-x-2">
          {voiceEnabled ? (
            <BellRing className="text-primary-foreground" />
          ) : (
            <BellOff className="text-muted-foreground" />
          )}
          <Label htmlFor="voice-alerts">Voice Alerts</Label>
          <Switch
            id="voice-alerts"
            checked={voiceEnabled}
            onCheckedChange={setVoiceEnabled}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground text-center">
              Listening for alerts...
            </p>
          ) : processedAlerts.length > 0 ? (
            processedAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
          ) : (
            <p className="text-muted-foreground text-center">
              No recent alerts. The channel is clear.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
