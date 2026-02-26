'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Zap, Gauge, ArrowRightLeft, MoveVertical, MoveHorizontal, RefreshCcw, History, TriangleAlert } from 'lucide-react';
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

  // Gauge Calculation (0-180 km/h scale)
  const MAX_GAUGE_SPEED = 180;
  const percentage = Math.min(100, (speed / MAX_GAUGE_SPEED) * 100);
  const strokeDasharray = 251.2; // 2 * PI * 40
  const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      {/* Cool Round Speedometer Card */}
      <Card className="bg-[#0a0a0c] text-white border-zinc-800 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden relative group">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(var(--primary),0.07),transparent)] pointer-events-none" />
        
        <CardContent className="p-8 md:p-12 flex flex-col items-center relative z-10">
          {/* Status Bar */}
          <div className="w-full flex justify-between items-center mb-10 px-4">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", active ? "bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),1)]" : "bg-zinc-700")} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                {active ? "Sensor Stream Linked" : "Telemetry Standby"}
              </span>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Max Peak</span>
                <span className="text-sm font-black italic text-zinc-300">{maxSpeedValue.toFixed(1)} <span className="text-[8px] opacity-50">KM/H</span></span>
              </div>
            </div>
          </div>

          {/* The Round Gauge */}
          <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
            {/* Background Track */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">
              <circle
                cx="50%"
                cy="50%"
                r="40%"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-zinc-900"
              />
              {/* Active Speed Arc */}
              <circle
                cx="50%"
                cy="50%"
                r="40%"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="text-primary transition-all duration-300 ease-out"
                style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary)))' }}
              />
            </svg>

            {/* Scale Ticks (Decorative) */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
               {[...Array(12)].map((_, i) => (
                 <div 
                   key={i} 
                   className="absolute top-1/2 left-1/2 w-1 h-3 bg-white origin-[0_0]" 
                   style={{ transform: `rotate(${i * 30}deg) translateY(-145px) translateX(-50%)` }}
                 />
               ))}
            </div>

            {/* Inner Content */}
            <div className="flex flex-col items-center justify-center text-center z-20">
              <span className="text-7xl md:text-8xl font-black tabular-nums tracking-tighter italic leading-none">
                {Math.round(speed)}
              </span>
              <div className="flex flex-col items-center -mt-1">
                <span className="text-xl md:text-2xl font-black italic text-primary tracking-tighter uppercase">km/h</span>
                <div className="w-12 h-0.5 bg-primary/30 mt-2 rounded-full" />
              </div>
            </div>

            {/* Warning Indicator */}
            {speed > 100 && (
               <div className="absolute top-10 flex flex-col items-center animate-bounce text-accent">
                 <TriangleAlert className="h-5 w-5 mb-1" />
                 <span className="text-[8px] font-black uppercase tracking-widest">Overspeed</span>
               </div>
            )}
          </div>

          {/* Bottom Stats Grid */}
          <div className="mt-12 grid grid-cols-3 gap-8 w-full max-w-lg">
              <div className="flex flex-col items-center text-center space-y-1">
                <span className="text-zinc-600 text-[9px] font-black uppercase tracking-widest">G-Force</span>
                <span className="text-xl font-black italic text-zinc-300">{(current.total / 9.81).toFixed(2)} <span className="text-[9px] opacity-40">G</span></span>
              </div>
              <div className="flex flex-col items-center text-center space-y-1 border-x border-zinc-800 px-4">
                <span className="text-zinc-600 text-[9px] font-black uppercase tracking-widest">Resultant</span>
                <span className="text-xl font-black italic text-primary">{current.total.toFixed(1)} <span className="text-[9px] opacity-40">m/s²</span></span>
              </div>
              <div className="flex flex-col items-center text-center space-y-1">
                <span className="text-zinc-600 text-[9px] font-black uppercase tracking-widest">Peak Load</span>
                <span className="text-xl font-black italic text-zinc-300">{(maxForceValue / 9.81).toFixed(2)} <span className="text-[9px] opacity-40">G</span></span>
              </div>
          </div>

          {/* Action Button */}
          <div className="mt-10">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetTelemetry}
              className="h-10 px-6 bg-transparent border-zinc-800 hover:bg-zinc-900 hover:text-white text-zinc-500 rounded-full transition-all group"
            >
              <RefreshCcw className="h-3 w-3 mr-2 group-hover:rotate-180 transition-transform duration-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Reset Trip Data</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Control & Secondary Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-1">
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic flex items-center gap-2">
            <Activity className="text-accent" />
            V2V Telemetry
          </h1>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">High-Precision Inertial Monitoring</p>
        </div>
        <Button 
          variant={active ? "destructive" : "default"} 
          size="lg" 
          onClick={() => setActive(!active)}
          className="w-full md:w-48 font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
        >
          {active ? <Zap className="mr-2 fill-current" /> : <Activity className="mr-2" />}
          {active ? 'Disconnect' : 'Start Stream'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Longitudinal (X)", val: current.x, color: "text-primary", icon: MoveHorizontal, desc: "Accel / Braking" },
          { label: "Lateral (Y)", val: current.y, color: "text-accent", icon: ArrowRightLeft, desc: "Cornering Force" },
          { label: "Vertical (Z)", val: current.z, color: "text-chart-1", icon: MoveVertical, desc: "Road Vibration" },
          { label: "Total Impact", val: current.total, color: "text-foreground", icon: Activity, desc: "Collision Logic" }
        ].map((stat, i) => (
          <Card key={i} className="bg-card border-border/40 shadow-sm overflow-hidden group hover:border-primary/20 transition-colors">
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
              <p className="text-[8px] font-bold text-muted-foreground/40 mt-1 uppercase tracking-widest">{stat.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Waveform Visualization */}
      <Card className="border-border/40 shadow-lg overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/5 border-b">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] font-black uppercase tracking-widest">Oscilloscope View</span>
          </div>
          {active && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              LIVE DATA 1000ms
            </div>
          )}
        </CardHeader>
        <CardContent className="h-[300px] pt-6">
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
