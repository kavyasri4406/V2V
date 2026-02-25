
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, ShieldAlert, AlertTriangle, Zap, Info, Gauge } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
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

function DashboardGauge({ value, max = 32768, label, unit }: { value: number; max?: number; label: string; unit: string }) {
  // Calculate needle rotation: 240 degree sweep (-120 to 120)
  const percent = Math.min(Math.abs(value) / max, 1);
  const rotation = (percent * 240) - 120;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-56 h-56 rounded-full border-8 border-muted/20 shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] flex items-center justify-center bg-gradient-to-b from-card to-muted/5">
        {/* Scale Ticks */}
        {[...Array(21)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute bg-muted-foreground/30 transition-colors",
              i % 2 === 0 ? "w-0.5 h-4" : "w-px h-2",
              percent > (i / 20) ? "bg-primary/60" : ""
            )}
            style={{
              transform: `rotate(${(i * 12) - 120}deg) translateY(-92px)`,
            }}
          />
        ))}
        
        {/* Glow Ring */}
        <div 
          className="absolute inset-4 rounded-full border-b-0 border-r-0 border-l-0 border-t-2 border-primary/20 transition-all duration-300"
          style={{ transform: `rotate(${rotation}deg)` }}
        />

        {/* The Needle */}
        <div 
          className="absolute w-1 h-28 bg-accent rounded-full origin-bottom transition-transform duration-150 ease-out shadow-[0_0_15px_rgba(var(--accent),0.6)]"
          style={{ 
            transform: `rotate(${rotation}deg) translateY(-14px)`,
            zIndex: 20
          }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-accent rounded-full -mt-2 shadow-xl border-2 border-white/20" />
        </div>

        {/* Center Cap */}
        <div className="absolute w-8 h-8 bg-card border-4 border-accent rounded-full shadow-lg z-30" />

        {/* Digital Display */}
        <div className="absolute bottom-12 flex flex-col items-center bg-background/50 backdrop-blur-sm px-4 py-1 rounded-full border border-border/50">
          <span className="text-4xl font-black tracking-tighter text-foreground tabular-nums">
            {Math.abs(value).toFixed(0)}
          </span>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
            {unit}
          </span >
        </div>
      </div>
      <span className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-muted-foreground/70">{label}</span>
    </div>
  );
}

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

    const sensorRef = ref(database, 'car_kit/mpu6050_raw/gyroscope');
    
    const unsubscribe = onValue(sensorRef, (snapshot) => {
      const val = snapshot.val();
      if (!val) return;

      const x = Number(val.x) || 0;
      const y = Number(val.y) || 0;
      const z = Number(val.z) || 0;
      
      const total = Math.sqrt(x * x + y * y + z * z);
      const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const newPoint = { time, x, y, z, total };
      setCurrent(newPoint);
      
      const highestAxis = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
      setMaxForceValue(prev => Math.max(prev, highestAxis));

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
    toast({ title: 'V2V Stream Active', description: 'Dashboard connected to vehicle telemetry.' });
  };

  const handleStop = () => {
    setActive(false);
    toast({ title: 'Stream Paused', description: 'Monitoring disconnected.' });
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
               <Gauge className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">Cockpit Telemetry</h1>
          </div>
          <p className="text-muted-foreground font-medium">Real-time vehicle dynamics and G-force diagnostics.</p>
        </div>
        <Button 
          variant={active ? "destructive" : "default"} 
          size="lg" 
          onClick={() => active ? handleStop() : handleStart()}
          className="w-full md:w-auto font-bold uppercase tracking-widest px-8 shadow-lg shadow-primary/20"
        >
          {active ? <Zap className="mr-2 fill-current" /> : <Activity className="mr-2" />}
          {active ? 'Halt Telemetry' : 'Initiate Link'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Dashboard Gauge */}
        <Card className="lg:col-span-5 bg-gradient-to-br from-card to-muted/20 border-border/50 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Motion Intensity</CardTitle>
          </CardHeader>
          <CardContent className="py-10">
            <DashboardGauge 
              value={current.total} 
              max={32768} 
              label="Vector Magnitude" 
              unit="VEL" 
            />
          </CardContent>
        </Card>

        {/* Secondary Metrics */}
        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card/50 backdrop-blur border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Primary Axis (X)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-6xl font-black tabular-nums transition-colors",
                Math.abs(current.x) > 15000 ? "text-destructive" : "text-primary"
              )}>
                {current.x.toFixed(0)}
              </div>
              <p className="text-[10px] font-bold text-muted-foreground/60 mt-2">RAW LONGITUDINAL FORCE</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Highest Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-6xl font-black tabular-nums text-accent">
                {maxForceValue.toFixed(0)}
              </div>
              <p className="text-[10px] font-bold text-muted-foreground/60 mt-2">PEAK G RECORDED THIS SESSION</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 border-border/40 bg-muted/10">
            <CardContent className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {active ? (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    RTDB Link Established
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                    <AlertTriangle className="h-3 w-3" />
                    Offline
                  </div>
                )}
              </div>
              <p className="text-[10px] font-medium text-muted-foreground italic">
                Sampling from: car_kit/mpu6050_raw/gyroscope
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border/40 shadow-lg">
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-widest">Telemetry Waveform</CardTitle>
          <CardDescription>Multi-axis displacement over time</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] pt-4">
          {!active ? (
            <div className="h-full w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground/40 gap-3">
              <Info className="h-10 w-10 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest">Awaiting Vehicle Link...</p>
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
