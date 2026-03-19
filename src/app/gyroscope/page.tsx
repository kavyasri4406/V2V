'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Compass, RotateCw, AlertTriangle, Activity, Siren, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useFirestore, useUser, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { ref, onValue, off } from 'firebase/database';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { defaultLocation } from '@/lib/location';
import type { UserProfile } from '@/lib/types';

export default function GyroscopePage() {
  const [active, setActive] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [gyro, setGyro] = useState({ x: 0, y: 0, z: 0 });
  const [leanAngle, setLeanAngle] = useState({ roll: 0, pitch: 0 });
  const [isTilted, setIsTilted] = useState(false);
  
  // Fall Detection State
  const [fallCountdown, setFallCountdown] = useState<number | null>(null);
  const [isFallDetected, setIsFallDetected] = useState(false);
  const fallTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const { database } = useFirebase();
  const firestore = useFirestore();
  const { user } = useUser();
  const lastVoiceAlertRef = useRef<number>(0);

  // Constants
  const GYRO_SENSITIVITY = 131.0;
  const TILT_THRESHOLD = 35; // Warning threshold
  const FALL_THRESHOLD = 70; // Emergency threshold

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const triggerSOS = useCallback(async () => {
    if (!firestore || !user) return;

    const alertData = {
      driver_name: userProfile?.driverName || 'Anonymous',
      sender_vehicle: userProfile?.vehicleNumber || 'N/A',
      message: "FALL DETECTED: Emergency SOS Alert! Vehicle is down.",
      timestamp: serverTimestamp(),
      userId: user.uid,
      latitude: defaultLocation.latitude,
      longitude: defaultLocation.longitude,
      impactForce: 0,
    };

    const alertsRef = collection(firestore, 'alerts');
    addDoc(alertsRef, alertData)
      .then(() => {
        toast({
          variant: 'destructive',
          title: 'SOS SENT',
          description: 'Emergency broadcast sent to nearby vehicles.',
        });
        if ('speechSynthesis' in window) {
          window.speechSynthesis.speak(new SpeechSynthesisUtterance("Emergency: SOS Broadcasted. Help is on the way."));
        }
      })
      .catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: alertsRef.path,
          operation: 'create',
          requestResourceData: alertData,
        }));
      });
    
    setIsFallDetected(true);
    setFallCountdown(null);
  }, [firestore, user, userProfile, toast]);

  useEffect(() => {
    if (!active || !database) return;

    const gyroRef = ref(database, 'car_kit/mpu6050_raw/gyroscope');
    const accelRef = ref(database, 'car_kit/mpu6050_raw/accelerometer');

    const unsubscribeGyro = onValue(gyroRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setGyro({
          x: Number(val.x) / GYRO_SENSITIVITY,
          y: Number(val.y) / GYRO_SENSITIVITY,
          z: Number(val.z) / GYRO_SENSITIVITY,
        });
      }
    });

    const unsubscribeAccel = onValue(accelRef, (snapshot) => {
      const val = snapshot.val();
      if (!val) return;

      const ax = Number(val.x);
      const ay = Number(val.y);
      const az = Number(val.z);

      const roll = Math.atan2(ay, az) * (180 / Math.PI);
      const pitch = Math.atan2(-ax, Math.sqrt(ay * ay + az * az)) * (180 / Math.PI);

      setLeanAngle({ roll, pitch });

      const absRoll = Math.abs(roll);
      const absPitch = Math.abs(pitch);

      if (absRoll > TILT_THRESHOLD) {
        setIsTilted(true);
        const now = Date.now();
        if (now - lastVoiceAlertRef.current > 6000) {
          if ('speechSynthesis' in window) {
            window.speechSynthesis.speak(new SpeechSynthesisUtterance("Emergency: Excessive lean angle detected."));
          }
          lastVoiceAlertRef.current = now;
        }
      } else {
        setIsTilted(false);
      }

      if ((absRoll > FALL_THRESHOLD || absPitch > FALL_THRESHOLD) && !isFallDetected) {
        if (!fallTimerRef.current) {
          setFallCountdown(5);
          fallTimerRef.current = setInterval(() => {
            setFallCountdown((prev) => {
              if (prev !== null && prev <= 1) {
                clearInterval(fallTimerRef.current!);
                fallTimerRef.current = null;
                triggerSOS();
                return 0;
              }
              return prev !== null ? prev - 1 : null;
            });
          }, 1000);
        }
      } else if (absRoll < 45 && absPitch < 45) {
        if (fallTimerRef.current) {
          clearInterval(fallTimerRef.current);
          fallTimerRef.current = null;
          setFallCountdown(null);
        }
        setIsFallDetected(false);
      }
    });

    return () => {
      off(gyroRef);
      off(accelRef);
      if (fallTimerRef.current) clearInterval(fallTimerRef.current);
    };
  }, [active, database, isFallDetected, triggerSOS, userProfile]);

  const cancelFallAlert = () => {
    if (fallTimerRef.current) {
      clearInterval(fallTimerRef.current);
      fallTimerRef.current = null;
    }
    setFallCountdown(null);
    setIsFallDetected(false);
    toast({ title: 'Alert Cancelled', description: 'Emergency broadcast aborted.' });
  };

  if (!isMounted) return null;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3 text-foreground">
            <Compass className={cn("h-8 w-8", isTilted || isFallDetected ? "text-destructive animate-pulse" : "text-primary")} />
            Vehicle Tilt
          </h1>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-60">
            {isFallDetected ? "FALL DETECTED" : isTilted ? "CRITICAL LEAN ANGLE" : "Real-time Vehicle Stability"}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button 
            variant={active ? "destructive" : "default"} 
            size="lg" 
            onClick={() => setActive(!active)}
            className="flex-1 md:w-48 font-black uppercase tracking-[0.2em]"
          >
            {active ? <Activity className="mr-2 animate-pulse" /> : <RotateCw className="mr-2" />}
            {active ? 'Stop Monitoring' : 'Start Monitor'}
          </Button>
        </div>
      </div>

      {fallCountdown !== null && (
        <Card className="bg-destructive text-destructive-foreground border-4 border-white animate-pulse shadow-2xl">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <Siren className="h-12 w-12 animate-bounce" />
                <div>
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-tight">Emergency: Tip-Over Detected</h2>
                  <p className="text-sm font-bold opacity-90 uppercase tracking-widest">SOS Alert broadcasting in {fallCountdown} seconds...</p>
                </div>
              </div>
              <Button size="lg" variant="secondary" onClick={cancelFallAlert} className="w-full md:w-auto font-black uppercase tracking-widest">
                <X className="mr-2" /> Cancel Broadcast
              </Button>
            </div>
            <Progress value={(5 - fallCountdown) * 20} className="h-2 mt-4 bg-white/20" />
          </CardContent>
        </Card>
      )}

      {isFallDetected && (
        <Card className="bg-destructive text-white border-none shadow-2xl">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center space-y-2">
            <Siren className="h-16 w-16 animate-ping" />
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">SOS BROADCASTING</h2>
            <p className="text-sm font-bold uppercase tracking-widest opacity-80">Manual recovery or system reset required to clear status.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className={cn(
          "relative flex flex-col items-center justify-center p-12 overflow-hidden transition-all duration-300",
          isTilted || isFallDetected ? "bg-destructive/10 border-destructive" : "bg-card border-border/50"
        )}>
          <CardHeader className="text-center">
            <CardTitle className="text-sm font-black uppercase tracking-widest">Lean Angle (Roll)</CardTitle>
          </CardHeader>
          <div className="relative w-64 h-64 flex items-center justify-center">
            <div 
              className="w-48 h-2 bg-muted rounded-full relative transition-transform duration-150 ease-out"
              style={{ transform: `rotate(${leanAngle.roll}deg)` }}
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 h-8 w-1 bg-primary shadow-[0_0_15px_rgba(0,0,0,0.2)]" />
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-primary/20" />
            </div>
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className={cn(
                "text-6xl font-black tabular-nums tracking-tighter",
                isTilted || isFallDetected ? "text-destructive" : "text-foreground"
              )}>
                {Math.abs(leanAngle.roll).toFixed(1)}°
              </span>
            </div>
          </div>
          {(isTilted || isFallDetected) && (
            <div className="mt-4 flex items-center gap-2 text-destructive font-black animate-bounce uppercase text-xs">
              <AlertTriangle className="h-4 w-4" /> 
              {Math.abs(leanAngle.roll) > FALL_THRESHOLD ? "VEHICLE DOWN" : "Reduce Lean Angle"}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Pitch (Nose)", val: leanAngle.pitch, unit: "°", icon: Activity, color: "text-primary" },
            { label: "Roll rate (X)", val: gyro.x, unit: "°/s", icon: RotateCw, color: "text-accent" },
            { label: "Pitch rate (Y)", val: gyro.y, unit: "°/s", icon: RotateCw, color: "text-chart-1" },
            { label: "Yaw rate (Z)", val: gyro.z, unit: "°/s", icon: RotateCw, color: "text-foreground" }
          ].map((stat, i) => (
            <Card key={i} className="bg-card border-border/40 shadow-sm">
              <CardHeader className="pb-1 pt-4 px-4">
                <div className="flex items-center gap-2">
                  <stat.icon className={cn("h-3 w-3", stat.color)} />
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className={cn("text-3xl font-black tabular-nums tracking-tighter", stat.color)}>
                  {stat.val.toFixed(2)}{stat.unit}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
