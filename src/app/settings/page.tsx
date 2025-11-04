'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BellRing, BellOff } from 'lucide-react';
import AlertList from '@/components/alert-list';

export default function SettingsPage() {
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="w-full max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Manage how you receive alerts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center space-x-2">
                {voiceEnabled ? (
                  <BellRing className="text-primary" />
                ) : (
                  <BellOff className="text-muted-foreground" />
                )}
                <Label htmlFor="voice-alerts">Voice Alerts</Label>
              </div>
              <Switch
                id="voice-alerts"
                checked={voiceEnabled}
                onCheckedChange={setVoiceEnabled}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* This is a hidden AlertList to handle text-to-speech without showing a feed */}
      <div className="hidden">
        <AlertList voiceEnabled={voiceEnabled} />
      </div>
    </div>
  );
}
