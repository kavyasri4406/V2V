
'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { useFirestore, errorEmitter, FirestorePermissionError, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Activity, ShieldAlert, TrafficCone, Car, Ambulance, Trash2, CircleOff, Waves, CloudRain, CloudFog, Wind, Snowflake, XCircle, Siren, Flame, TriangleAlert, Fuel, Hospital, Bike } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { defaultLocation } from '@/lib/location';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const quickActions = [
  { name: 'Collision Ahead', icon: ShieldAlert },
  { name: 'Road Hazard', icon: TrafficCone },
  { name: 'Traffic Jam', icon: Car },
  { name: 'Emergency Vehicle', icon: Ambulance },
  { name: 'Debris on Road', icon: Trash2 },
  { name: 'Pothole', icon: CircleOff },
  { name: 'Slippery Road', icon: Waves },
  { name: 'Heavy Rain', icon: CloudRain },
  { name: 'Fog', icon: CloudFog },
  { name: 'High Winds', icon: Wind },
  { name: 'Icy Conditions', icon: Snowflake },
  { name: 'Broken Down Vehicle', icon: ShieldAlert },
  { name: 'Road Closure', icon: XCircle },
  { name: 'Police Activity', icon: Siren },
  { name: 'Fire', icon: Flame },
  { name: 'General Hazard', icon: TriangleAlert },
  { name: 'Petrol Station', icon: Fuel },
  { name: 'Hospital', icon: Hospital },
  { name: 'Car Repair', icon: Car },
  { name: 'Bike Repair', icon: Bike },
];

export default function DetailedAlertPage() {
  const [submittingType, setSubmittingType] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [collisionDetectionEnabled, setCollisionDetectionEnabled] = useState(false);
  const [isImpactDetected, setIsImpactDetected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setVoiceEnabled(localStorage.getItem('voiceAlertsEnabled') === 'true');
      setLocationEnabled(localStorage.getItem('locationEnabled') === 'true');
      setCollisionDetectionEnabled(localStorage.getItem('collisionDetectionEnabled') === 'true');

      const handleStorageChange = () => {
        setVoiceEnabled(localStorage.getItem('voiceAlertsEnabled') === 'true');
        setLocationEnabled(localStorage.getItem('locationEnabled') === 'true');
        setCollisionDetectionEnabled(localStorage.getItem('collisionDetectionEnabled') === 'true');
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, []);

  const sendAlert = useCallback((alertData: any) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
      setSubmittingType(null);
      return;
    }
    const alertsRef = collection(firestore, 'alerts');
    addDoc(alertsRef, alertData)
      .then(() => {
        toast({ title: 'Alert Sent!', description: `"${alertData.message}" has been broadcasted.` });
        if (voiceEnabled && 'speechSynthesis' in window) {
          window.speechSynthesis.speak(new SpeechSynthesisUtterance(alertData.message));
        }
      })
      .catch(() => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: alertsRef.path,
          operation: 'create',
          requestResourceData: alertData,
        }));
      })
      .finally(() => {
        setSubmittingType(null);
        setIsImpactDetected(false);
        setCountdown(null);
      });
  }, [firestore, toast, voiceEnabled]);

  const handleQuickAction = async (message: string, impactForce?: number) => {
    setSubmittingType(message);
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to send an alert.' });
      setSubmittingType(null);
      return;
    }

    let alertData: any = {
      driver_name: userProfile?.driverName || 'Anonymous',
      sender_vehicle: userProfile?.vehicleNumber || 'N/A',
      message: message,
      timestamp: serverTimestamp(),
      userId: user.uid,
    };

    if (impactForce) alertData.impactForce = impactForce;

    if (locationEnabled) {
      const { latitude, longitude } = defaultLocation;
      alertData = { ...alertData, latitude, longitude };
    }

    sendAlert(alertData);
  };

  // Accelerometer logic
  useEffect(() => {
    if (!collisionDetectionEnabled) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const accel = event.accelerationIncludingGravity;
      if (!accel) return;

      const totalAccel = Math.sqrt(
        (accel.x || 0) ** 2 + (accel.y || 0) ** 2 + (accel.z || 0) ** 2
      );

      // Threshold for collision detection (~2.5G)
      if (totalAccel > 25 && !isImpactDetected) {
        setIsImpactDetected(true);
        setCountdown(5); // 5 second countdown to cancel
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [collisionDetectionEnabled, isImpactDetected]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      handleQuickAction('Automatic Collision Detected!', 25);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const cancelAutoAlert = () => {
    setIsImpactDetected(false);
    setCountdown(null);
    toast({ title: 'Alert Cancelled', description: 'Automatic broadcast stopped.' });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {isImpactDetected && (
        <Card className="bg-destructive text-destructive-foreground animate-pulse border-4 border-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="animate-bounce" /> HIGH IMPACT DETECTED!
            </CardTitle>
            <CardDescription className="text-destructive-foreground/90">
              Broadcasting collision alert in {countdown} seconds...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" onClick={cancelAutoAlert}>
              CANCEL AUTO-BROADCAST
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Quick Alert</CardTitle>
            <CardDescription>Send an instant safety broadcast.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Activity className={collisionDetectionEnabled ? "text-accent" : "text-muted-foreground"} />
            <div className="flex flex-col items-end">
              <Label htmlFor="collision-switch" className="text-xs font-bold">Collision Detection</Label>
              <Switch 
                id="collision-switch"
                checked={collisionDetectionEnabled} 
                onCheckedChange={(val) => {
                  setCollisionDetectionEnabled(val);
                  localStorage.setItem('collisionDetectionEnabled', String(val));
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Button
              key={action.name}
              variant="outline"
              size="lg"
              onClick={() => handleQuickAction(action.name)}
              disabled={!!submittingType || isImpactDetected}
              className="flex-col h-auto py-6 text-center text-base transition-all hover:scale-105 hover:shadow-lg focus:ring-2 focus:ring-accent"
            >
              {submittingType === action.name ? (
                <Loader2 className="animate-spin h-6 w-6 mb-2" />
              ) : (
                <action.icon className="h-6 w-6 mb-2 text-accent" />
              )}
              <span>{action.name}</span>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
