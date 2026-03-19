'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BellRing, BellOff, Volume2, User, Car, MapPin, Loader2, Moon, Sun, Activity, Share, Smartphone, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser, useFirestore, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';


export default function SettingsPage() {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [collisionDetectionEnabled, setCollisionDetectionEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setVoiceEnabled(localStorage.getItem('voiceAlertsEnabled') === 'true');
      setLocationEnabled(localStorage.getItem('locationEnabled') === 'true');
      setCollisionDetectionEnabled(localStorage.getItem('collisionDetectionEnabled') === 'true');
      setIsDarkMode(localStorage.getItem('theme') === 'dark');
      
      // Detect if app is installed as a PWA
      setIsStandalone(
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true
      );
    }
  }, []);

  useEffect(() => {
    if (userProfile) {
      setDriverName(userProfile.driverName || '');
      setVehicleNumber(userProfile.vehicleNumber || '');
    }
  }, [userProfile]);

  const handleVoiceToggle = (enabled: boolean) => {
    setVoiceEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('voiceAlertsEnabled', String(enabled));
      window.dispatchEvent(new Event('storage'));
      toast({ title: `Voice alerts ${enabled ? 'enabled' : 'disabled'}.` });
    }
  };

  const handleDarkModeToggle = (enabled: boolean) => {
    setIsDarkMode(enabled);
    if (typeof window !== 'undefined') {
      const theme = enabled ? 'dark' : 'light';
      localStorage.setItem('theme', theme);
      if (enabled) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      toast({ title: `${enabled ? 'Dark' : 'Light'} mode activated.` });
    }
  };

  const handleLocationToggle = (enabled: boolean) => {
    setLocationEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('locationEnabled', String(enabled));
      window.dispatchEvent(new Event('storage'));
      toast({ title: `Location sharing ${enabled ? 'enabled' : 'disabled'}.` });
    }
  };

  const handleCollisionToggle = async (enabled: boolean) => {
    if (enabled && typeof DeviceMotionEvent !== 'undefined' && (DeviceMotionEvent as any).requestPermission) {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission !== 'granted') {
          toast({ variant: 'destructive', title: 'Permission Denied', description: 'Motion sensor access is required for collision detection.' });
          return;
        }
      } catch (e) {
        console.error('Permission request failed', e);
      }
    }
    
    setCollisionDetectionEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('collisionDetectionEnabled', String(enabled));
      window.dispatchEvent(new Event('storage'));
      toast({ title: `Collision detection ${enabled ? 'enabled' : 'disabled'}.` });
    }
  };
  
  const handleInfoSave = async () => {
    if (!user || !firestore || !userProfileRef) {
        toast({ variant: 'destructive', title: 'You must be logged in to save your profile.'});
        return;
    }
    setIsSaving(true);
    const profileData = { driverName, vehicleNumber };

    setDoc(userProfileRef, profileData, { merge: true }).then(() => {
        toast({ title: 'Profile Saved', description: 'Your driver information has been updated.' });
    }).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userProfileRef.path,
            operation: 'update',
            requestResourceData: profileData,
          }));
    }).finally(() => {
        setIsSaving(false);
    })
  };

  return (
      <div className="w-full max-w-2xl mx-auto space-y-8 pb-12">
        <h1 className="text-3xl font-black tracking-tighter uppercase italic">Settings</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest">Driver Profile</CardTitle>
            <CardDescription>Broadcast identity settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="driver-name" className="text-[10px] font-black uppercase tracking-widest opacity-60">Driver Name</Label>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Input 
                  id="driver-name" 
                  placeholder="e.g., Jane Doe" 
                  value={driverName} 
                  onChange={(e) => setDriverName(e.target.value)}
                  disabled={isProfileLoading || isSaving}
                  className="font-bold italic"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-number" className="text-[10px] font-black uppercase tracking-widest opacity-60">Vehicle Number</Label>
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <Input 
                  id="vehicle-number" 
                  placeholder="e.g., ABC-123" 
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  disabled={isProfileLoading || isSaving}
                  className="font-bold italic"
                />
              </div>
            </div>
            <Button onClick={handleInfoSave} disabled={isProfileLoading || isSaving || !user} className="w-full font-black uppercase tracking-widest">
                {isSaving ? <Loader2 className="animate-spin" /> : 'Update Profile'}
            </Button>
          </CardContent>
        </Card>

        <Card className={cn(isStandalone ? "border-primary/20" : "border-accent/40 bg-accent/5")}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className={cn("h-5 w-5", isStandalone ? "text-primary" : "text-accent")} />
              <CardTitle className="text-sm font-black uppercase tracking-widest">Mobile App Setup</CardTitle>
            </div>
            <CardDescription>
              {isStandalone ? "V2V is running in Standalone Mode." : "Run V2V as a dedicated mobile application."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isStandalone ? (
              <div className="p-4 rounded-lg bg-card border border-border/50 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-accent/10 p-2 rounded-md">
                    <Share className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tighter">iOS (Safari)</p>
                    <p className="text-[11px] text-muted-foreground">Tap the Share icon, then select <span className="font-bold text-foreground">"Add to Home Screen"</span>.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-md">
                    <Smartphone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tighter">Android (Chrome)</p>
                    <p className="text-[11px] text-muted-foreground">Tap the menu (3 dots), then select <span className="font-bold text-foreground">"Install App"</span>.</p>
                  </div>
                </div>
                <div className="pt-2 flex items-center gap-2 border-t border-border/40">
                  <Info className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[9px] font-bold uppercase text-muted-foreground leading-tight">
                    Running as an app enables better sensor performance and removes the browser address bar.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                <div className="bg-primary/20 p-2 rounded-full">
                  <Activity className="h-4 w-4 text-primary animate-pulse" />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-primary">Native App Mode Enabled</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest">Safety Features</CardTitle>
            <CardDescription>Manage intelligent safety monitoring.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4 bg-card">
              <div className="flex items-center space-x-3">
                <Activity className={collisionDetectionEnabled ? "text-primary" : "text-muted-foreground"} />
                <div>
                  <Label htmlFor="collision-detection" className="cursor-pointer text-xs font-black uppercase tracking-tighter">Collision Detection</Label>
                  <p className="text-[10px] text-muted-foreground font-medium">Automatic SOS broadcast on high impact.</p>
                </div>
              </div>
              <Switch
                id="collision-detection"
                checked={collisionDetectionEnabled}
                onCheckedChange={handleCollisionToggle}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4 bg-card">
              <div className="flex items-center space-x-3">
                 <MapPin className={locationEnabled ? "text-primary" : "text-muted-foreground"} />
                 <div>
                    <Label htmlFor="location-sharing" className="cursor-pointer text-xs font-black uppercase tracking-tighter">Location Sharing</Label>
                    <p className="text-[10px] text-muted-foreground font-medium">Attach coordinates to your broadcasts.</p>
                 </div>
              </div>
              <Switch
                id="location-sharing"
                checked={locationEnabled}
                onCheckedChange={handleLocationToggle}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest">Appearance & Sound</CardTitle>
            <CardDescription>Customize your interface.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4 bg-card">
              <div className="flex items-center space-x-3">
                {isDarkMode ? <Moon className="text-primary" /> : <Sun className="text-accent" />}
                <div>
                  <Label htmlFor="dark-mode" className="cursor-pointer text-xs font-black uppercase tracking-tighter">Dark Mode</Label>
                </div>
              </div>
              <Switch
                id="dark-mode"
                checked={isDarkMode}
                onCheckedChange={handleDarkModeToggle}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4 bg-card">
              <div className="flex items-center space-x-3">
                {voiceEnabled ? <BellRing className="text-primary" /> : <BellOff className="text-muted-foreground" />}
                <div>
                  <Label htmlFor="voice-alerts" className="cursor-pointer text-xs font-black uppercase tracking-tighter">Voice Alerts</Label>
                </div>
              </div>
              <Switch
                id="voice-alerts"
                checked={voiceEnabled}
                onCheckedChange={handleVoiceToggle}
              />
            </div>
            <Button variant="outline" className="w-full font-bold uppercase tracking-widest" onClick={() => {
              if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance('V2V Voice alerts are active.'));
            }} disabled={!voiceEnabled}>
              <Volume2 className="mr-2 h-4 w-4" /> Test System Voice
            </Button>
          </CardContent>
        </Card>
      </div>
  );
}
