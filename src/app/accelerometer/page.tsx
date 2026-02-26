'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Zap, Gauge, ArrowRightLeft, MoveVertical, MoveHorizontal, RefreshCcw, History } from 'lucide-react';
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
  
  // Ref to track the accumulated speed in m/s
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
      // Calculate actual delta time since last message (fallback to 1s if first message)
      const dt = lastUpdateRef.current ? (now - lastUpdateRef.current) / 1000 : 1;
      lastUpdateRef.current = now;

      // 1. Convert raw MPU6050 values to m/s² (16384 LSB/g)
      const ax_ms2 = (Number(val.x) / 16384) * 9.81;
      const ay_ms2 = (Number(val.y) / 16384) * 9.81;
      const az_ms2 = (Number(val.z) / 16384) * 9.81;

      // 2. Remove gravity from the vertical axis
      const az_corrected = az_ms2 - 9.81;

      // 3. Compute horizontal acceleration magnitude
      const horizontal_a = Math.sqrt(ax_ms2 * ax_ms2 + ay_ms2 * ay_ms2);

      // 4. Noise Gating: Ignore micro-vibrations to prevent speed drift while stationary
      const NOISE_THRESHOLD = 0.15; // m/s²
      const filtered_a = horizontal_a > NOISE_THRESHOLD ? horizontal_a : 0;

      // 5. Resultant acceleration for impact logging
      const total_a = Math.sqrt(horizontal_a * horizontal_a + az_corrected * az_corrected);

      // 6. Integration: speed_ms = previous_speed + (accel * dt)
      speedMSRef.current = speedMSRef.current + (filtered_a * dt);

      // 7. Convert to km/h (m/s * 3.6)
      const current_kmh = speedMSRef.current * 3.6;

      // 8. Smoothing (Exponential Moving Average)
      setSpeed(prev => {
        const smoothed = (0.75 * prev) + (0.25 * current_kmh);
        const clamped = Math.max(0, smoothed);
        
        // Track session max speed
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
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* High-Contrast Bike Digital Speedometer */}
      <Card className="bg-black text-primary border-primary/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden relative group">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.05),transparent)] pointer-events-none" />
        <CardContent className="p-10 flex flex-col items-center justify-center text-center relative z-10">
           <div className="flex items-center gap-3 mb-4 text-[11px] font-black uppercase tracking-[0.3em] text-primary/60">
             <div className={cn("w-2 h-2 rounded-full", active ? "bg-green-500 animate-pulse" : "bg-red-500")} />
             {active ? "Link Active" : "Link Standby"}
           </div>
           
           <div className="relative flex items-baseline gap-2">
             <span className="text-[120px] md:text-[160px] leading-none font-black tabular-nums tracking-tighter italic drop-shadow-[0_0_15px_rgba(var(--primary),0.3)]">
               {speed.toFixed(1)}
             </span>
             <div className="flex flex-col items-start">
               <span className="text-3xl md:text-4xl font-black italic text-primary/80 tracking-tighter uppercase leading-none">km/h</span>
               <div className="mt-2 text-[10px] font-bold text-primary/40 uppercase tracking-widest">Velocity</div>
             </div>
           </div>

           <div className="mt-10 grid grid-cols-2 gap-8 w-full max-w-md border-t border-primary/10 pt-8">
              <div className="space-y-1">
                <div className="text-primary/40 text-[9px] font-black uppercase tracking-widest">Max Speed</div>
                <div className="text-2xl font-black italic">{maxSpeedValue.toFixed(1)} <span className="text-[10px] opacity-60">km/h</span></div>
              </div>
              <div className="space-y-1">
                <div className="text-primary/40 text-[9px] font-black uppercase tracking-widest">Peak Force</div>
                <div className="text-2xl font-black italic">{maxForceValue.toFixed(1)} <span className="text-[10px] opacity-60">m/s²</span></div>
              </div>
           </div>

           <div className="mt-8 flex gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetTelemetry}
                className="h-9 px-4 text-primary/50 hover:text-primary hover:bg-primary/5 border border-primary/10 transition-all rounded-full"
              >
                <RefreshCcw className="h-3 w-3 mr-2" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Reset Console</span>
              </Button>
           </div>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic flex items-center gap-2">
            <Activity className="text-accent" />
            Dynamic Telemetry
          </h1>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest opacity-70">Integrated G-Force & Velocity Stream</p>
        </div>
        <Button 
          variant={active ? "destructive" : "default"} 
          size="lg" 
          onClick={() => setActive(!active)}
          className="w-full md:w-48 font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-transform"
        >
          {active ? <Zap className="mr-2 fill-current" /> : <Activity className="mr-2" />}
          {active ? 'Stop Link' : 'Start Link'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Longitudinal (X)", val: current.x, color: "text-primary", icon: MoveHorizontal },
          { label: "Lateral (Y)", val: current.y, color: "text-accent", icon: ArrowRightLeft },
          { label: "Vertical (Z)", val: current.z, color: "text-chart-1", icon: MoveVertical },
          { label: "Resultant Impact", val: current.total, color: "text-foreground", icon: Activity }
        ].map((stat, i) => (
          <Card key={i} className="bg-card border-border/40 shadow-sm overflow-hidden group">
            <div className={cn("h-1 w-full", stat.color.replace('text-', 'bg-'))} />
            <CardHeader className="pb-1 pt-4 px-4">
              <div className="flex items-center gap-2">
                <stat.icon className={cn("h-3 w-3", stat.color)} />
                <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className={cn("text-3xl font-black tabular-nums tracking-tighter", stat.color)}>
                {stat.val.toFixed(2)}
              </div>
              <p className="text-[9px] font-bold text-muted-foreground/50 mt-1 uppercase tracking-widest">meters / second²</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/40 shadow-lg overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/5">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-[10px] font-black uppercase tracking-widest">Live Waveform Analysis</CardTitle>
          </div>
          {active && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
              Streaming 1000ms/pkt
            </div>
          )}
        </CardHeader>
        <CardContent className="h-[350px] pt-6">
          {!active ? (
            <div className="h-full w-full border border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground/30 gap-3 bg-muted/5">
              <Gauge className="h-8 w-8 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Awaiting Telemetry Sync</p>
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
    </div>
  );
}
