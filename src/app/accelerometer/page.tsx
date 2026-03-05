'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Zap, ArrowRightLeft, MoveVertical, MoveHorizontal, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, errorEmitter } from '@/firebase';
import { ref, onValue, off, set } from 'firebase/database';
import { cn } from '@/lib/utils';

type AccelPoint = {
  time: string;
  x: number;
  y: number;
  z: number;
  total: number;
};

export default function AccelerometerPage() {
  const [active, setActive] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [current, setCurrent] = useState<AccelPoint>({ time: '', x: 0, y: 0, z: 0, total: 0 });
  const [maxForceValue, setMaxForceValue] = useState(0);
  const [maxSpeedValue, setMaxSpeedValue] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [isCrashed, setIsCrashed] = useState(false);
  
  const { toast } = useToast();
  const { database } = useFirebase();
  
  const crashResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speedMsRef = useRef(0);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (crashResetTimerRef.current) clearTimeout(crashResetTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!active || !database) return;

    const sensorRef = ref(database, 'car_kit/mpu6050_raw/accelerometer');
    const crashAlertRef = ref(database, 'car_kit/crash_alert');
    
    const unsubscribe = onValue(sensorRef, (snapshot) => {
      const val = snapshot.val();
      if (!val) return;

      // 1. Read accelerometer values in m/s2 (16384 is sensitivity for +/- 2g)
      const ax_ms2 = (Number(val.x) / 16384) * 9.81;
      const ay_ms2 = (Number(val.y) / 16384) * 9.81;
      const az_ms2 = (Number(val.z) / 16384) * 9.81;

      // 2. Compute horizontal magnitude
      let horizontal_a = Math.sqrt(ax_ms2 * ax_ms2 + ay_ms2 * ay_ms2);
      
      // 3. Precision Noise Threshold: Ignore vibrations and tilt
      if (horizontal_a < 0.5) {
        horizontal_a = 0;
      }

      // 4. Movement Detection Logic
      if (horizontal_a > 0) {
        // Real motion: Increment internal velocity state
        speedMsRef.current += (horizontal_a * 0.08); 
      } else {
        // Stationary or slight change: Decay velocity back to 0
        speedMsRef.current *= 0.85;
      }

      // 5. Convert to km/h
      const speedKmhRaw = speedMsRef.current * 3.6;

      // 6. Smooth output and update state
      setSpeed(prev => {
        // Apply EMA smoothing for a professional gauge feel
        let nextKmh = (0.75 * prev) + (0.25 * speedKmhRaw);

        // 7. Force zero when nearly stopped to prevent floating values
        if (nextKmh < 1.0) {
          nextKmh = 0;
          speedMsRef.current = 0;
        }

        // 8. Safety clamp: Prevent unrealistic speed jumps
        if (nextKmh > prev + 10) {
          nextKmh = prev + 10;
        }

        if (nextKmh > maxSpeedValue) setMaxSpeedValue(nextKmh);
        return nextKmh;
      });

      // ---------------------------------------------------------
      // CRASH DETECTION (G-Force > 2.5g)
      // ---------------------------------------------------------
      const gx = Number(val.x) / 16384;
      const gy = Number(val.y) / 16384;
      const gz = Number(val.z) / 16384;
      const impact_g = Math.sqrt(gx * gx + gy * gy + gz * gz) - 1.0;

      if (impact_g >= 2.5) {
        if (!isCrashed) {
          setIsCrashed(true);
          set(crashAlertRef, true);
          toast({ variant: 'destructive', title: 'IMPACT DETECTED', description: 'Emergency broadcast triggered.' });
        }
      } else if (isCrashed) {
        if (impact_g < 1.0 && !crashResetTimerRef.current) {
          crashResetTimerRef.current = setTimeout(() => {
            setIsCrashed(false);
            set(crashAlertRef, false);
            crashResetTimerRef.current = null;
          }, 3000);
        }
      }

      const timeLabel = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const resultant_ms2 = Math.sqrt(ax_ms2 * ax_ms2 + ay_ms2 * ay_ms2 + (az_ms2 - 9.81) * (az_ms2 - 9.81));
      
      setCurrent({ 
        time: timeLabel, 
        x: ax_ms2, 
        y: ay_ms2, 
        z: az_ms2, 
        total: resultant_ms2 
      });
      
      setMaxForceValue(prev => Math.max(prev, resultant_ms2));
    }, (error) => {
      errorEmitter.emit('permission-error', error as any);
    });

    return () => {
      off(sensorRef);
    };
  }, [active, database, maxSpeedValue, isCrashed, toast]);

  const resetTelemetry = () => {
    speedMsRef.current = 0;
    setSpeed(0);
    setMaxSpeedValue(0);
    setMaxForceValue(0);
    setIsCrashed(false);
    if (database) set(ref(database, 'car_kit/crash_alert'), false);
    toast({ title: 'Telemetry Reset' });
  };

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const maxVisualRange = 140; 
  const percentage = Math.min(speed / maxVisualRange, 1);
  const strokeDashoffset = circumference - (percentage * circumference * 0.75); 

  if (!isMounted) return null;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
            <Activity className={cn("h-8 w-8", isCrashed ? "text-destructive animate-ping" : "text-primary")} />
            V2V Telemetry
          </h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-60">
            {isCrashed ? "CRITICAL IMPACT DETECTED" : "Real-time Vehicle Dynamics"}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button 
            variant="outline" 
            size="lg" 
            onClick={resetTelemetry}
            className="flex-1 md:flex-none font-bold uppercase tracking-widest"
          >
            <RefreshCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
          <Button 
            variant={active ? "destructive" : "default"} 
            size="lg" 
            onClick={() => setActive(!active)}
            className="flex-1 md:w-48 font-black uppercase tracking-[0.2em]"
          >
            {active ? <Zap className="mr-2 animate-pulse" /> : <Activity className="mr-2" />}
            {active ? 'Stop' : 'Start'}
          </Button>
        </div>
      </div>

      <div className="flex justify-center py-8">
        <Card className={cn(
          "w-[340px] h-[340px] md:w-[400px] md:h-[400px] rounded-full bg-card border-[8px] relative flex flex-col items-center justify-center transition-all duration-300",
          isCrashed ? "border-destructive animate-pulse" : "border-muted/50"
        )}>
          <div className="absolute top-12 flex flex-col items-center gap-1 z-20">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", active ? "bg-primary animate-pulse" : "bg-zinc-700")} />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {active ? "Link Active" : "Standby"}
              </span>
            </div>
          </div>

          <div className="relative z-10">
            <svg width="240" height="240" viewBox="0 0 200 200" className="transform -rotate-225">
              <circle
                cx="100" cy="100" r={radius}
                fill="none" stroke="currentColor" strokeWidth="12"
                strokeDasharray={`${circumference * 0.75} ${circumference}`}
                className="text-muted/20" strokeLinecap="round"
              />
              <circle
                cx="100" cy="100" r={radius}
                fill="none" stroke="currentColor" strokeWidth="12"
                strokeDasharray={`${circumference * 0.75} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                className={cn("transition-all duration-300 ease-out", isCrashed ? "text-destructive" : "text-primary")}
                strokeLinecap="round"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="space-y-0 -mt-4">
                <span className={cn("text-6xl md:text-7xl font-black tracking-tighter tabular-nums leading-none block", isCrashed && "text-destructive")}>
                  {speed.toFixed(1)}
                </span>
                <span className="text-lg font-black text-primary italic uppercase tracking-tighter">km/h</span>
              </div>
            </div>

            <div 
              className="absolute top-1/2 left-1/2 w-1 h-32 -mt-32 -ml-0.5 origin-bottom transition-transform duration-300 ease-out z-30"
              style={{ transform: `translateX(-50%) rotate(${percentage * 270 - 135}deg)` }}
            >
              <div className={cn("w-full h-full rounded-full", isCrashed ? "bg-destructive" : "bg-accent")} />
            </div>
          </div>

          <div className="absolute bottom-12 flex flex-col items-center gap-1 z-20">
             <div className="flex gap-4">
               <div className="text-center">
                 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Peak</p>
                 <p className="text-sm font-black italic">{maxSpeedValue.toFixed(1)}</p>
               </div>
               <div className="text-center">
                 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Load</p>
                 <p className="text-sm font-black italic text-accent">{(current.total / 9.81).toFixed(2)}G</p>
               </div>
             </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Longitudinal", val: current.x, color: "text-primary", icon: MoveHorizontal },
          { label: "Lateral", val: current.y, color: "text-accent", icon: ArrowRightLeft },
          { label: "Vertical", val: current.z, color: "text-chart-1", icon: MoveVertical },
          { label: "Resultant", val: current.total, color: "text-foreground", icon: Activity }
        ].map((stat, i) => (
          <Card key={i} className="bg-card border-border/40 overflow-hidden">
            <CardHeader className="pb-1 pt-4 px-4">
              <div className="flex items-center gap-2">
                <stat.icon className={cn("h-3 w-3", stat.color)} />
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className={cn("text-3xl font-black tabular-nums tracking-tighter", stat.color)}>
                {stat.val.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}