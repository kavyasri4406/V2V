'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BellRing, BellOff, Volume2, User, Car, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SettingsPage() {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [locationEnabled, setLocationEnabled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setVoiceEnabled(localStorage.getItem('voiceAlertsEnabled') === 'true');
      setDriverName(localStorage.getItem('driverName') || '');
      setVehicleNumber(localStorage.getItem('vehicleNumber') || '');
      setLocationEnabled(localStorage.getItem('locationEnabled') === 'true');
    }
  }, []);

  const handleVoiceToggle = (enabled: boolean) => {
    setVoiceEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('voiceAlertsEnabled', String(enabled));
      window.dispatchEvent(new Event('storage'));
      toast({
        title: `Voice alerts ${enabled ? 'enabled' : 'disabled'}.`,
        description: 'Your changes have been saved.',
      });
    }
  };

  const handleLocationToggle = (enabled: boolean) => {
    setLocationEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('locationEnabled', String(enabled));
      window.dispatchEvent(new Event('storage'));
      toast({
        title: `Location sharing ${enabled ? 'enabled' : 'disabled'}.`,
      });
    }
  };
  
  const handleInfoSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('driverName', driverName);
      localStorage.setItem('vehicleNumber', vehicleNumber);
      toast({
        title: 'Profile Saved',
        description: 'Your driver information has been updated.',
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
            <CardTitle>Driver Profile</CardTitle>
            <CardDescription>This information will be used when you send alerts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="driver-name">Driver Name</Label>
              <div className="flex items-center gap-2">
                <User className="text-muted-foreground" />
                <Input 
                  id="driver-name" 
                  placeholder="e.g., Jane Doe" 
                  value={driverName} 
                  onChange={(e) => setDriverName(e.target.value)} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-number">Vehicle Number</Label>
              <div className="flex items-center gap-2">
                <Car className="text-muted-foreground" />
                <Input 
                  id="vehicle-number" 
                  placeholder="e.g., ABC-123" 
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)} 
                />
              </div>
            </div>
            <Button onClick={handleInfoSave}>Save Profile</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications & Permissions</CardTitle>
            <CardDescription>Manage how you receive alerts and share data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center space-x-3">
                {voiceEnabled ? (
                  <BellRing className="text-primary" />
                ) : (
                  <BellOff className="text-muted-foreground" />
                )}
                <div>
                  <Label htmlFor="voice-alerts" className="cursor-pointer">Voice Alerts</Label>
                  <p className="text-xs text-muted-foreground">Get audible notifications for new alerts.</p>
                </div>
              </div>
              <Switch
                id="voice-alerts"
                checked={voiceEnabled}
                onCheckedChange={handleVoiceToggle}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center space-x-3">
                 <MapPin className={locationEnabled ? "text-primary" : "text-muted-foreground"} />
                 <div>
                    <Label htmlFor="location-sharing" className="cursor-pointer">Location Sharing</Label>
                    <p className="text-xs text-muted-foreground">Share location for more relevant alerts.</p>
                 </div>
              </div>
              <Switch
                id="location-sharing"
                checked={locationEnabled}
                onCheckedChange={handleLocationToggle}
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
