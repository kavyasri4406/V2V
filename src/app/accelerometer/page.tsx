'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, ShieldAlert, AlertTriangle, Zap, Info, Gauge, ArrowRightLeft, MoveVertical, MoveHorizontal } from 'lucide-react';
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
  const { toast } = useToast();
  const { database } = useFirebase();
  const dataRef = useRef<AccelPoint[]>([]);

  const chartConfig = {
    x: { label: "X-Axis", color: "hsl(var(--primary))" },
    y: { label: "Y-Axis", color: "hsl(var(--accent))" },
    z: { label: "Z-Axis", color: "hsl(var(--chart-1))" },
    total: { label: "Magnitude", color: "hsl(var(--foreground))" },
  };

  useEffect(() => {
    if (!active || !database) return;

    // Connect to the Realtime Database path provided
    const sensorRef = ref(database, 'car_kit/mpu6050_raw/gyroscope');
    
    const unsubscribe = onValue(sensorRef, (snapshot) => {
      const val = snapshot.val();
      if (!val) return;

      // Extract raw values
      const x = Number(val.x) || 0;
      const y = Number(val.y) || 0;
      const z = Number(val.z) || 0;
      
      // Calculate magnitude
      const total = Math.sqrt(x * x + y * y + z * z);
      const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const newPoint = { time, x, y, z, total };
      setCurrent(newPoint);
      
      // Track peak encounter
      const highestAxis = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
      setMaxForceValue(prev => Math.max(prev, highestAxis));

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
    toast({ title: 'Telemetry Active', description: 'Connected to vehicle Realtime Database.' });
  };

  const handleStop = () => {
    setActive(false);
    toast({ title: 'Stream Paused', description: 'Monitoring disconnected.' });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-150">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
               <Gauge className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">Vehicle Dynamics</h1>
          </div>
          <p className="text-muted-foreground font-medium">Real-time G-force monitoring via car_kit hardware.</p>
        </div>
        <Button 
          variant={active ? "destructive" : "default"} 
          size="lg" 
          onClick={() => active ? handleStop() : handleStart()}
          className="w-full md:w-auto font-bold uppercase tracking-widest px-8 shadow-lg"
        >
          {active ? <Zap className="mr-2 fill-current" /> : <Activity className="mr-2" />}
          {active ? 'Stop Monitoring' : 'Start Monitoring'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Longitudinal (X) */}
        <Card className="bg-card border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MoveHorizontal className="h-4 w-4 text-primary" />
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">X-Axis (Long)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black tabular-nums text-primary">
              {current.x.toFixed(0)}
            </div>
            <p className="text-[10px] font-bold text-muted-foreground/60 mt-2 uppercase">Current G-Force</p>
          </CardContent>
        </Card>

        {/* Lateral (Y) */}
        <Card className="bg-card border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-accent" />
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Y-Axis (Lat)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black tabular-nums text-accent">
              {current.y.toFixed(0)}
            </div>
            <p className="text-[10px] font-bold text-muted-foreground/60 mt-2 uppercase">Lateral Intensity</p>
          </CardContent>
        </Card>

        {/* Vertical (Z) */}
        <Card className="bg-card border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MoveVertical className="h-4 w-4 text-chart-1" />
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Z-Axis (Vert)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black tabular-nums text-chart-1">
              {current.z.toFixed(0)}
            </div>
            <p className="text-[10px] font-bold text-muted-foreground/60 mt-2 uppercase">Vertical Force</p>
          </CardContent>
        </Card>

        {/* Peak Session G */}
        <Card className="bg-card border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-foreground" />
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Peak G</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black tabular-nums text-foreground">
              {maxForceValue.toFixed(0)}
            </div>
            <p className="text-[10px] font-bold text-muted-foreground/60 mt-2 uppercase">Highest Session Value</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-black uppercase tracking-widest">Telemetry Waveform</CardTitle>
            <CardDescription>Multi-axis displacement over time from Realtime Database</CardDescription>
          </div>
          {active && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live Link
            </div>
          )}
        </CardHeader>
        <CardContent className="h-[400px] pt-4">
          {!active ? (
            <div className="h-full w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground/40 gap-3">
              <Info className="h-10 w-10 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest">Awaiting Realtime Link...</p>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={10} 
                  interval="preserveStartEnd" 
                />
                <YAxis axisLine={false} tickLine={false} fontSize={10} />
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
