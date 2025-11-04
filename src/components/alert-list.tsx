"use client";

import { useState, useEffect } from "react";
import {
  getDatabase,
  ref,
  onChildAdded,
  off,
  query,
  limitToLast,
} from "firebase/database";
import { app } from "@/lib/firebase";
import type { Alert, FirebaseAlert } from "@/lib/types";
import { AlertCard } from "./alert-card";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { BellRing, BellOff } from "lucide-react";

export default function AlertList() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  useEffect(() => {
    const db = getDatabase(app);
    const alertsRef = query(ref(db, "alerts"), limitToLast(20));

    const handleNewAlert = (snapshot: any) => {
      const newAlertData = snapshot.val() as FirebaseAlert;
      const newAlert: Alert = {
        id: snapshot.key,
        ...newAlertData,
        timestamp: newAlertData.timestamp as number,
      };

      setAlerts((prevAlerts) => [newAlert, ...prevAlerts]);
      setIsLoading(false);

      if (
        voiceEnabled &&
        typeof window !== "undefined" &&
        window.speechSynthesis
      ) {
        const utterance = new SpeechSynthesisUtterance(
          `Alert: ${newAlert.type}. ${newAlert.message}`
        );
        window.speechSynthesis.speak(utterance);
      }
    };

    onChildAdded(alertsRef, handleNewAlert);

    // Set a timeout to handle the case where there are no alerts
    const timer = setTimeout(() => setIsLoading(false), 3000);

    return () => {
      off(alertsRef, "child_added", handleNewAlert);
      clearTimeout(timer);
    };
  }, [voiceEnabled]);

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
          ) : alerts.length > 0 ? (
            alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
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
