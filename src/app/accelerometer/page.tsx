'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Zap, Gauge, ArrowRightLeft, MoveVertical, MoveHorizontal, RefreshCcw, History, TriangleAlert, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, errorEmitter } from '@/firebase';
import { ref, onValue, off } from 'firebase/database';
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
  const [data, setData] = useState<AccelPoint[]>([]);
  const [current, setCurrent] = useState<AccelPoint>({ time: '', x: 0, y: 0, z: 0, total: 0 });
  const [maxForceValue, setMaxForceValue] = useState(0);
  const [maxSpeedValue, setMaxSpeedValue] = useState(0);
  const [speed, setSpeed] = useState(0);
  
  const { toast } = useToast();
  const { database } = useFirebase();
  const dataRef = useRef<AccelPoint[]>([]);
  
  // Ref to track the accumulated speed in m/s and timestamp for integration
  const speedMSRef = useRef(0);
  const lastUpdateRef = useRef<number | null>(null);

  const chartConfig = {
    x: { label: "Longitudinal", color: "hsl(var(--primary))" },
    y: { label: "Lateral", color: "hsl(var(--accent))" },
    z: { label: "Vertical", color: "hsl(var(--chart-1))" },
    total: { label: "Resultant", color: "hsl(var(--foreground))" },
  };

  useEffect(() => {
    if (!active || !database) return;

    const sensorRef = ref(database, 'car_kit/mpu6050_raw/accelerometer');
    
    const unsubscribe = onValue(sensorRef, (snapshot) => {
      const val = snapshot.val();
      if (!val) return;

      const now = Date.now();
      // Calculate delta time in seconds (fallback to 1s if first reading)
      const dt = lastUpdateRef.current ? (now - lastUpdateRef.current) / 1000 : 1;
      lastUpdateRef.current = now;

      // 1. Convert raw to m/s2 (raw / 16384 * 9.81)
      const ax_ms2 = (Number(val.x) / 16384) * 9.81;
      const ay_ms2 = (Number(val.y) / 16384) * 9.81;
      const az_ms2 = (Number(val.z) / 16384) * 9.81;

      // 2. Remove gravity from Z (compensation)
      const az_corrected = az_ms2 - 9.81;
      
      // 3. Compute horizontal acceleration for speed integration
      const horizontal_a = Math.sqrt(ax_ms2 * ax_ms2 + ay_ms2 * ay_ms2);

      // Noise gate: ignore values below 0.15 m/s2 to prevent static drift
      const NOISE_THRESHOLD = 0.15;
      const filtered_a = horizontal_a > NOISE_THRESHOLD ? horizontal_a : 0;

      // Resultant total for G-force/Impact monitoring
      const total_a = Math.sqrt(horizontal_a * horizontal_a + az_corrected * az_corrected);

      // 4. Integrate speed (m/s) using horizontal acceleration
      speedMSRef.current = speedMSRef.current + (filtered_a * dt);
      
      // 5. Convert to km/h
      const current_kmh = speedMSRef.current * 3.6;

      // 6. Smoothing (EMA) and peak tracking
      setSpeed(prev => {
        const smoothed = (0.8 * prev) + (0.2 * current_kmh);
        const clamped = Math.max(0, smoothed);
        if (clamped > maxSpeedValue) setMaxSpeedValue(clamped);
        return clamped;
      });

      const timeLabel = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newPoint = { time: timeLabel, x: ax_ms2, y: ay_ms2, z: az_ms2, total: total_a };
      
      setCurrent(newPoint);
      setMaxForceValue(prev => Math.max(prev, total_a));

      dataRef.current = [...dataRef.current, newPoint].slice(-40);
      setData([...dataRef.current]);
    }, (error) => {
      errorEmitter.emit('permission-error', error as any);
    });

    return () => {
      off(sensorRef);
      lastUpdateRef.current = null;
    };
  }, [active, database, maxSpeedValue]);

  const resetTelemetry = () => {
    speedMSRef.current = 0;
    setSpeed(0);
    setMaxSpeedValue(0);
    setMaxForceValue(0);
    toast({ title: 'Telemetry Reset', description: 'Session data and odometer zeroed.' });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
            <Activity className="text-primary h-8 w-8" />
            V2V Telemetry
          </h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-60">Real-time MPU6050 Hardware Sync</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button 
            variant="outline" 
            size="lg" 
            onClick={resetTelemetry}
            className="flex-1 md:flex-none border-border/50 font-bold uppercase tracking-widest"
          >
            <RefreshCcw className="mr-2 h-4 w-4" /> Reset Trip
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

      {/* Main Speedometer Display */}
      <Card className="bg-card border-border/40 overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 right-0 p-4">
           <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", active ? "bg-primary animate-pulse" : "bg-zinc-700")} />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {active ? "Link Active" : "Standby"}
              </span>
            </div>
        </div>
        <CardContent className="pt-12 pb-16 flex flex-col items-center justify-center text-center">
          <div className="space-y-2 mb-4">
             <span className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground/40">Vehicle Velocity</span>
             <div className="flex items-baseline justify-center gap-4">
                <span className="text-9xl font-black tracking-tighter tabular-nums leading-none">
                  {speed.toFixed(1)}
                </span>
                <span className="text-3xl font-black text-primary italic uppercase tracking-tighter">km/h</span>
             </div>
          </div>
          
          <div className="grid grid-cols-2 gap-12 w-full max-w-sm mt-8 border-t border-border/10 pt-8">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Session Peak</span>
              <span className="text-2xl font-black italic">{maxSpeedValue.toFixed(1)} <small className="text-[10px] uppercase">km/h</small></span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Peak Impact</span>
              <span className="text-2xl font-black italic text-accent">{(maxForceValue / 9.81).toFixed(2)} <small className="text-[10px] uppercase">G</small></span>
            </div>
          </div>

          {speed > 100 && (
             <div className="absolute bottom-6 flex items-center gap-2 px-4 py-1 bg-destructive/10 text-destructive rounded-full animate-bounce">
                <TriangleAlert className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Velocity Warning</span>
             </div>
          )}
        </CardContent>
      </Card>

      {/* Secondary Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Longitudinal (X)", val: current.x, color: "text-primary", icon: MoveHorizontal, desc: "Accel / Braking" },
          { label: "Lateral (Y)", val: current.y, color: "text-accent", icon: ArrowRightLeft, desc: "Cornering Force" },
          { label: "Vertical (Z)", val: current.z, color: "text-chart-1", icon: MoveVertical, desc: "Road Surface" },
          { label: "Resultant (G)", val: current.total / 9.81, color: "text-foreground", icon: Activity, desc: "Total Net Force" }
        ].map((stat, i) => (
          <Card key={i} className="bg-card border-border/40 shadow-sm hover:border-primary/20 transition-all group overflow-hidden">
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

      {/* Real-time Oscilloscope */}
      <Card className="border-border/40 shadow-lg overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/5 border-b">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] font-black uppercase tracking-widest">Live Waveform Stream</span>
          </div>
          {active && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Real-time Buffer
            </div>
          )}
        </CardHeader>
        <CardContent className="h-[300px] pt-6">
          {!active ? (
            <div className="h-full w-full border border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground/30 gap-3 bg-muted/5">
              <Gauge className="h-8 w-8 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Hardware Synchronization Offline</p>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={9} 
                  interval="preserveStartEnd"
                  stroke="currentColor"
                  opacity={0.3}
                />
                <YAxis axisLine={false} tickLine={false} fontSize={9} stroke="currentColor" opacity={0.3} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="x" stroke="var(--color-x)" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="y" stroke="var(--color-y)" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="z" stroke="var(--color-z)" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line 
                  type="stepAfter" 
                  dataKey="total" 
                  stroke="var(--color-total)" 
                  strokeWidth={2} 
                  strokeDasharray="4 4"
                  dot={false} 
                  isAnimationActive={false} 
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 p-4 bg-muted/20 border border-border/50 rounded-lg">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed tracking-wide">
            Calculation Note: Speed is estimated by integrating horizontal G-forces over the packet arrival interval (dt). Gravity compensation is applied to the Z-axis. Noise gate filter active at 0.15 m/s².
          </p>
      </div>
    </div>
  );
}
