'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Zap, ArrowRightLeft, MoveVertical, MoveHorizontal, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
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
  const [speedKmh, setSpeedKmh] = useState(0);
  const [isCrashed, setIsCrashed] = useState(false);
  
  const { toast } = useToast();
  const { database } = useFirebase();
  
  // Persistent physical state refs
  const speedMsRef = useRef<number>(0);
  const crashResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastVoiceAlertRef = useRef<number>(0);

  // Filters to handle gravity/tilt drift
  const baselineX = useRef<number>(0);
  const baselineY = useRef<number>(0);

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

      // 1. Convert raw values to m/s² (MPU6050 16384 LSB/g)
      const ax = (Number(val.x) / 16384) * 9.81;
      const ay = (Number(val.y) / 16384) * 9.81;
      const az = (Number(val.z) / 16384) * 9.81;

      // 2. Dynamic Gravity/Tilt baseline (Low Pass Filter)
      baselineX.current = (0.9 * baselineX.current) + (0.1 * ax);
      baselineY.current = (0.9 * baselineY.current) + (0.1 * ay);

      // 3. Dynamic Acceleration (Actual motion relative to current orientation)
      const dynamicX = ax - baselineX.current;
      const dynamicY = ay - baselineY.current;
      
      let horizontal_a = Math.sqrt(dynamicX * dynamicX + dynamicY * dynamicY);

      // 4. Noise Gate / Stability Threshold
      if (horizontal_a < 0.7) {
        horizontal_a = 0;
      }

      // 5. Symmetric Integration/Deceleration
      if (horizontal_a > 0) {
        // ACCELERATION logic remains the same
        speedMsRef.current = speedMsRef.current + (horizontal_a * 0.8);
      } else {
        // DECELERATION logic remains the same (aggressive decay)
        speedMsRef.current = speedMsRef.current * 0.15;
      }

      // 6. Velocity Safety Clamp
      if (speedMsRef.current < 0) speedMsRef.current = 0;
      if (speedMsRef.current > 33.3) speedMsRef.current = 33.3; // Cap at 120 km/h

      // 7. Convert to KM/H
      let currentSpeedKmh = speedMsRef.current * 3.6;

      // 8. Zero-Snap
      if (currentSpeedKmh < 0.5) {
        currentSpeedKmh = 0;
        speedMsRef.current = 0;
      }

      // 9. Voice Alert logic for > 90 km/h
      if (currentSpeedKmh > 90) {
        const now = Date.now();
        if (now - lastVoiceAlertRef.current > 5000) { // 5 second cooldown
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance("Emergency: Overspeeding detected!");
            window.speechSynthesis.speak(utterance);
          }
          toast({ variant: 'destructive', title: 'OVERSPEEDING', description: 'Speed exceeds 90 km/h limit!' });
          lastVoiceAlertRef.current = now;
        }
      }

      // 10. Update State
      setSpeedKmh(currentSpeedKmh);

      // --- Stats & Crash Detection ---
      const total_ms2 = Math.sqrt(ax * ax + ay * ay + az * az);
      const currentG = Math.abs((total_ms2 / 9.81) - 1.0);
      
      const timeLabel = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setCurrent({ 
        time: timeLabel, 
        x: ax, 
        y: ay, 
        z: az, 
        total: total_ms2
      });
      
      setMaxForceValue(prev => Math.max(prev, total_ms2));

      // Impact Detection (2.5G threshold)
      if (currentG >= 2.5) {
        if (!isCrashed) {
          setIsCrashed(true);
          set(crashAlertRef, true);
          toast({ variant: 'destructive', title: 'IMPACT DETECTED', description: 'Broadcasting emergency data.' });
        }
      } else if (isCrashed) {
        if (currentG < 0.5 && !crashResetTimerRef.current) {
          crashResetTimerRef.current = setTimeout(() => {
            setIsCrashed(false);
            set(crashAlertRef, false);
            crashResetTimerRef.current = null;
          }, 3000);
        }
      }
    });

    return () => {
      off(sensorRef);
    };
  }, [active, database, isCrashed, toast]);

  const resetTelemetry = () => {
    speedMsRef.current = 0;
    baselineX.current = 0;
    baselineY.current = 0;
    setSpeedKmh(0);
    setMaxForceValue(0);
    setIsCrashed(false);
    if (database) set(ref(database, 'car_kit/crash_alert'), false);
    toast({ title: 'System Reset', description: 'Speedometer and G-Force peaks cleared.' });
  };

  const maxG = maxForceValue / 9.81;
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const maxVisualRange = 120.0; 
  const percentage = Math.min(speedKmh / maxVisualRange, 1);
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
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-60">
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
          "w-[340px] h-[340px] md:w-[400px] md:h-[400px] rounded-full bg-card border-[8px] relative flex flex-col items-center justify-center transition-all duration-300 shadow-2xl",
          isCrashed || speedKmh > 90 ? "border-destructive animate-pulse" : "border-muted/50"
        )}>
          <div className="absolute top-12 flex flex-col items-center gap-1 z-20">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", active ? "bg-primary animate-pulse" : "bg-zinc-700")} />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {active ? "Sensor Stream Active" : "Standby"}
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
                className={cn("transition-all duration-300 ease-out", speedKmh > 90 || isCrashed ? "text-destructive" : "text-primary")}
                strokeLinecap="round"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="space-y-0 -mt-4">
                <span className={cn("text-6xl md:text-7xl font-black tracking-tighter tabular-nums leading-none block", (speedKmh > 90 || isCrashed) && "text-destructive")}>
                  {speedKmh.toFixed(1)}
                </span>
                <span className="text-lg font-black text-primary italic uppercase tracking-tighter">KM/H</span>
              </div>
            </div>

            <div 
              className="absolute top-1/2 left-1/2 w-1 h-32 -mt-32 -ml-0.5 origin-bottom transition-transform duration-300 ease-out z-30"
              style={{ transform: `translateX(-50%) rotate(${percentage * 270 - 135}deg)` }}
            >
              <div className={cn("w-full h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]", speedKmh > 90 || isCrashed ? "bg-destructive" : "bg-accent")} />
            </div>
          </div>

          <div className="absolute bottom-12 flex flex-col items-center gap-1 z-20">
             <div className="flex gap-4">
               <div className="text-center">
                 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Peak Load</p>
                 <p className="text-sm font-black italic">{maxG.toFixed(2)}G</p>
               </div>
               <div className="text-center">
                 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Status</p>
                 <p className={cn("text-sm font-black italic", speedKmh > 90 || isCrashed ? "text-destructive" : "text-accent")}>
                    {isCrashed ? "Impact" : (speedKmh > 90 ? "Overspeed" : "Normal")}
                 </p>
               </div>
             </div>
          </div>
          {speedKmh > 90 && (
            <div className="absolute inset-0 rounded-full border-4 border-destructive/30 animate-ping pointer-events-none" />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Longitudinal (m/s²)", val: current.x, color: "text-primary", icon: MoveHorizontal },
          { label: "Lateral (m/s²)", val: current.y, color: "text-accent", icon: ArrowRightLeft },
          { label: "Vertical (m/s²)", val: current.z, color: "text-chart-1", icon: MoveVertical },
          { label: "Current Load (G)", val: current.total / 9.81, color: "text-foreground", icon: Activity }
        ].map((stat, i) => (
          <Card key={i} className="bg-card border-border/40 overflow-hidden shadow-sm">
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
