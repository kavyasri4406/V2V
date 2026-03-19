'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ShieldAlert, ShieldCheck, ShieldOff, Siren, Bell, Settings, Lock, Unlock } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { ref, onValue, off } from 'firebase/database';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';

export default function SecurityPage() {
  const [isArmed, setIsArmed] = useState(false);
  const [isAlarmTriggered, setIsAlarmTriggered] = useState(false);
  const [sensitivity, setSensitivity] = useState(0.8);
  const [lastMotion, setLastMotion] = useState<number>(0);
  
  const { database } = useFirebase();
  const { toast } = useToast();
  
  const baselineAccel = useRef<{x: number, y: number, z: number} | null>(null);
  const baselineGyro = useRef<{x: number, y: number, z: number} | null>(null);

  // Stop alarm
  const disarmSystem = () => {
    setIsArmed(false);
    setIsAlarmTriggered(false);
    
    // Stop any ongoing voice alerts immediately
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    toast({ title: "System Disarmed", description: "Security monitoring deactivated." });
  };

  const armSystem = () => {
    baselineAccel.current = null;
    baselineGyro.current = null;
    setIsArmed(true);
    setIsAlarmTriggered(false);
    toast({ title: "System Armed", description: "Vibration and tilt sensors active." });
  };

  const triggerAlarm = () => {
    if (isAlarmTriggered) return;
    setIsAlarmTriggered(true);
    
    // Voice alert - play once
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance("EMERGENCY: SECURITY BREACH DETECTED. UNAUTHORIZED MOVEMENT.");
      utterance.rate = 1.2;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (!isArmed || !database || isAlarmTriggered) return;

    const accelRef = ref(database, 'car_kit/mpu6050_raw/accelerometer');
    const gyroRef = ref(database, 'car_kit/mpu6050_raw/gyroscope');

    const unsubscribeAccel = onValue(accelRef, (snapshot) => {
      const val = snapshot.val();
      if (!val) return;

      const current = { x: Number(val.x), y: Number(val.y), z: Number(val.z) };
      
      if (!baselineAccel.current) {
        baselineAccel.current = current;
        return;
      }

      // Calculate vibration magnitude delta
      const deltaX = Math.abs(current.x - baselineAccel.current.x);
      const deltaY = Math.abs(current.y - baselineAccel.current.y);
      const deltaZ = Math.abs(current.z - baselineAccel.current.z);
      
      const vibration = (deltaX + deltaY + deltaZ) / 32768; // Normalized vibration
      setLastMotion(vibration);

      // sensitivity threshold: lower value = more sensitive
      if (vibration > (1.1 - sensitivity) * 0.1) {
        triggerAlarm();
      }
    });

    const unsubscribeGyro = onValue(gyroRef, (snapshot) => {
      const val = snapshot.val();
      if (!val) return;

      const current = { x: Number(val.x), y: Number(val.y), z: Number(val.z) };
      
      if (!baselineGyro.current) {
        baselineGyro.current = current;
        return;
      }

      const deltaTilt = Math.abs(current.x - baselineGyro.current.x) + 
                        Math.abs(current.y - baselineGyro.current.y);

      // Normalized tilt change threshold
      if (deltaTilt / 131.0 > 15 * sensitivity) {
        triggerAlarm();
      }
    });

    return () => {
      off(accelRef);
      off(gyroRef);
    };
  }, [isArmed, database, isAlarmTriggered, sensitivity]);

  return (
    <div className={cn(
      "min-h-[80vh] w-full max-w-4xl mx-auto space-y-6 pb-12 transition-colors duration-300 rounded-2xl p-6",
      isAlarmTriggered ? "bg-destructive/20 animate-pulse" : "bg-transparent"
    )}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
            <ShieldAlert className={cn("h-8 w-8", isArmed ? "text-primary" : "text-muted-foreground")} />
            Anti-Theft Security
          </h1>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-60">
            {isArmed ? "Vehicle Protection Active" : "System in Standby"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={cn(
          "relative overflow-hidden border-2 transition-all duration-500",
          isAlarmTriggered ? "border-destructive scale-105 shadow-2xl" : 
          isArmed ? "border-primary shadow-lg" : "border-muted"
        )}>
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              {isAlarmTriggered ? (
                <div className="relative">
                  <Siren className="h-20 w-20 text-destructive animate-bounce" />
                  <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
                </div>
              ) : isArmed ? (
                <ShieldCheck className="h-20 w-20 text-primary" />
              ) : (
                <ShieldOff className="h-20 w-20 text-muted-foreground opacity-40" />
              )}
            </div>
            <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">
              {isAlarmTriggered ? "ALARM TRIGGERED" : isArmed ? "VEHICLE SECURED" : "SYSTEM DISARMED"}
            </CardTitle>
            <CardDescription className="font-bold uppercase tracking-widest text-[10px]">
              {isAlarmTriggered ? "Movement detected while parked" : "Monitoring vibration & tilt sensors"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 pt-6">
            {isAlarmTriggered ? (
              <Button 
                variant="destructive" 
                size="lg" 
                className="w-full font-black uppercase tracking-[0.2em] py-8 text-xl animate-pulse"
                onClick={disarmSystem}
              >
                <Unlock className="mr-2 h-6 w-6" /> STOP ALARM
              </Button>
            ) : isArmed ? (
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full font-black uppercase tracking-[0.2em] py-8 border-primary text-primary hover:bg-primary/10"
                onClick={disarmSystem}
              >
                <Lock className="mr-2 h-5 w-5" /> DISARM SYSTEM
              </Button>
            ) : (
              <Button 
                variant="default" 
                size="lg" 
                className="w-full font-black uppercase tracking-[0.2em] py-8 text-xl"
                onClick={armSystem}
              >
                <ShieldCheck className="mr-2 h-6 w-6" /> ARM SECURITY
              </Button>
            )}

            <div className="w-full space-y-2 opacity-60">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span>Sensor Stability</span>
                <span>{(100 - (lastMotion * 1000)).toFixed(0)}%</span>
              </div>
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-300", 
                    isArmed ? "bg-primary" : "bg-muted-foreground"
                  )} 
                  style={{ width: `${Math.max(0, 100 - (lastMotion * 1000))}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Settings className="h-4 w-4" /> Sensor Sensitivity
              </CardTitle>
              <CardDescription>Adjust how easily the alarm is triggered by vibrations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-xs font-bold uppercase text-muted-foreground">Threshold</span>
                  <span className="text-xs font-black italic">{Math.round(sensitivity * 100)}%</span>
                </div>
                <Slider 
                  value={[sensitivity * 100]} 
                  onValueChange={(val) => setSensitivity(val[0] / 100)}
                  max={100}
                  step={1}
                />
                <div className="flex justify-between text-[9px] font-bold uppercase text-muted-foreground opacity-50">
                  <span>Low (Heavy Wind)</span>
                  <span>High (Sensitive)</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-accent" />
                  <span className="text-xs font-bold uppercase tracking-widest">Armed Indicators</span>
                </div>
                <ul className="text-[10px] space-y-2 text-muted-foreground font-medium list-disc pl-4">
                  <li>Loud vocal siren on movement detection</li>
                  <li>Visual high-intensity flashing interface</li>
                  <li>Tilt sensor compensation for parking on slopes</li>
                  <li>Automatic baseline calibration on arming</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
