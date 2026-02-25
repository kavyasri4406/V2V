'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, ShieldAlert, AlertTriangle, Zap, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts";
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
  const [maxForce, setMaxForce] = useState(0);
  const { toast } = useToast();
  const dataRef = useRef<AccelPoint[]>([]);

  const chartConfig = {
    x: { label: "X-Axis", color: "hsl(var(--primary))" },
    y: { label: "Y-Axis", color: "hsl(var(--accent))" },
    z: { label: "Z-Axis", color: "hsl(var(--chart-1))" },
    total: { label: "Magnitude", color: "hsl(var(--foreground))" },
  };

  const handleStart = async () => {
    if (typeof DeviceMotionEvent !== 'undefined' && (DeviceMotionEvent as any).requestPermission) {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission !== 'granted') {
          toast({ variant: 'destructive', title: 'Permission Denied', description: 'Motion sensors are required for this page.' });
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    setActive(true);
    toast({ title: 'Sensors Active', description: 'Monitoring real-time motion data.' });
  };

  useEffect(() => {
    if (!active) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const accel = event.accelerationIncludingGravity;
      if (!accel) return;

      const x = accel.x || 0;
      const y = accel.y || 0;
      const z = accel.z || 0;
      const total = Math.sqrt(x * x + y * y + z * z);
      const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const newPoint = { time, x, y, z, total };
      setCurrent(newPoint);
      
      if (total > maxForce) setMaxForce(total);

      dataRef.current = [...dataRef.current, newPoint].slice(-30);
      setData(dataRef.current);
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [active, maxForce]);

  const gForce = (current.total / 9.81).toFixed(2);
  const maxGForce = (maxForce / 9.81).toFixed(2);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">V2V Diagnostics</h1>
          <p className="text-muted-foreground">Real-time accelerometer and impact monitoring.</p>
        </div>
        <Button 
          variant={active ? "destructive" : "default"} 
          size="lg" 
          onClick={() => active ? setActive(false) : handleStart()}
          className="w-full md:w-auto"
        >
          {active ? <Zap className="mr-2 fill-current" /> : <Activity className="mr-2" />}
          {active ? 'Stop Monitoring' : 'Start Sensors'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Real-time G-Force</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className={cn(
              "text-6xl font-black mb-2 transition-colors duration-150",
              parseFloat(gForce) > 2.0 ? "text-destructive" : "text-primary"
            )}>
              {gForce}
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Current G</div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Peak Impact</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="text-6xl font-black mb-2 text-accent">
              {maxGForce}
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Highest G Recorded</div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6 gap-2">
            {active ? (
              <div className="flex items-center gap-2 text-green-500 font-bold">
                <ShieldAlert className="animate-pulse" />
                ACTIVE
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground font-bold">
                <AlertTriangle />
                STANDBY
              </div>
            )}
            <p className="text-[10px] text-center text-muted-foreground mt-2">
              Impact threshold set at 2.5G for automatic collision broadcasting.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Motion Waveform</CardTitle>
          <CardDescription>Visualizing acceleration across all axes (m/s²)</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] pt-4">
          {!active ? (
            <div className="h-full w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Info className="h-8 w-8 opacity-20" />
              <p>Sensors are currently in standby. Click 'Start Sensors' above.</p>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={10} 
                  interval="preserveStartEnd" 
                />
                <YAxis axisLine={false} tickLine={false} fontSize={10} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="x" 
                  stroke="var(--color-x)" 
                  strokeWidth={2} 
                  dot={false} 
                  isAnimationActive={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="y" 
                  stroke="var(--color-y)" 
                  strokeWidth={2} 
                  dot={false} 
                  isAnimationActive={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="z" 
                  stroke="var(--color-z)" 
                  strokeWidth={2} 
                  dot={false} 
                  isAnimationActive={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="var(--color-total)" 
                  strokeWidth={3} 
                  dot={false} 
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How it works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4">
            <p>
              Your device's internal <strong>accelerometer</strong> measures acceleration forces in three dimensions. 
              The V2V system uses these measurements to calculate the <strong>vector magnitude</strong> (total force).
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>X-Axis:</strong> Side-to-side motion (yaw/swerve).</li>
              <li><strong>Y-Axis:</strong> Forward/Backward motion (braking/acceleration).</li>
              <li><strong>Z-Axis:</strong> Vertical motion (bumps/potholes).</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Collision Logic</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4">
            <p>
              When the total force exceeds <strong>25 m/s²</strong> (approx 2.5G), the system assumes a potential high-impact event has occurred.
            </p>
            <p className="bg-muted p-3 rounded-lg font-mono text-xs">
              IF magnitude > threshold THEN trigger_emergency_broadcast()
            </p>
            <p>
              This automation ensures that even if a driver is incapacitated, their vehicle can still alert others to the hazard.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
