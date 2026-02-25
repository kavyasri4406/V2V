'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Zap, Gauge, ArrowRightLeft, MoveVertical, MoveHorizontal, RefreshCcw } from 'lucide-react';
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
  const [speed, setSpeed] = useState(0);
  
  const { toast } = useToast();
  const { database } = useFirebase();
  const dataRef = useRef<AccelPoint[]>([]);
  
  // Ref to track the accumulated speed in m/s for integration
  const speedMSRef = useRef(0);

  const chartConfig = {
    x: { label: "X-Axis", color: "hsl(var(--primary))" },
    y: { label: "Y-Axis", color: "hsl(var(--accent))" },
    z: { label: "Z-Axis", color: "hsl(var(--chart-1))" },
    total: { label: "Magnitude", color: "hsl(var(--foreground))" },
  };

  useEffect(() => {
    if (!active || !database) return;

    // Connect to the accelerometer path provided
    const sensorRef = ref(database, 'car_kit/mpu6050_raw/accelerometer');
    
    const unsubscribe = onValue(sensorRef, (snapshot) => {
      const val = snapshot.val();
      if (!val) return;

      // 1. Convert raw MPU6050 values to m/s²
      // raw / 16384 = g
      // g * 9.81 = m/s²
      const x_raw = Number(val.x) || 0;
      const y_raw = Number(val.y) || 0;
      const z_raw = Number(val.z) || 0;
      
      const ax_ms2 = (x_raw / 16384) * 9.81;
      const ay_ms2 = (y_raw / 16384) * 9.81;
      const az_ms2 = (z_raw / 16384) * 9.81;

      // 2. Remove gravity from the vertical axis
      const az_corrected = az_ms2 - 9.81;

      // 3. Compute horizontal acceleration only
      const horizontal_a = Math.sqrt(ax_ms2 * ax_ms2 + ay_ms2 * ay_ms2);

      // 4. Combine horizontal acceleration with corrected vertical acceleration (for logging/peak)
      const total_a = Math.sqrt(horizontal_a * horizontal_a + az_corrected * az_corrected);

      // 5. Use horizontal acceleration for speed calculation
      const acceleration_used_for_speed = horizontal_a;

      // 6. With deltaTime = 1 second: speed_ms = speed_ms + acceleration_used_for_speed * 1
      speedMSRef.current = speedMSRef.current + (acceleration_used_for_speed * 1);

      // 7. Convert to km/h
      const new_speed_kmh = speedMSRef.current * 3.6;

      // 8. Add smoothing: speed_kmh = 0.8 * previous_speed + 0.2 * current_speed
      // 9. Clamp: speed_kmh = max(0, speed_kmh)
      setSpeed(prev => {
        const smoothed = (0.8 * prev) + (0.2 * new_speed_kmh);
        return Math.max(0, smoothed);
      });

      const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const newPoint = { time, x: ax_ms2, y: ay_ms2, z: az_ms2, total: total_a };
      setCurrent(newPoint);
      
      // Track peak resultant force (corrected)
      setMaxForceValue(prev => Math.max(prev, total_a));

      // Update history for chart (limit to 30 points)
      dataRef.current = [...dataRef.current, newPoint].slice(-30);
      setData([...dataRef.current]);
    }, (error) => {
      errorEmitter.emit('permission-error', error as any);
    });

    return () => {
      off(sensorRef);
    };
  }, [active, database]);

  const handleStart = () => {
    setActive(true);
    toast({ title: 'Telemetry Active', description: 'Monitoring bike speed and dynamics.' });
  };

  const handleStop = () => {
    setActive(false);
    toast({ title: 'Stream Paused', description: 'Monitoring disconnected.' });
  };

  const resetSpeed = () => {
    speedMSRef.current = 0;
    setSpeed(0);
    toast({ title: 'Speed Reset', description: 'Odometer zeroed.' });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Bike Digital Speedometer Header */}
      <Card className="bg-black text-primary border-primary/20 shadow-2xl overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <CardContent className="p-8 flex flex-col items-center justify-center text-center">
           <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">
             <Gauge className="h-3 w-3" />
             Live Velocity (Grav-Compensated)
           </div>
           <div className="relative">
             <span className="text-8xl md:text-9xl font-black tabular-nums tracking-tighter italic">
               {speed.toFixed(1)}
             </span>
             <span className="text-2xl md:text-3xl font-bold ml-2 italic opacity-80 uppercase tracking-widest text-primary/80">
               km/h
             </span>
           </div>
           <div className="mt-4 flex gap-4">
              <div className="px-3 py-1 rounded bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest">
                Sensor: MPU6050
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetSpeed}
                className="h-auto p-0 text-primary/40 hover:text-primary transition-colors"
              >
                <RefreshCcw className="h-3 w-3 mr-1" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Reset</span>
              </Button>
           </div>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black tracking-tighter uppercase italic">Vehicle Dynamics</h1>
          </div>
          <p className="text-muted-foreground text-xs font-medium">Real-time G-force monitoring via car_kit hardware.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            variant={active ? "destructive" : "default"} 
            size="lg" 
            onClick={() => active ? handleStop() : handleStart()}
            className="flex-1 md:flex-none font-bold uppercase tracking-widest px-8 shadow-lg"
          >
            {active ? <Zap className="mr-2 fill-current" /> : <Activity className="mr-2" />}
            {active ? 'Stop' : 'Start'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Longitudinal (X) */}
        <Card className="bg-card border-border/40 shadow-sm">
          <CardHeader className="pb-1 pt-4">
            <div className="flex items-center gap-2">
              <MoveHorizontal className="h-3 w-3 text-primary" />
              <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Longitudinal (X)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tabular-nums text-primary">
              {current.x.toFixed(1)}
            </div>
            <p className="text-[9px] font-bold text-muted-foreground/60 mt-1 uppercase">m/s²</p>
          </CardContent>
        </Card>

        {/* Lateral (Y) */}
        <Card className="bg-card border-border/40 shadow-sm">
          <CardHeader className="pb-1 pt-4">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-3 w-3 text-accent" />
              <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Lateral (Y)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tabular-nums text-accent">
              {current.y.toFixed(1)}
            </div>
            <p className="text-[9px] font-bold text-muted-foreground/60 mt-1 uppercase">m/s²</p>
          </CardContent>
        </Card>

        {/* Vertical (Z) */}
        <Card className="bg-card border-border/40 shadow-sm">
          <CardHeader className="pb-1 pt-4">
            <div className="flex items-center gap-2">
              <MoveVertical className="h-3 w-3 text-chart-1" />
              <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Vertical (Z)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tabular-nums text-chart-1">
              {current.z.toFixed(1)}
            </div>
            <p className="text-[9px] font-bold text-muted-foreground/60 mt-1 uppercase">m/s²</p>
          </CardContent>
        </Card>

        {/* Peak Session G */}
        <Card className="bg-card border-border/40 shadow-sm">
          <CardHeader className="pb-1 pt-4">
            <div className="flex items-center gap-2">
              <Activity className="h-3 w-3 text-foreground" />
              <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Peak Impact</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tabular-nums text-foreground">
              {maxForceValue.toFixed(1)}
            </div>
            <p className="text-[9px] font-bold text-muted-foreground/60 mt-1 uppercase">Max m/s²</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-[10px] font-black uppercase tracking-widest">Telemetry Waveform</CardTitle>
          </div>
          {active && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[9px] font-black uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live Link
            </div>
          )}
        </CardHeader>
        <CardContent className="h-[300px] pt-4">
          {!active ? (
            <div className="h-full w-full border border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground/40 gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Awaiting Realtime Link...</p>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={9} 
                  interval="preserveStartEnd" 
                />
                <YAxis axisLine={false} tickLine={false} fontSize={9} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="x" stroke="var(--color-x)" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="y" stroke="var(--color-y)" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="z" stroke="var(--color-z)" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={3} dot={false} isAnimationActive={false} />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
