'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Compass, RotateCw, AlertTriangle, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { ref, onValue, off } from 'firebase/database';
import { cn } from '@/lib/utils';

export default function GyroscopePage() {
  const [active, setActive] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [gyro, setGyro] = useState({ x: 0, y: 0, z: 0 });
  const [leanAngle, setLeanAngle] = useState({ roll: 0, pitch: 0 });
  const [isTilted, setIsTilted] = useState(false);
  
  const { toast } = useToast();
  const { database } = useFirebase();
  const lastVoiceAlertRef = useRef<number>(0);

  // Constants for MPU6050 sensitivity (assuming 131 LSB / deg/s)
  const GYRO_SENSITIVITY = 131.0;
  const TILT_THRESHOLD = 35; // Degrees

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!active || !database) return;

    // We monitor the gyroscope data
    const gyroRef = ref(database, 'car_kit/mpu6050_raw/gyroscope');
    
    // We also monitor the accelerometer to derive the absolute tilt angle (Roll/Pitch)
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

      // Calculate tilt angles using basic trigonometry on accelerometer data
      const ax = Number(val.x);
      const ay = Number(val.y);
      const az = Number(val.z);

      // Simple Roll/Pitch calculation (in degrees)
      const roll = Math.atan2(ay, az) * (180 / Math.PI);
      const pitch = Math.atan2(-ax, Math.sqrt(ay * ay + az * az)) * (180 / Math.PI);

      setLeanAngle({ roll, pitch });

      // Check for excessive tilt
      const absRoll = Math.abs(roll);
      if (absRoll > TILT_THRESHOLD) {
        setIsTilted(true);
        const now = Date.now();
        if (now - lastVoiceAlertRef.current > 4000) {
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance("Emergency: Excessive lean angle detected.");
            window.speechSynthesis.speak(utterance);
          }
          toast({
            variant: 'destructive',
            title: 'TILT WARNING',
            description: `Vehicle lean angle: ${absRoll.toFixed(1)}° exceeds safety limit!`,
          });
          lastVoiceAlertRef.current = now;
        }
      } else {
        setIsTilted(false);
      }
    });

    return () => {
      off(gyroRef);
      off(accelRef);
    };
  }, [active, database, toast]);

  if (!isMounted) return null;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3 text-foreground">
            <Compass className={cn("h-8 w-8", isTilted ? "text-destructive animate-pulse" : "text-primary")} />
            Vehicle Tilt
          </h1>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-60">
            {isTilted ? "CRITICAL LEAN ANGLE" : "Real-time Vehicle Stability"}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className={cn(
          "relative flex flex-col items-center justify-center p-12 overflow-hidden transition-all duration-300",
          isTilted ? "bg-destructive/10 border-destructive" : "bg-card border-border/50"
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
                isTilted ? "text-destructive" : "text-foreground"
              )}>
                {Math.abs(leanAngle.roll).toFixed(1)}°
              </span>
            </div>
          </div>
          {isTilted && (
            <div className="mt-4 flex items-center gap-2 text-destructive font-black animate-bounce uppercase text-xs">
              <AlertTriangle className="h-4 w-4" /> Reduce Lean Angle
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
