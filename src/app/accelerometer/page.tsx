
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
  const [isCrashed, setIsCrashed] = useState(false);
  
  const { toast } = useToast();
  const { database } = useFirebase();
  
  const crashResetTimerRef = useRef<NodeJS.Timeout | null>(null);

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

      // 1. Read accelerometer values and convert to m/s² (16384 is sensitivity for +/- 2g)
      const ax_ms2 = (Number(val.x) / 16384) * 9.81;
      const ay_ms2 = (Number(val.y) / 16384) * 9.81;
      const az_ms2 = (Number(val.z) / 16384) * 9.81;

      // 2. Compute motion G-force by isolating total acceleration from gravity (1G)
      const total_ms2 = Math.sqrt(ax_ms2 * ax_ms2 + ay_ms2 * ay_ms2 + az_ms2 * az_ms2);
      const totalG = total_ms2 / 9.81;
      
      // currentG represents the magnitude of external forces (impact/motion) acting on the vehicle
      let currentG = Math.abs(totalG - 1.0);
      
      // Noise floor: If motion is minimal, force to exactly 0 to prevent jitter/drift
      if (currentG < 0.15) currentG = 0;

      const timeLabel = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // 3. Update State
      setCurrent({ 
        time: timeLabel, 
        x: ax_ms2, 
        y: ay_ms2, 
        z: az_ms2, 
        total: currentG * 9.81 // Store the motion force in m/s2
      });
      
      setMaxForceValue(prev => Math.max(prev, currentG * 9.81));

      // ---------------------------------------------------------
      // CRASH DETECTION (G-Force > 2.5g)
      // ---------------------------------------------------------
      if (currentG >= 2.5) {
        if (!isCrashed) {
          setIsCrashed(true);
          set(crashAlertRef, true);
          toast({ variant: 'destructive', title: 'IMPACT DETECTED', description: 'Emergency broadcast triggered.' });
        }
      } else if (isCrashed) {
        // Reset crash status if force drops and stays low for 3 seconds
        if (currentG < 1.0 && !crashResetTimerRef.current) {
          crashResetTimerRef.current = setTimeout(() => {
            setIsCrashed(false);
            set(crashAlertRef, false);
            crashResetTimerRef.current = null;
          }, 3000);
        }
      }

    }, (error) => {
      // Standard Firebase error handling
      console.error(error);
    });

    return () => {
      off(sensorRef);
    };
  }, [active, database, isCrashed, toast]);

  const resetTelemetry = () => {
    setMaxForceValue(0);
    setIsCrashed(false);
    if (database) set(ref(database, 'car_kit/crash_alert'), false);
    toast({ title: 'Telemetry Reset' });
  };

  const currentG = current.total / 9.81;
  const maxG = maxForceValue / 9.81;

  // Gauge Visuals for G-Force (range 0 to 4.0G)
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const maxVisualRange = 4.0; 
  const percentage = Math.min(currentG / maxVisualRange, 1);
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
            {isCrashed ? "CRITICAL IMPACT DETECTED" : "Real-time G-Force Dynamics"}
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
          isCrashed ? "border-destructive animate-pulse" : "border-muted/50"
        )}>
          <div className="absolute top-12 flex flex-col items-center gap-1 z-20">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", active ? "bg-primary animate-pulse" : "bg-zinc-700")} />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {active ? "Sensor Active" : "Standby"}
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
                  {currentG.toFixed(2)}
                </span>
                <span className="text-lg font-black text-primary italic uppercase tracking-tighter">G-Force</span>
              </div>
            </div>

            <div 
              className="absolute top-1/2 left-1/2 w-1 h-32 -mt-32 -ml-0.5 origin-bottom transition-transform duration-300 ease-out z-30"
              style={{ transform: `translateX(-50%) rotate(${percentage * 270 - 135}deg)` }}
            >
              <div className={cn("w-full h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]", isCrashed ? "bg-destructive" : "bg-accent")} />
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
                 <p className={cn("text-sm font-black italic", isCrashed ? "text-destructive" : "text-accent")}>
                    {isCrashed ? "Impact" : "Normal"}
                 </p>
               </div>
             </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Longitudinal (m/s²)", val: current.x, color: "text-primary", icon: MoveHorizontal },
          { label: "Lateral (m/s²)", val: current.y, color: "text-accent", icon: ArrowRightLeft },
          { label: "Vertical (m/s²)", val: current.z, color: "text-chart-1", icon: MoveVertical },
          { label: "Resultant (m/s²)", val: current.total, color: "text-foreground", icon: Activity }
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
