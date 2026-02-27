'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Zap, Gauge, ArrowRightLeft, MoveVertical, MoveHorizontal, RefreshCcw, History, TriangleAlert, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, errorEmitter } from '@/firebase';
import { ref, onValue, off, set } from 'firebase/database';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";
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
  const [data, setData] = useState<AccelPoint[]>([]);
  const [current, setCurrent] = useState<AccelPoint>({ time: '', x: 0, y: 0, z: 0, total: 0 });
  const [maxForceValue, setMaxForceValue] = useState(0);
  const [maxSpeedValue, setMaxSpeedValue] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [isCrashed, setIsCrashed] = useState(false);
  
  const { toast } = useToast();
  const { database } = useFirebase();
  const dataRef = useRef<AccelPoint[]>([]);
  
  // Accumulated speed in m/s
  const speedMSRef = useRef(0);
  const lastImpactTimeRef = useRef<number>(0);

  const chartConfig = {
    x: { label: "Longitudinal", color: "hsl(var(--primary))" },
    y: { label: "Lateral", color: "hsl(var(--accent))" },
    z: { label: "Vertical", color: "hsl(var(--chart-1))" },
    total: { label: "Resultant", color: "hsl(var(--foreground))" },
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!active || !database) return;

    const sensorRef = ref(database, 'car_kit/mpu6050_raw/accelerometer');
    const crashAlertRef = ref(database, 'car_kit/crash_alert');
    
    const unsubscribe = onValue(sensorRef, (snapshot) => {
      const val = snapshot.val();
      if (!val) return;

      // 1. Convert raw to m/s2 (assuming 16384 LSB/g)
      const ax = (Number(val.x) / 16384) * 9.81;
      const ay = (Number(val.y) / 16384) * 9.81;
      const az = (Number(val.z) / 16384) * 9.81;

      // ---------------------------------------------------------
      // BIKE-SMOOTH SPEED LOGIC (PRODUCTION MODE)
      // ---------------------------------------------------------
      
      // 1. Compute horizontal magnitude
      const horizontal_a = Math.sqrt(ax * ax + ay * ay);

      // 2. HARD noise filter (stops all noise from increasing speed)
      const filter_a = horizontal_a > 0.65 ? horizontal_a : 0;

      // 3. Integration with 1.0 gain for realistic velocity accumulation
      if (filter_a > 0) {
        speedMSRef.current = speedMSRef.current + (filter_a * 1.0);
      } else {
        // gradual fall like a bike
        speedMSRef.current = speedMSRef.current * 0.88;
      }

      // 4. Convert to km/h
      let speed_kmh_raw = speedMSRef.current * 3.6;

      // 5. Apply smoothing (0.7 EMA) and clamping
      setSpeed(prev => {
        let smoothed = (0.70 * prev) + (0.30 * speed_kmh_raw);
        
        // 6. Clamp unrealistic spikes and force zero for stillness
        if (smoothed > prev + 8) smoothed = prev + 8;
        if (smoothed < 0.5) smoothed = 0;
        
        const finalSpeed = Math.max(0, smoothed);
        
        if (finalSpeed > maxSpeedValue) setMaxSpeedValue(finalSpeed);
        return finalSpeed;
      });

      // ---------------------------------------------------------
      // CRASH DETECTION (G-Force > 2.5g)
      // ---------------------------------------------------------
      const gx = Number(val.x) / 16384;
      const gy = Number(val.y) / 16384;
      const gz = Number(val.z) / 16384;
      const impact_g = Math.sqrt(gx*gx + gy*gy + gz*gz) - 1.0;

      if (impact_g >= 2.5) {
        setIsCrashed(true);
        lastImpactTimeRef.current = Date.now();
        set(crashAlertRef, true);
      } else if (isCrashed && Date.now() - lastImpactTimeRef.current > 3000) {
        // Reset after 3 seconds of stability
        setIsCrashed(false);
        set(crashAlertRef, false);
      }

      const timeLabel = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const resultant_ms2 = Math.sqrt(ax * ax + ay * ay + (az - 9.81) * (az - 9.81));
      const newPoint = { time: timeLabel, x: ax, y: ay, z: az, total: resultant_ms2 };
      
      setCurrent(newPoint);
      setMaxForceValue(prev => Math.max(prev, resultant_ms2));

      dataRef.current = [...dataRef.current, newPoint].slice(-40);
      setData([...dataRef.current]);
    }, (error) => {
      errorEmitter.emit('permission-error', error as any);
    });

    return () => {
      off(sensorRef);
    };
  }, [active, database, maxSpeedValue, isCrashed]);

  const resetTelemetry = () => {
    speedMSRef.current = 0;
    setSpeed(0);
    setMaxSpeedValue(0);
    setMaxForceValue(0);
    toast({ title: 'Telemetry Reset', description: 'Session data zeroed.' });
  };

  // SVG Gauge calculations
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const maxVisualRange = 140; 
  const percentage = Math.min(speed / maxVisualRange, 1);
  const strokeDashoffset = circumference - (percentage * circumference * 0.75); 

  if (!isMounted) return null;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
            <Activity className={cn("h-8 w-8", isCrashed ? "text-destructive animate-ping" : "text-primary")} />
            V2V Telemetry
          </h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-60">
            {isCrashed ? "CRITICAL IMPACT DETECTED" : "Real-time MPU6050 Hardware Sync"}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button 
            variant="outline" 
            size="lg" 
            onClick={resetTelemetry}
            className="flex-1 md:flex-none border-border/50 font-bold uppercase tracking-widest"
          >
            <RefreshCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
          <Button 
            variant={active ? "destructive" : "default"} 
            size="lg" 
            onClick={() => setActive(!active)}
            className="flex-1 md:w-48 font-black uppercase tracking-[0.2em] shadow-xl transition-all"
          >
            {active ? <Zap className="mr-2 fill-current animate-pulse" /> : <Activity className="mr-2" />}
            {active ? 'Terminate' : 'Initialize'}
          </Button>
        </div>
      </div>

      {/* Speedometer Gauge */}
      <div className="flex justify-center py-8">
        <Card className={cn(
          "w-[340px] h-[340px] md:w-[400px] md:h-[400px] rounded-full bg-card border-[8px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.2)] relative flex flex-col items-center justify-center transition-all duration-500",
          isCrashed ? "border-destructive animate-pulse shadow-[0_0_80px_rgba(255,0,0,0.4)]" : "border-muted/50"
        )}>
          {/* Status Indicators */}
          <div className="absolute top-12 flex flex-col items-center gap-1 z-20">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", active ? "bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.8)]" : "bg-zinc-700")} />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {active ? (isCrashed ? "IMPACT" : "Link Active") : "Standby"}
              </span>
            </div>
          </div>

          {/* SVG Gauge */}
          <div className="relative z-10">
            <svg width="240" height="240" viewBox="0 0 200 200" className="transform -rotate-225">
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                strokeDasharray={`${circumference * 0.75} ${circumference}`}
                className="text-muted/20"
                strokeLinecap="round"
              />
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                strokeDasharray={`${circumference * 0.75} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                className={cn(
                  "transition-all duration-700 ease-out",
                  isCrashed ? "text-destructive" : "text-primary"
                )}
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
              />
            </svg>

            {/* Central Speed Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="space-y-0 -mt-4">
                <span className={cn(
                  "text-6xl md:text-7xl font-black tracking-tighter tabular-nums leading-none block",
                  isCrashed && "text-destructive"
                )}>
                  {speed.toFixed(1)}
                </span>
                <span className="text-lg font-black text-primary italic uppercase tracking-tighter">km/h</span>
              </div>
            </div>

            {/* Needle */}
            <div 
              className="absolute top-1/2 left-1/2 w-1 h-32 -mt-32 -ml-0.5 origin-bottom transition-transform duration-700 ease-out z-30"
              style={{ 
                transform: `translateX(-50%) rotate(${percentage * 270 - 135}deg)` 
              }}
            >
              <div className={cn(
                "w-full h-full rounded-full shadow-lg",
                isCrashed ? "bg-destructive" : "bg-gradient-to-t from-transparent via-accent to-accent"
              )} />
            </div>
            <div className="absolute top-1/2 left-1/2 -ml-3 -mt-3 w-6 h-6 bg-card border-4 border-muted rounded-full z-40" />
          </div>

          <div className="absolute bottom-12 flex flex-col items-center gap-1 z-20">
             <div className="flex gap-4">
               <div className="text-center">
                 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Peak</p>
                 <p className="text-sm font-black italic">{maxSpeedValue.toFixed(1)}</p>
               </div>
               <div className="w-px h-6 bg-muted/20" />
               <div className="text-center">
                 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Load</p>
                 <p className="text-sm font-black italic text-accent">{(current.total / 9.81).toFixed(2)}G</p>
               </div>
             </div>
          </div>
        </Card>
      </div>

      {/* Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Longitudinal", val: current.x, color: "text-primary", icon: MoveHorizontal, desc: "X-Axis" },
          { label: "Lateral", val: current.y, color: "text-accent", icon: ArrowRightLeft, desc: "Y-Axis" },
          { label: "Vertical", val: current.z, color: "text-chart-1", icon: MoveVertical, desc: "Z-Axis" },
          { label: "Resultant", val: current.total, color: "text-foreground", icon: Activity, desc: "m/s²" }
        ].map((stat, i) => (
          <Card key={i} className="bg-card border-border/40 shadow-sm overflow-hidden">
            <div className={cn("h-1 w-full", stat.color.replace('text-', 'bg-'))} />
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
              <p className="text-[9px] font-bold text-muted-foreground/40 mt-1 uppercase tracking-widest">{stat.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
