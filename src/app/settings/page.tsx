'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BellRing, BellOff, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedValue = localStorage.getItem('voiceAlertsEnabled') === 'true';
      setVoiceEnabled(storedValue);
    }
  }, []);

  const handleToggleChange = (enabled: boolean) => {
    setVoiceEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('voiceAlertsEnabled', String(enabled));
      // Dispatch a storage event to notify other tabs/windows
      window.dispatchEvent(new Event('storage'));
      toast({
        title: `Voice alerts ${enabled ? 'enabled' : 'disabled'}.`,
        description: 'Your changes have been saved across the application.',
      });
    }
  };

  const testVoice = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Voice alert activated.');
      window.speechSynthesis.speak(utterance);
    } else {
      toast({
        variant: 'destructive',
        title: 'Unsupported Browser',
        description: 'Your browser does not support voice synthesis.',
      });
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Manage how you receive alerts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center space-x-2">
              {voiceEnabled ? (
                <BellRing className="text-primary" />
              ) : (
                <BellOff className="text-muted-foreground" />
              )}
              <Label htmlFor="voice-alerts" className="cursor-pointer">Voice Alerts</Label>
            </div>
            <Switch
              id="voice-alerts"
              checked={voiceEnabled}
              onCheckedChange={handleToggleChange}
            />
          </div>
          <Button variant="outline" onClick={testVoice} disabled={!voiceEnabled}>
            <Volume2 className="mr-2" />
            Test Voice Alert
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
